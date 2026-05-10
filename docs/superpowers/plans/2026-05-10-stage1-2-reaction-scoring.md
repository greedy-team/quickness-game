# Stage 1·2 반응속도 점수 로직 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stage 1·2 가 점수 파이프라인에 정상 기여하도록 만들고, 하드코딩된 오차 사다리를 Stage 3 와 동형 config 로 외부화한다. perfect 영역 안 정밀도 차등이 최종 점수까지 연속적으로 전달되도록 `scoreFromMetric` 을 보간 함수로 전환한다.

**Architecture:** `src/stages/common/reactionScoring.js` 에 순수 helper 분리 → 각 stage 의 `*.config.js` 가 tier 와 보너스 폭을 외부화 → 컴포넌트는 raw error 만 계산하고 helper 를 호출 → `metric` (0..1) emit. `src/scoring.js` 의 `scoreFromMetric` 은 sentinel + tier 안 선형 보간으로 metric → 최종 점수를 매핑. 모든 stage 에 공통 `PERFECT_HEADROOM = 60` 적용해 만점 균형 유지.

**Tech Stack:** React 19 (function components + hooks), Vite 8, Zustand 5, Vitest (신규 도입).

**Spec:** `docs/superpowers/specs/2026-05-10-stage1-2-reaction-scoring-design.md`

---

## File Structure

| 파일 | 종류 | 책임 |
|---|---|---|
| `src/stages/common/reactionScoring.js` | 신규 | 순수 helper. error → tier/points, points → metric. React 의존 없음 |
| `src/stages/common/reactionScoring.test.js` | 신규 | helper 단위 테스트 |
| `src/stages/stage1/stage1.config.js` | 신규 | Stage 1 tunables (target, tiers, bonusMax) |
| `src/stages/stage2/stage2.config.js` | 신규 | Stage 2 tunables |
| `src/scoring.js` | 수정 | `STAGE_SCORE_TIERS[1]/[2]` 추가, `scoreFromMetric` 연속화, `PERFECT_HEADROOM` 상수, `ENDING_SUCCESS_CUTOFF` 700 |
| `src/scoring.test.js` | 신규 | `scoreFromMetric`/`endingOutcomeFromTotal` 단위 테스트 |
| `src/stages/stage1/Stage1Placeholder.jsx` | 수정 | 하드코딩 사다리 제거, helper 사용 |
| `src/stages/stage2/Stage2Placeholder.jsx` | 수정 | 동일 + fail 경로 명시 |
| `src/stages/stage4/Stage4TimerPane.jsx` | 수정 | Stage 1 config 공유 |
| `package.json` | 수정 | `vitest` devDep + `test` 스크립트 |
| `vite.config.js` | 수정 | vitest test 섹션 |

---

## Task 0: Vitest 셋업

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Create: `src/__smoke__.test.js` (검증용, 다음 task 에서 삭제)

- [ ] **Step 1: vitest 설치**

Run: `npm install -D vitest@^2`
Expected: `vitest` 가 `package.json` 의 `devDependencies` 에 추가됨.

- [ ] **Step 2: package.json 의 scripts 에 test 명령 추가**

`package.json:6-11` 의 `scripts` 객체에 두 줄 추가:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run"
  },
```

- [ ] **Step 3: vite.config.js 에 test 섹션 추가**

`vite.config.js` 전체 내용을 아래로 교체:

```js
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
  },
})
```

- [ ] **Step 4: 스모크 테스트로 셋업 검증**

`src/__smoke__.test.js` 작성:

```js
import { describe, it, expect } from 'vitest';

