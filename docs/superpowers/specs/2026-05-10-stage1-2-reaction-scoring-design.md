# Stage 1·2 반응속도 점수 로직 설계 (Stage 3 동형 외부화 + 연속 보간)

## 1. 배경

### 1.1 현재 상태

`src/scoring.js` + `src/store.js` 가 정의하는 점수 파이프라인은 정상 동작 중이다.

```
sub-game → onResult(metric)         // metric ∈ [0, 1], 0 = 완벽
recordResult(stageId, metric)
  → scoreFromMetric(stageId, metric)
  → STAGE_SCORE_TIERS[stageId].find(t => |metric| ≤ t.maxAbsError)
  → tier.points 적립
totalScore = Σ stageResults[n].score
endingOutcome = total ≥ ENDING_SUCCESS_CUTOFF ? 'alive' : 'silhouette'
```

Stage 3·4 는 이 계약을 따른다. 예: `Stage3Field.jsx:147-151` 에서
`metric = 1 − (totalPoints / maxPossible)` 산출 후 `onResult(metric)`.

### 1.2 Stage 1·2 가 점수에 기여하지 못하는 이유

두 군데가 동시에 깨져 있어 둘 다 고쳐야 한다.

- **(A) `src/scoring.js:5-6`** — `STAGE_SCORE_TIERS[1]`, `[2]` 가 빈 배열.
  `scoreFromMetric` 이 항상 0 반환.
- **(B) Stage 1·2 컴포넌트가 metric 이 아니라 0–100 점수를 emit.**
  - `Stage1Placeholder.jsx:70-72` — `let score = (diff <= 0.05) ? 100 : (diff <= 0.1) ? 80 : (diff <= 0.2) ? 60 : 20;`
  - `Stage2Placeholder.jsx:80, 91-94` — 동일하게 100/20 이산 분기.
  - `Stage4TimerPane.jsx:39-41` — Stage 1 과 동일 하드코딩 사다리.
  - 결과: store 가 100 을 metric 으로 받아 `|100| ≤ tier.maxAbsError` 매칭에서 모두 탈락.

### 1.3 부수 발견

Stage 2 의 현재 코드는 reaction time 에 따라 코멘트만 다르고 점수는 사실상 100/0 이진. 즉
"반응속도" 차등이 점수에 반영되지 않는다.

## 2. 목표

1. Stage 1·2 가 점수 파이프라인에 정상 기여하도록 만든다.
2. 하드코딩된 오차범위 사다리를 외부 config 로 빼서 Stage 3 와 동일한 패턴으로 정렬한다.
3. perfect 영역 안에서도 정밀도 차등이 최종 점수에 보이도록 한다 (동점 방지).

## 3. 설계 결정 요약

| 항목 | 결정 |
|---|---|
| Tier 구조 | Stage 3 와 동형 5-tier (perfect/great/good/ok/bare) |
| Fail 분기 | 분기 없음. 모든 결과를 raw error 로 통일 → 자연스럽게 worst tier로 떨어짐 |
| Perfect 정밀도 보너스 | 컴포넌트 안 `precisionBonusMax = 60` (perfect tier 안 선형) |
| 최종 점수 동점 방지 | `scoreFromMetric` 을 tier 경계 사이 선형 보간 함수로 전환 (`PERFECT_HEADROOM = 60` 모든 stage 공통) |
| 엔딩 cutoff 재조정 | `ENDING_SUCCESS_CUTOFF` 600 → 700 (총점 만점 1300 → 1540 비례) |
| 변경 파일 수 | 신규 4개 (config 2 + helper 1 + 테스트 보강), 수정 4개 |

## 4. 컴포넌트 레이어

### 4.1 신규: `src/stages/stage1/stage1.config.js`

```js
export const STAGE1_CONFIG = {
  targetSec: 10.00,
  timeoutSec: 11.5,
  // error = |elapsed − targetSec| (s)
  accuracyTiers: [
    { id: 'perfect', maxError: 0.05,     points: 100, label: '완벽!', color: '#FFD700' },
    { id: 'great',   maxError: 0.10,     points: 80,  label: '훌륭!', color: '#FF8855' },
    { id: 'good',    maxError: 0.20,     points: 60,  label: '좋아!', color: '#FFCC00' },
    { id: 'ok',      maxError: 0.40,     points: 40,  label: '통과',  color: '#FFEE88' },
    { id: 'bare',    maxError: Infinity, points: 20,  label: '아슬',  color: '#CCCCCC' },
  ],
  precisionBonusMax: 60,
};
```

### 4.2 신규: `src/stages/stage2/stage2.config.js`

```js
export const STAGE2_CONFIG = {
  attackWindowMs: 700,
  // error = pressTime − attackStart (s); fake 캐치 / 타임아웃 → bare 매핑
  accuracyTiers: [
    { id: 'perfect', maxError: 0.20,     points: 100, label: '완벽!', color: '#FFD700' },
    { id: 'great',   maxError: 0.35,     points: 80,  label: '훌륭!', color: '#FF8855' },
    { id: 'good',    maxError: 0.50,     points: 60,  label: '좋아!', color: '#FFCC00' },
    { id: 'ok',      maxError: 0.65,     points: 40,  label: '통과',  color: '#FFEE88' },
    { id: 'bare',    maxError: Infinity, points: 20,  label: '아슬',  color: '#CCCCCC' },
  ],
  precisionBonusMax: 60,
};
```

### 4.3 신규: `src/stages/common/reactionScoring.js`

```js
/**
 * raw error (s) → { tier, points } (perfect tier 안 선형 보너스 포함).
 * - tier 결정: error 가 가장 먼저 maxError 를 넘지 못하는 tier.
 * - perfect 보너스: precision = 1 − error/perfectMaxError, bonus = round(precision × precisionBonusMax).
 * - bare tier 의 maxError 는 Infinity 로 두므로 항상 매칭 보장.
 */
export function pointsForError(error, config) {
  const tier = config.accuracyTiers.find((t) => error <= t.maxError);
  let points = tier.points;
  if (tier.id === 'perfect') {
    const precision = Math.max(0, 1 - (error / tier.maxError));
    points += Math.round(precision * config.precisionBonusMax);
  }
  return { tier, points };
}

/**
 * earnedPoints → metric ∈ [0, 1] (0 = 완벽).
 * 분모는 perfect tier base + precisionBonusMax.
 */
export function metricFromPoints(points, config) {
  const max = config.accuracyTiers[0].points + config.precisionBonusMax;
  return Math.max(0, Math.min(1, 1 - points / max));
}
```

### 4.4 컴포넌트 수정

세 컴포넌트 모두 동일 패턴으로 변경한다.

`src/stages/stage1/Stage1Placeholder.jsx` (현 `:70-72` 의 하드코딩 사다리 제거):

```js
import { STAGE1_CONFIG } from './stage1.config.js';
import { pointsForError, metricFromPoints } from '../common/reactionScoring.js';

const handleFinish = (time) => {
  cancelAnimationFrame(requestRef.current);
  setFinalResultTime(time);
  setIsEyesClosed(true);
  setPhase('END');

  const error = Math.abs(time - STAGE1_CONFIG.targetSec);
  const { tier, points } = pointsForError(error, STAGE1_CONFIG);
  const metric = metricFromPoints(points, STAGE1_CONFIG);

  // tier.label / points 는 결과 화면 표시에 사용 (이전 message 텍스트는 tier 기반으로 대체)
  setTimeout(() => { if (onResult) onResult(metric); }, 4500);
};
```

`src/stages/stage2/Stage2Placeholder.jsx` 의 `handleShutter` 와 fail 경로:

```js
import { STAGE2_CONFIG } from './stage2.config.js';
import { pointsForError, metricFromPoints } from '../common/reactionScoring.js';

// 성공 경로 (handleShutter 안):
const reactionSec = (performance.now() - stateRef.current.attackStartTime) / 1000;
const { tier, points } = pointsForError(reactionSec, STAGE2_CONFIG);
const metric = metricFromPoints(points, STAGE2_CONFIG);
// finalState/comment 는 tier.id / tier.label 기반으로 정리

// fake 캐치 / 타임아웃 경로 — reaction time 이 정의되지 않으므로
// 명시적으로 bare tier 점수를 사용 (Infinity 우회 같은 트릭 금지):
const bareTier = STAGE2_CONFIG.accuracyTiers.find((t) => t.id === 'bare');
const points = bareTier.points;
const metric = metricFromPoints(points, STAGE2_CONFIG);
```

`src/stages/stage4/Stage4TimerPane.jsx` 도 동일하게 `STAGE1_CONFIG` + helper 사용.

### 4.5 결과 화면 라벨 처리

다음 인라인 텍스트들은 모두 tier 기반으로 일원화한다.

- `Stage1Placeholder.jsx:138-141` — `Math.abs(finalResultTime - 10.00) <= 0.1` 분기로 노출되는 두 줄 텍스트. tier.id 기반 분기로 교체 (perfect/great → 성공 톤, 그 외 → 실패 톤).
- `Stage2Placeholder.jsx:91-94` — reaction time 분기 코멘트. tier.label 또는 tier 별 flavorText 로 교체.

본 spec 은 단순 표시(`tier.label` 또는 짧은 분기 텍스트 2개) 를 default 로 하고, tier 별 flavorText 는 후속 튜닝 이슈로 분리한다.

## 5. Scoring 레이어

### 5.1 `src/scoring.js` — `STAGE_SCORE_TIERS` 보강

```js
export const PERFECT_HEADROOM = 60;  // 모든 stage 공통

export const STAGE_SCORE_TIERS = {
  1: [
    { maxAbsError: 0.10, points: 300 },
    { maxAbsError: 0.25, points: 240 },
    { maxAbsError: 0.45, points: 180 },
    { maxAbsError: 0.70, points: 120 },
    { maxAbsError: 1.00, points: 60  },
  ],
  2: [
    { maxAbsError: 0.10, points: 300 },
    { maxAbsError: 0.25, points: 240 },
    { maxAbsError: 0.45, points: 180 },
    { maxAbsError: 0.70, points: 120 },
    { maxAbsError: 1.00, points: 60  },
  ],
  3: [ /* 기존 동일 */ ],
  4: [ /* 기존 동일 */ ],
};
```

### 5.2 `scoreFromMetric` — 연속 함수로 전환

기존 (이산):

```js
const tier = tiers.find((t) => absError <= t.maxAbsError);
return tier?.points ?? 0;
```

신규 (선형 보간):

```js
export function scoreFromMetric(stageId, metric) {
  const tiers = STAGE_SCORE_TIERS[stageId];
  if (!tiers || tiers.length === 0) return 0;
  if (typeof metric !== 'number' || Number.isNaN(metric)) return 0;
  const m = Math.max(0, Math.min(1, Math.abs(metric)));

  // 가상 sentinel: metric=0 일 때 perfect tier 점수 + headroom (동점 방지)
  const sentinel = { maxAbsError: 0, points: tiers[0].points + PERFECT_HEADROOM };
  const all = [sentinel, ...tiers];

  for (let i = 1; i < all.length; i++) {
    const lo = all[i - 1];
    const hi = all[i];
    if (m <= hi.maxAbsError) {
      const span = hi.maxAbsError - lo.maxAbsError;
      const t = span === 0 ? 0 : (m - lo.maxAbsError) / span;
      return Math.round(lo.points + (hi.points - lo.points) * t);
    }
  }
  return tiers[tiers.length - 1].points;
}
```

호환성: tier 경계점에서는 기존 점수와 동일. 같은 tier 안에서만 보간이 추가된다.

### 5.3 엔딩 cutoff 재조정