describe('vitest setup smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: 테스트 실행, 통과 확인**

Run: `npm run test:run`
Expected: `1 passed` (스모크 1건 통과)

- [ ] **Step 6: 스모크 파일 삭제**

Run: `rm src/__smoke__.test.js`

- [ ] **Step 7: 커밋**

```bash
git add package.json package-lock.json vite.config.js
git commit -m "chore : Vitest 도입 #33"
```

---

## Task 1: reactionScoring helper (TDD)

**Files:**
- Create: `src/stages/common/reactionScoring.js`
- Create: `src/stages/common/reactionScoring.test.js`

- [ ] **Step 1: 테스트 파일 먼저 작성 (실패해야 정상)**

`src/stages/common/reactionScoring.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { pointsForError, metricFromPoints } from './reactionScoring.js';

const FIXTURE = {
  accuracyTiers: [
    { id: 'perfect', maxError: 0.05,     points: 100, label: '완벽!', color: '#FFD700' },
    { id: 'great',   maxError: 0.10,     points: 80,  label: '훌륭!', color: '#FF8855' },
    { id: 'good',    maxError: 0.20,     points: 60,  label: '좋아!', color: '#FFCC00' },
    { id: 'ok',      maxError: 0.40,     points: 40,  label: '통과',  color: '#FFEE88' },
    { id: 'bare',    maxError: Infinity, points: 20,  label: '아슬',  color: '#CCCCCC' },
  ],
  precisionBonusMax: 60,
};

describe('pointsForError', () => {
  it('perfect tier 정중앙(error=0): base 100 + bonus 60 = 160', () => {
    const { tier, points } = pointsForError(0, FIXTURE);
    expect(tier.id).toBe('perfect');
    expect(points).toBe(160);
  });

  it('perfect tier 경계(error=maxError): bonus 0 → 100', () => {
    const { tier, points } = pointsForError(0.05, FIXTURE);
    expect(tier.id).toBe('perfect');
    expect(points).toBe(100);
  });

  it('perfect tier 절반(error=0.025): bonus 30 → 130', () => {
    const { tier, points } = pointsForError(0.025, FIXTURE);
    expect(tier.id).toBe('perfect');
    expect(points).toBe(130);
  });

  it('great tier (error=0.07): 보너스 없이 80', () => {
    const { tier, points } = pointsForError(0.07, FIXTURE);
    expect(tier.id).toBe('great');
    expect(points).toBe(80);
  });

  it('good tier (error=0.15): 60', () => {
    const { tier, points } = pointsForError(0.15, FIXTURE);
    expect(tier.id).toBe('good');
    expect(points).toBe(60);
  });

  it('ok tier (error=0.30): 40', () => {
    const { tier, points } = pointsForError(0.30, FIXTURE);
    expect(tier.id).toBe('ok');
    expect(points).toBe(40);
  });

  it('bare tier (error=999): 20', () => {
    const { tier, points } = pointsForError(999, FIXTURE);
    expect(tier.id).toBe('bare');
    expect(points).toBe(20);
  });
});

describe('metricFromPoints', () => {
  it('points=max(160) → metric 0', () => {
    expect(metricFromPoints(160, FIXTURE)).toBe(0);
  });

  it('points=base perfect(100) → metric 0.375', () => {
    // 1 - 100/160 = 0.375
    expect(metricFromPoints(100, FIXTURE)).toBeCloseTo(0.375, 5);
  });

  it('points=20 (bare) → metric 0.875', () => {
    // 1 - 20/160 = 0.875
    expect(metricFromPoints(20, FIXTURE)).toBeCloseTo(0.875, 5);
  });

  it('points 음수도 [0,1] 안으로 clamp', () => {
    expect(metricFromPoints(-100, FIXTURE)).toBe(1);
  });

  it('points 가 max 초과해도 [0,1] 안으로 clamp', () => {
    expect(metricFromPoints(9999, FIXTURE)).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실행, 모두 실패 확인**

Run: `npm run test:run -- src/stages/common/reactionScoring.test.js`
Expected: `Cannot find module './reactionScoring.js'` 류 에러로 모든 케이스 FAIL.

- [ ] **Step 3: helper 구현**

`src/stages/common/reactionScoring.js`:

```js
// Stage 1·2·4 의 반응속도/타이밍 점수 산출 helper.
// stageN.config.js 의 accuracyTiers + precisionBonusMax 만 받아서 동작 — React/store 의존 없음.

/**
 * raw error → { tier, points }.
 * - tier: error 가 가장 먼저 maxError 이하로 들어가는 첫 tier (배열 앞에서부터 매칭).
 *   bare tier 의 maxError 는 Infinity 로 두어 항상 매칭 보장.
 * - points: tier.points + (perfect tier 이면 정밀도 보너스).
 *   precision = 1 − error / perfectMaxError, bonus = round(precision × precisionBonusMax).
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
 * 분모는 perfect tier base + precisionBonusMax (perfect 만점).
 */
export function metricFromPoints(points, config) {
  const max = config.accuracyTiers[0].points + config.precisionBonusMax;
  return Math.max(0, Math.min(1, 1 - points / max));
}
```

- [ ] **Step 4: 테스트 재실행, 모두 통과 확인**

Run: `npm run test:run -- src/stages/common/reactionScoring.test.js`
Expected: `12 passed`.

- [ ] **Step 5: 커밋**

```bash
git add src/stages/common/reactionScoring.js src/stages/common/reactionScoring.test.js
git commit -m "feat : 반응속도 점수 helper 추가 (pointsForError, metricFromPoints) #33"
```

---

## Task 2: stage1.config.js

**Files:**
- Create: `src/stages/stage1/stage1.config.js`

- [ ] **Step 1: config 파일 작성**

`src/stages/stage1/stage1.config.js`:

```js
// Stage 1 (괘종시계) tunables. 모든 게임 숫자가 이 한 파일에 외부화됨.
// PRD §13 Tunable. Stage 3 의 stage3.config.js 와 동형 패턴.

export const STAGE1_CONFIG = {
  targetSec: 10.00,    // 12:00:00.00 = elapsed 10s
  timeoutSec: 11.5,    // 자동 종료
  // error = |elapsed − targetSec| (s).
  accuracyTiers: [
    { id: 'perfect', maxError: 0.05,     points: 100, label: '완벽!', color: '#FFD700' },
    { id: 'great',   maxError: 0.10,     points: 80,  label: '훌륭!', color: '#FF8855' },
    { id: 'good',    maxError: 0.20,     points: 60,  label: '좋아!', color: '#FFCC00' },
    { id: 'ok',      maxError: 0.40,     points: 40,  label: '통과',  color: '#FFEE88' },
    { id: 'bare',    maxError: Infinity, points: 20,  label: '아슬',  color: '#CCCCCC' },
  ],
  precisionBonusMax: 60,  // perfect tier 안 선형 정밀도 보너스 폭
};
```

- [ ] **Step 2: lint 통과 확인**

Run: `npm run lint -- src/stages/stage1/stage1.config.js`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/stages/stage1/stage1.config.js
git commit -m "feat : Stage 1 tunable config 외부화 #33"
```

---

## Task 3: stage2.config.js

**Files:**
- Create: `src/stages/stage2/stage2.config.js`

- [ ] **Step 1: config 파일 작성**

`src/stages/stage2/stage2.config.js`:

```js
// Stage 2 (반응속도) tunables. 모든 게임 숫자가 이 한 파일에 외부화됨.
// PRD §13 Tunable. Stage 1·3 의 *.config.js 와 동형 패턴.

export const STAGE2_CONFIG = {
  attackWindowMs: 700,  // 진짜 출현 후 미반응 자동 실패 시간
  // error = pressTime − attackStart (s). fake 캐치 / 타임아웃 → bare tier 직행 (컴포넌트에서 명시 처리).
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

- [ ] **Step 2: lint 통과 확인**

Run: `npm run lint -- src/stages/stage2/stage2.config.js`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/stages/stage2/stage2.config.js
git commit -m "feat : Stage 2 tunable config 외부화 #33"
```

---

## Task 4: scoring.js 연속화 + Stage 1·2 tier 추가 (TDD)

**Files:**
- Modify: `src/scoring.js`
- Create: `src/scoring.test.js`

- [ ] **Step 1: 테스트 파일 작성**

`src/scoring.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  STAGE_SCORE_TIERS,
  PERFECT_HEADROOM,
  ENDING_SUCCESS_CUTOFF,
  scoreFromMetric,
  endingOutcomeFromTotal,
} from './scoring.js';

describe('STAGE_SCORE_TIERS', () => {
  it('Stage 1·2·3·4 모두 5-tier 정의', () => {
    expect(STAGE_SCORE_TIERS[1]).toHaveLength(5);
    expect(STAGE_SCORE_TIERS[2]).toHaveLength(5);
    expect(STAGE_SCORE_TIERS[3]).toHaveLength(5);
    expect(STAGE_SCORE_TIERS[4]).toHaveLength(5);
  });

  it('PERFECT_HEADROOM 60', () => {
    expect(PERFECT_HEADROOM).toBe(60);
  });

  it('ENDING_SUCCESS_CUTOFF 700', () => {
    expect(ENDING_SUCCESS_CUTOFF).toBe(700);
  });
});

describe('scoreFromMetric — Stage 1', () => {
  it('metric 0 (완벽) → perfect tier + headroom = 360', () => {
    expect(scoreFromMetric(1, 0)).toBe(360);
  });

  it('metric = 0.05 → 보간 (sentinel 360 ↔ perfect 300 의 절반)', () => {
    // t = (0.05 − 0) / (0.10 − 0) = 0.5; round(360 + (300−360)*0.5) = 330
    expect(scoreFromMetric(1, 0.05)).toBe(330);
  });

  it('metric = 0.10 → perfect tier 경계 = 300', () => {
    expect(scoreFromMetric(1, 0.10)).toBe(300);
  });

  it('metric = 0.25 → great→good 경계 = 240', () => {
    expect(scoreFromMetric(1, 0.25)).toBe(240);
  });

  it('metric = 0.45 → good→ok 경계 = 180', () => {
    expect(scoreFromMetric(1, 0.45)).toBe(180);
  });

  it('metric = 1.00 → bare 끝 = 60', () => {
    expect(scoreFromMetric(1, 1.00)).toBe(60);
  });

  it('metric > 1 (clamp) → 60', () => {
    expect(scoreFromMetric(1, 1.5)).toBe(60);
  });

  it('metric 음수도 절댓값 + clamp', () => {
    expect(scoreFromMetric(1, -0.10)).toBe(300);
  });

  it('metric NaN → 0', () => {
    expect(scoreFromMetric(1, Number.NaN)).toBe(0);
  });

  it('비숫자 metric → 0', () => {
    expect(scoreFromMetric(1, 'oops')).toBe(0);
  });
});

describe('scoreFromMetric — Stage 2', () => {
  it('Stage 1 과 동일 tier 표 → 동일 결과', () => {
    expect(scoreFromMetric(2, 0)).toBe(360);
    expect(scoreFromMetric(2, 0.10)).toBe(300);
    expect(scoreFromMetric(2, 1.0)).toBe(60);
  });
});

describe('scoreFromMetric — Stage 3 (호환)', () => {
  it('metric 0 → 300 + 60 = 360 (PERFECT_HEADROOM 적용)', () => {
    expect(scoreFromMetric(3, 0)).toBe(360);
  });

  it('tier 경계 metric 0.10 → 기존과 동일 300', () => {
    expect(scoreFromMetric(3, 0.10)).toBe(300);
  });

  it('tier 경계 metric 1.0 → 기존과 동일 60', () => {
    expect(scoreFromMetric(3, 1.0)).toBe(60);
  });
});

describe('scoreFromMetric — Stage 4 (호환)', () => {
  it('metric 0 → 400 + 60 = 460', () => {
    expect(scoreFromMetric(4, 0)).toBe(460);
  });

  it('tier 경계 metric 0.10 → 기존과 동일 400', () => {
    expect(scoreFromMetric(4, 0.10)).toBe(400);
  });
});

describe('scoreFromMetric — 알 수 없는 stage', () => {
  it('stageId 99 → 0', () => {
    expect(scoreFromMetric(99, 0)).toBe(0);
  });
});

describe('endingOutcomeFromTotal', () => {
  it('totalScore 700 정확 → alive', () => {
    expect(endingOutcomeFromTotal(700)).toBe('alive');
  });

  it('totalScore 699 → silhouette', () => {
    expect(endingOutcomeFromTotal(699)).toBe('silhouette');
  });

  it('NaN → silhouette', () => {
    expect(endingOutcomeFromTotal(Number.NaN)).toBe('silhouette');
  });
});
```

- [ ] **Step 2: 테스트 실행, 다수 실패 확인**

Run: `npm run test:run -- src/scoring.test.js`
Expected: STAGE_SCORE_TIERS[1]/[2] 미정, scoreFromMetric 이 이산 동작이라 보간 케이스 실패. PERFECT_HEADROOM·ENDING_SUCCESS_CUTOFF 700 확인 케이스 실패.

- [ ] **Step 3: scoring.js 전체 교체**

`src/scoring.js` 전체 내용 교체:

```js
// src/scoring.js
// PRD §13 Tunable. STAGE_SCORE_TIERS 는 maxAbsError 오름차순.
// scoreFromMetric 은 sentinel(metric=0) ↔ tier[0] ↔ ... ↔ tier[last] 사이를 선형 보간.

export const PERFECT_HEADROOM = 60;  // metric=0 일 때 perfect tier 점수 위로 추가되는 동점방지 헤드룸 (모든 stage 공통).

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
  3: [
    { maxAbsError: 0.10, points: 300 },
    { maxAbsError: 0.25, points: 240 },
    { maxAbsError: 0.45, points: 180 },
    { maxAbsError: 0.70, points: 120 },
    { maxAbsError: 1.00, points: 60  },
  ],
  4: [
    { maxAbsError: 0.10, points: 400 },
    { maxAbsError: 0.25, points: 320 },
    { maxAbsError: 0.45, points: 240 },
    { maxAbsError: 0.70, points: 160 },
    { maxAbsError: 1.00, points: 80  },
  ],
};

/**
 * stageId 의 metric 에 해당하는 점수를 반환.
 * - tier 가 비어 있거나 stageId 미상이면 0.
 * - 비숫자/NaN → 0.
 * - 절댓값으로 정규화 후 [0, 1] clamp.
 * - sentinel(metric=0, points=tiers[0].points + PERFECT_HEADROOM) ↔ tiers 사이 선형 보간.
 *   → tier 경계점 점수는 기존과 동일, 같은 tier 안에서만 metric 차이가 점수 차이로 전이.
 */
export function scoreFromMetric(stageId, metric) {
  const tiers = STAGE_SCORE_TIERS[stageId];
  if (!tiers || tiers.length === 0) return 0;
  if (typeof metric !== 'number' || Number.isNaN(metric)) return 0;
  const m = Math.max(0, Math.min(1, Math.abs(metric)));

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

// ───── 엔딩 분기 ─────

/**
 * 누적 점수가 이 값 이상이면 성공 엔딩, 미만이면 실패 엔딩.
 * Tunable — 부스 플레이테스트 후 조정.
 * 만점 변화: 기존 1300 → 신규 1540 (Stage 1·2·3 = 360, Stage 4 = 460).
 */
export const ENDING_SUCCESS_CUTOFF = 700;

/**
 * 누적 점수 → 엔딩 outcome 결정.
 * - totalScore >= ENDING_SUCCESS_CUTOFF → 'alive'
 * - 그 외 / 음수 / NaN / 비숫자 → 'silhouette'
 */
export function endingOutcomeFromTotal(totalScore) {
  if (typeof totalScore !== 'number' || Number.isNaN(totalScore)) {
    return 'silhouette';
  }
  return totalScore >= ENDING_SUCCESS_CUTOFF ? 'alive' : 'silhouette';
}
```

- [ ] **Step 4: 테스트 재실행, 모두 통과 확인**

Run: `npm run test:run -- src/scoring.test.js`
Expected: `21 passed` (또는 작성한 케이스 수만큼).

- [ ] **Step 5: 전체 lint 통과 확인**

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/scoring.js src/scoring.test.js
git commit -m "feat : scoreFromMetric 연속 보간 전환 + Stage 1·2 tier 추가 + cutoff 700 #33"
```

---

## Task 5: Stage1Placeholder 와이어업

**Files:**
- Modify: `src/stages/stage1/Stage1Placeholder.jsx`

- [ ] **Step 1: import 추가 + resultTier state 추가**

`Stage1Placeholder.jsx:1-3` 의 import 섹션을 다음으로 교체:

```jsx
import React, { useState, useEffect, useRef } from 'react';
import './Stage1Placeholder.css';
import DialogueBox from '../../components/DialogueBox/DialogueBox';
import { STAGE1_CONFIG } from './stage1.config.js';
import { pointsForError, metricFromPoints } from '../common/reactionScoring.js';
```

`Stage1Placeholder.jsx:11-17` 의 useState 묶음을 다음으로 교체 (`resultTier` 추가):

```jsx
  const [phase, setPhase] = useState('STORY');
  const [currentTime, setCurrentTime] = useState(0.00);
  const [finalResultTime, setFinalResultTime] = useState(0.00);
  const [isEyesClosed, setIsEyesClosed] = useState(false);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [resultTier, setResultTier] = useState(null);
  const startTimeRef = useRef(0);
  const requestRef = useRef();
```

- [ ] **Step 2: handleFinish 의 하드코딩 사다리 제거 → helper 사용**

`Stage1Placeholder.jsx:64-73` 의 기존 `handleFinish`:

```jsx
  const handleFinish = (time) => {
    cancelAnimationFrame(requestRef.current);
    setFinalResultTime(time);
    setIsEyesClosed(true); 
    setPhase('END');
    
    const diff = Math.abs(time - 10.00);
    let score = (diff <= 0.05) ? 100 : (diff <= 0.1) ? 80 : (diff <= 0.2) ? 60 : 20;
    setTimeout(() => { if (onResult) onResult(score); }, 4500);
  };
```

다음으로 교체:

```jsx
  const handleFinish = (time) => {
    cancelAnimationFrame(requestRef.current);
    setFinalResultTime(time);
    setIsEyesClosed(true);
    setPhase('END');

    const error = Math.abs(time - STAGE1_CONFIG.targetSec);
    const { tier, points } = pointsForError(error, STAGE1_CONFIG);
    setResultTier(tier);
    const metric = metricFromPoints(points, STAGE1_CONFIG);
    setTimeout(() => { if (onResult) onResult(metric); }, 4500);
  };
```

- [ ] **Step 3: 결과 화면 텍스트를 tier 기반으로 교체**

`Stage1Placeholder.jsx:130-145` 의 `phase === 'END'` 블록 안 `result-story-text` 분기를 tier 기반으로 변경.

기존:
```jsx
            <p className="result-story-text">
              {Math.abs(finalResultTime - 10.00) <= 0.1 
                ? `정확히 12시 정각. 도플갱어의 주파수를 완벽히 차단했습니다. 가짜의 형체가 일그러집니다.` 
                : `타이밍이 어긋났습니다. 도플갱어와 눈이 마주쳤습니다.`}
            </p>
```

다음으로 교체:
```jsx
            <p className="result-story-text">
              {resultTier && (resultTier.id === 'perfect' || resultTier.id === 'great')
                ? `정확히 12시 정각. 도플갱어의 주파수를 완벽히 차단했습니다. 가짜의 형체가 일그러집니다.`
                : `타이밍이 어긋났습니다. 도플갱어와 눈이 마주쳤습니다.`}
            </p>
```

- [ ] **Step 4: lint 통과 확인**

Run: `npm run lint -- src/stages/stage1/Stage1Placeholder.jsx`
Expected: 에러 없음.

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공, 경고 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/stages/stage1/Stage1Placeholder.jsx
git commit -m "feat : Stage 1 점수 로직 helper/config 연결 #33"
```

---

## Task 6: Stage2Placeholder 와이어업

**Files:**
- Modify: `src/stages/stage2/Stage2Placeholder.jsx`

- [ ] **Step 1: import 추가 + TIER_COMMENT 상수 추가**

`Stage2Placeholder.jsx:1-2` 의 import 섹션을 다음으로 교체:

```jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Stage2Placeholder.css';
import { STAGE2_CONFIG } from './stage2.config.js';
import { pointsForError, metricFromPoints } from '../common/reactionScoring.js';
```

`Stage2Placeholder.jsx:4-11` 의 `BGS` 상수 정의 바로 아래(`:11` 다음 줄)에 다음 상수를 추가:

```jsx
const TIER_COMMENT = {
  perfect: '인간을 초월한 속도입니다!',
  great:   '완벽한 타이밍입니다!',
  good:    '훌륭한 반응속도입니다.',
  ok:      '간신히 셔터를 눌렀습니다.',
  bare:    '아슬아슬하게 살아남았습니다...',
};
```

- [ ] **Step 2: handleShutter 의 성공/fake 분기 helper 화**

`Stage2Placeholder.jsx:71-102` 의 `handleShutter` 전체를 다음으로 교체:

```jsx
  const handleShutter = useCallback(() => {
    if (stateRef.current.phase !== 'PLAY' || stateRef.current.isFinished) return;

    stateRef.current.isFinished = true;
    setIsFlash(true);
    setIsShaking(false);

    const isSuccess = stateRef.current.gameState === 'JUMPING';
    let finalMetric;
    let finalState;
    let rTime = null;
    let comment;

    if (isSuccess) {
      const reactionSec = (performance.now() - stateRef.current.attackStartTime) / 1000;
      const { tier, points } = pointsForError(reactionSec, STAGE2_CONFIG);
      finalMetric = metricFromPoints(points, STAGE2_CONFIG);
      finalState = 'SUCCESS';
      rTime = reactionSec.toFixed(3);
      comment = TIER_COMMENT[tier.id] ?? tier.label;
    } else {
      // fake 캐치 — reaction time 정의 안 됨, bare tier 직행
      const bareTier = STAGE2_CONFIG.accuracyTiers.find((t) => t.id === 'bare');
      finalMetric = metricFromPoints(bareTier.points, STAGE2_CONFIG);
      finalState = 'FAILED';
      comment = '너무 성급했습니다. 훼이크에 속았습니다.';
    }

    syncGameState(finalState);
    setTimeout(() => {
      setIsFlash(false);
      handleFinish(finalMetric, finalState, rTime, comment);
    }, 300);
  }, [handleFinish]);
```

- [ ] **Step 3: 진짜 출현 후 미반응 fail 분기도 metric 기반으로**

`Stage2Placeholder.jsx:156-160` 의 `tFail` setTimeout 안 `handleFinish(0, 'FAILED', ...)` 호출을 metric 기반으로 변경.

기존:
```jsx
      const tFail = setTimeout(() => {
        if (!stateRef.current.isFinished) {
          handleFinish(0, 'FAILED', null, "반응이 너무 늦었습니다. 놈에게 잡혔습니다.");
        }
      }, 700);
```

다음으로 교체:
```jsx
      const tFail = setTimeout(() => {
        if (!stateRef.current.isFinished) {
          const bareTier = STAGE2_CONFIG.accuracyTiers.find((t) => t.id === 'bare');
          const metric = metricFromPoints(bareTier.points, STAGE2_CONFIG);
          handleFinish(metric, 'FAILED', null, "반응이 너무 늦었습니다. 놈에게 잡혔습니다.");
        }
      }, STAGE2_CONFIG.attackWindowMs);
```

- [ ] **Step 4: lint + build 통과 확인**

Run: `npm run lint -- src/stages/stage2/Stage2Placeholder.jsx`
Expected: 에러 없음.

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 5: 커밋**

```bash
git add src/stages/stage2/Stage2Placeholder.jsx
git commit -m "feat : Stage 2 점수 로직 helper/config 연결 + fail bare tier 명시 #33"
```

---

## Task 7: Stage4TimerPane 와이어업 (Stage 1 config 공유)

**Files:**
- Modify: `src/stages/stage4/Stage4TimerPane.jsx`

- [ ] **Step 1: import 추가**

`src/stages/stage4/Stage4TimerPane.jsx:1-3` 상단에 두 줄 추가.

기존:
```jsx
// src/routes/stage4/Stage4TimerPane.jsx
import React, { useState, useEffect, useRef } from 'react';
import './Stage4TimerPane.css';
```

다음으로 교체:
```jsx
// src/routes/stage4/Stage4TimerPane.jsx
import React, { useState, useEffect, useRef } from 'react';
import './Stage4TimerPane.css';
import { STAGE1_CONFIG } from '../stage1/stage1.config.js';
import { pointsForError, metricFromPoints } from '../common/reactionScoring.js';
```

- [ ] **Step 2: handleFinish 하드코딩 사다리 제거**

`Stage4TimerPane.jsx:37-42` 의 `handleFinish` 를 다음으로 교체:

```jsx
  const handleFinish = (time) => {
    cancelAnimationFrame(requestRef.current);
    const error = Math.abs(time - STAGE1_CONFIG.targetSec);
    const { points } = pointsForError(error, STAGE1_CONFIG);
    const metric = metricFromPoints(points, STAGE1_CONFIG);
    if (onResult) onResult(metric);
  };
```

- [ ] **Step 3: lint + build 통과 확인**

Run: `npm run lint -- src/stages/stage4/Stage4TimerPane.jsx`
Expected: 에러 없음.

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 4: 커밋**

```bash
git add src/stages/stage4/Stage4TimerPane.jsx
git commit -m "feat : Stage 4 TimerPane 점수 로직 Stage 1 config 공유 #33"
```

---

## Task 8: 전체 회귀 + 매뉴얼 스모크

**Files:**
- 변경 없음 (검증만)

- [ ] **Step 1: 전체 단위 테스트 실행**

Run: `npm run test:run`
Expected: 35 passed 부근 (Task 1 의 12건 + Task 4 의 23건).

- [ ] **Step 2: 전체 lint**

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 3: 빌드**

Run: `npm run build`
Expected: 빌드 성공, 경고 없음.

- [ ] **Step 4: dev 서버 띄우고 게임 흐름 확인**

Run: `npm run dev`
Expected: localhost:5173 서버 가동.

브라우저에서 다음 흐름을 직접 진행:
1. 타이틀 → 시작
2. Stage 1 — 정확히 10s 근처에서 ← 누르기. 결과 화면이 정상 표시되는지 확인.
3. Hub 로 복귀 → 누적 점수 영향 확인 (해당 UI 가 노출된다면).
4. Stage 2 — 진짜 출현 시 ↑ 누르기. 다양한 reaction time 시도 (즉시 / 0.3s / 0.6s / 미반응).
5. Stage 3 — 회귀 확인 (변경 없음).
6. Stage 4 — 좌(타이머)·중(반응속도)·우(캐치) 세 영역 동작 + 합산 점수 + 엔딩 분기 동작.

- [ ] **Step 5: 콘솔 에러 / 워닝 없음 확인**

DevTools Console 에 React/렌더 워닝, undefined / NaN 노출 없는지 확인.

- [ ] **Step 6: 회귀 항목 체크**

- [ ] Stage 1 자동 종료(11.5s 까지 미입력) → bare tier 점수로 떨어지는지
- [ ] Stage 2 fake 캐치 → bare tier 점수
- [ ] Stage 2 timeout → bare tier 점수
- [ ] Stage 4 split 진입 시 Stage 2 mode='split' 정상 동작
- [ ] 엔딩 분기 — 새 cutoff 700 기준 alive/silhouette 정상 분기

- [ ] **Step 7: 최종 커밋 (필요 시)**

스모크 중에 발견된 사소한 수정만 커밋. 회귀 항목이 깨지면 해당 task 로 돌아가서 수정.

```bash
git status   # 변경 없음 확인 또는 작은 수정 확인
```

---

## 부록: 변경 파일 요약

| 파일 | 신규/수정 | task |
|---|---|---|
| `package.json` | 수정 | 0 |
| `vite.config.js` | 수정 | 0 |
| `src/stages/common/reactionScoring.js` | 신규 | 1 |
| `src/stages/common/reactionScoring.test.js` | 신규 | 1 |
| `src/stages/stage1/stage1.config.js` | 신규 | 2 |
| `src/stages/stage2/stage2.config.js` | 신규 | 3 |
| `src/scoring.js` | 수정 | 4 |
| `src/scoring.test.js` | 신규 | 4 |
| `src/stages/stage1/Stage1Placeholder.jsx` | 수정 | 5 |
| `src/stages/stage2/Stage2Placeholder.jsx` | 수정 | 6 |
| `src/stages/stage4/Stage4TimerPane.jsx` | 수정 | 7 |