만점 변화: 기존 1300 → 신규 1540 (`Σ tier[0].points + PERFECT_HEADROOM` × stage 수).
`ENDING_SUCCESS_CUTOFF` 를 600 → **700** 으로 비례 조정 (총점 대비 동일 ~45%).

## 6. Stage 3·4 호환성 영향

본 spec 은 `scoreFromMetric` 을 연속화하므로 Stage 3·4 의 점수 산출에도 부수 효과가 생긴다.

- **Tier 경계점 (metric = 0.10, 0.25, 0.45, 0.70, 1.00)**: 기존과 동일한 점수 (호환).
- **같은 tier 안의 metric**: 보간이 적용되어 점수가 더 세분화됨. 예) Stage 3 에서 5 perfect + 1 great 캐치 → metric ≈ 0.033 → 기존 300 점 / 신규 보간으로 약 354 점.
- **만점 (metric = 0)**: 기존 300 (Stage 3) / 400 (Stage 4) → 신규 360 (Stage 3) / 460 (Stage 4) — `PERFECT_HEADROOM = 60` 이 일관 적용됨.

`Stage4TimerPane` 는 § 4.4 에서 `STAGE1_CONFIG` 를 공유하도록 변경되어 동일 메커닉이 자동 정렬된다.
`Stage2Placeholder` 는 이미 split 모드를 지원하므로 config 외부화만으로 split 진입에서도 새 점수가 적용된다.
`Stage4Host` 의 평균 metric 산출(`(r1+r2+r3)/3`) 은 변경 없음.

## 7. 테스트

신규 또는 보강:

- `src/scoring.test.js`
  - tier 경계점 (0, 0.10, 0.25, 0.45, 0.70, 1.00) 에서 기존 점수와 일치
  - tier 안 보간 (예: metric=0.05 → 320~300 사이 round 결과)
  - 음수/NaN/비숫자 → 0
  - clamp (metric > 1 → bare tier 끝점)
  - 모든 stageId (1, 2, 3, 4)
- `src/stages/common/reactionScoring.test.js`
  - tier 매칭 (perfect/great/good/ok/bare 각 경계)
  - perfect 보너스 (error 0 → +60, error perfect.maxError → +0)
  - metricFromPoints 범위 [0, 1]
- 컴포넌트 스모크 (선택, vitest + RTL): `onResult` 가 수신하는 값이 [0, 1] 범위인지 확인

## 8. 변경 파일 목록

| 파일 | 종류 |
|---|---|
| `src/stages/stage1/stage1.config.js` | 신규 |
| `src/stages/stage2/stage2.config.js` | 신규 |
| `src/stages/common/reactionScoring.js` | 신규 |
| `src/stages/stage1/Stage1Placeholder.jsx` | 수정 |
| `src/stages/stage2/Stage2Placeholder.jsx` | 수정 |
| `src/stages/stage4/Stage4TimerPane.jsx` | 수정 |
| `src/scoring.js` | 수정 (`STAGE_SCORE_TIERS[1]/[2]` 추가, `scoreFromMetric` 선형 보간, `ENDING_SUCCESS_CUTOFF` 700, `PERFECT_HEADROOM` 상수) |
| `src/scoring.test.js` | 신규 |
| `src/stages/common/reactionScoring.test.js` | 신규 |

## 9. 비범위 (Out of Scope)

- 사운드 슬롯/효과음 추가 — 동반 이슈(`.issues/20260510_…`) 의 사운드 항목으로 분리.
- Stage 3·4 의 tier 값 재튜닝 — 본 spec 은 `PERFECT_HEADROOM` 만 추가하고 기존 tier 점수는 유지.
- 랭킹 UI 변경 / tie-breaker 정렬 — 본 spec 의 분해능 수준에서 동점이 부스 운영상 문제가 되면 후속.
- flavorText (tier 별 풍부한 코멘트) — `tier.label` 로 단순 표시. 추후 튜닝 이슈로 분리.
