# Stage3 단순화 및 Score UI 제거 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 스테이지 좌측하단 score 제거, Stage3를 진짜 기억 4개 catch/miss 이진 판정으로 단순화, CatchZone을 y축 70%로 이동.

**Architecture:** 5개 파일만 수정. stage3.config.js를 먼저 재구조화한 뒤, Stage3Field → Stage3Game 순으로 변경. CatchZone.css와 HudOverlay는 독립 변경.

**Tech Stack:** React, Vitest + @testing-library/react, CSS

**Spec:** `docs/superpowers/specs/2026-05-14-stage3-simplification-design.md`

---

## 변경 파일 목록

| 파일 | 역할 |
|------|------|
| `src/stages/stage3/stage3.config.js` | config 재구조화 (accuracyTiers → catchPoints) |
| `src/stages/stage3/Stage3Field.jsx` | fake 제거, 단순 catch/miss, zoneCenter 70 |
| `src/stages/stage3/Stage3Game.jsx` | ResultModal breakdown 단순화 |
| `src/stages/stage3/CatchZone.css` | top 50% → 70% |
| `src/components/HudOverlay/HudOverlay.jsx` | stage 라우트 score div 제거 |
| `src/components/HudOverlay/__tests__/HudOverlay.test.jsx` | stage 라우트 렌더링 테스트 수정 |

---

## Task 1: stage3.config.js 재구조화

**Files:**
- Modify: `src/stages/stage3/stage3.config.js`

- [ ] **Step 1: 파일 읽기**

```bash
cat src/stages/stage3/stage3.config.js
```

- [ ] **Step 2: 전체 내용을 새 구조로 교체**

파일 내용을 아래로 완전히 교체한다:

```js
// src/stages/stage3/stage3.config.js
export const STAGE3_CONFIG = {
  durationSec:             10,
  itemCount:               4,        // 전부 real, fake 없음
  fallDurationSec:         2.0,
  catchZoneRatio:          0.25,
  spawnIntervalJitterSec:  0.4,
  horizontalRandomRatio:   0.2,
  seed:                    null,     // null = 매 플레이 Date.now() 사용

  catchPoints: 25,         // 캐치 성공 시 고정 점수 (4 × 25 = 100 max)
  catchLabel:  '캐치!',
  missLabel:   '놓침',
};
```

- [ ] **Step 3: 커밋**

```bash
git add src/stages/stage3/stage3.config.js
git commit -m "refactor: Stage3 config 단순화 — accuracyTiers/fake 제거, catchPoints 추가"
```

---

## Task 2: Stage3Field.jsx 단순화

**Files:**
- Modify: `src/stages/stage3/Stage3Field.jsx`

- [ ] **Step 1: 파일 읽기**

```bash
cat src/stages/stage3/Stage3Field.jsx
```

- [ ] **Step 2: buildSequence 함수 교체**

기존 `buildSequence` 함수(fake/real 섞기 로직 포함)를 아래로 교체한다:

```js
function buildSequence(config) {
  const seed = config.seed ?? Date.now();
  const rand = mulberry32(seed);
  const baseInterval = config.durationSec / config.itemCount;

  return Array.from({ length: config.itemCount }, (_, i) => {
    const offset = (rand() * 2 - 1) * config.spawnIntervalJitterSec;
    const spawnAt = Math.max(0, i * baseInterval + offset);
    const horizontalPct = 50 + (rand() * 2 - 1) * config.horizontalRandomRatio * 100;
    const imgSrc = ASSETS.images.memoryReal[Math.floor(rand() * ASSETS.images.memoryReal.length)];
    return { imgSrc, spawnAt, horizontalPct };
  });
}
```

- [ ] **Step 3: pointsForOffset 함수 전체 삭제**

파일에서 아래 함수를 완전히 제거한다:

```js
// 삭제할 함수
function pointsForOffset(absOffset, tiers, missLabel) { ... }
```

- [ ] **Step 4: useState/useRef 초기화 정리**

`Stage3Field` 컴포넌트 상단에서:
- `statsRef` 초기값을 `{ caughtCount: 0, missedCount: 0 }`로 변경

```js
const statsRef = useRef({ caughtCount: 0, missedCount: 0 });
```

- [ ] **Step 5: running 시작 useEffect 정리**

`if (!isRunning) return;` 블록 내 초기화 부분:

```js
statsRef.current = { caughtCount: 0, missedCount: 0 };
```

RAF 루프 내 아이템 timeout 처리 (fake 분기 제거):

```js
if (localT > config.fallDurationSec) {
  statsRef.current.missedCount += 1;
  return { ...it, status: 'missed', topPercent: 110 };
}
```

metric 계산 (maxPossible을 config 기반으로 단순화):

```js
const maxPossible = config.itemCount * config.catchPoints;
const ratio = Math.max(0, Math.min(1, totalPointsRef.current / maxPossible));
const metric = 1 - ratio;
const caughtCount = statsRef.current.caughtCount;
cancelAnimationFrame(rafRef.current);
onResult({
  metric,
  caughtCount,
  missedCount: statsRef.current.missedCount,
  realCount: config.itemCount,
  totalScore: totalPointsRef.current,
});
return;
```

- [ ] **Step 6: keydown 핸들러 교체**

`→ 입력 처리` useEffect의 핸들러를 아래로 교체한다:

```js
const handleKeyDown = (e) => {
  if (e.code !== 'ArrowRight') return;
  e.preventDefault();

  const zoneCenter = 70;
  const zoneHalf = config.catchZoneRatio / 2 * 100;
  const zoneTop = zoneCenter - zoneHalf;
  const zoneBottom = zoneCenter + zoneHalf;

  const candidates = itemsRef.current.filter(
    (it) => it.status === 'falling' && it.topPercent >= zoneTop && it.topPercent <= zoneBottom
  );
  if (candidates.length === 0) return;

  const target = candidates.reduce((best, it) => {
    const itDist = Math.abs(it.topPercent - zoneCenter);
    const bestDist = Math.abs(best.topPercent - zoneCenter);
    return itDist < bestDist ? it : best;
  });

  addPoints(config.catchPoints);
  showPopup(config.catchLabel, config.catchPoints, '#FFD700');
  statsRef.current.caughtCount += 1;

  setItems((prev) => prev.map(
    (it) => it.id === target.id ? { ...it, status: 'caught' } : it
  ));
};
```

- [ ] **Step 7: HUD에서 "점수" 행 제거**

`Stage3Field` 렌더 부분의 `stage3-hud` div에서 점수 행을 제거한다:

```jsx
{/* 제거할 행 */}
<div className="stage3-hud__row">
  <span className="stage3-hud__label">점수</span>
  <span className="stage3-hud__score">{score}</span>
</div>
```

점수 관련 state와 useCallback도 정리:
- `const [score, setScore] = useState(0);` 줄 제거
- `setScore(totalPointsRef.current);` 호출부 제거 (addPoints 내부)
- `addPoints` callback에서 `setScore(...)` 호출 제거

`addPoints`의 새 형태:
```js
const addPoints = useCallback((delta) => {
  totalPointsRef.current += delta;
}, []);
```

- [ ] **Step 8: FallingItem에서 kind prop 제거**

기존에 `kind={it.kind}`를 넘기던 부분에서 `kind` 제거:

```jsx
{items.map((it) => (
  it.status === 'falling' && (
    <FallingItem
      key={it.id}
      src={it.imgSrc}
      leftPercent={it.horizontalPct}
      topPercent={it.topPercent}
    />
  )
))}
```

> `FallingItem.jsx`가 `kind` prop을 받는지 확인 후, 사용하지 않는다면 그대로 두어도 무방.

- [ ] **Step 9: 커밋**

```bash
git add src/stages/stage3/Stage3Field.jsx
git commit -m "refactor: Stage3Field fake 제거, catch/miss 단순화, zone 70%"
```

---

## Task 3: Stage3Game.jsx ResultModal 단순화

**Files:**
- Modify: `src/stages/stage3/Stage3Game.jsx`

- [ ] **Step 1: 파일 읽기**

```bash
cat src/stages/stage3/Stage3Game.jsx
```

- [ ] **Step 2: modalProps 계산 블록 교체**

기존 `modalProps` IIFE 전체를 아래로 교체한다:

```js
const modalProps = (() => {
  if (!resultData) return null;
  const { caughtCount, missedCount, realCount, totalScore } = resultData;

  const isSuccess = caughtCount >= realCount / 2;

  let comment;
  if (caughtCount === realCount)         comment = '모든 기억을 되찾았습니다.';
  else if (caughtCount >= realCount / 2) comment = '대부분의 조각을 회수했습니다.';
  else                                   comment = '기억이 흩어져버렸습니다.';

  const breakdown = [];
  if (caughtCount > 0) {
    breakdown.push({
      label: '캐치',
      value: `${caughtCount}개`,
      delta: `+${caughtCount * STAGE3_CONFIG.catchPoints}`,
      color: '#FFD700',
    });
  }
  if (missedCount > 0) {
    breakdown.push({
      label: '놓침',
      value: `${missedCount}개`,
      delta: null,
      color: '#888',
    });
  }

  return {
    metricLabel: 'PIECES',
    metricValue: `${caughtCount}/${realCount}`,
    breakdown,
    score: undefined,
    maxScore: undefined,
    tone: isSuccess ? 'success' : 'failed',
    hint: mode === 'standalone' ? 'Space / Enter 로 계속' : null,
    tierComment: comment,
  };
})();
```

- [ ] **Step 3: 불필요한 import 제거**

`Stage3Game.jsx` 상단에서 더 이상 사용하지 않는 import 제거:
- `maxScoreForStage` — 사용하지 않으면 제거

```js
import { maxScoreForStage } from '../../scoring.js';  // 제거 대상
```

사용 여부 확인 후 제거.

- [ ] **Step 4: 커밋**

```bash
git add src/stages/stage3/Stage3Game.jsx
git commit -m "refactor: Stage3Game ResultModal breakdown catch/miss 단순화"
```

---

## Task 4: CatchZone.css 위치 변경

**Files:**
- Modify: `src/stages/stage3/CatchZone.css`

- [ ] **Step 1: top 값 변경**

`CatchZone.css`의 `.catch-zone` 블록에서:

```css
/* 변경 전 */
top: 50%;
transform: translateY(-50%);

/* 변경 후 */
top: 70%;
transform: translateY(-50%);
```

- [ ] **Step 2: 커밋**

```bash
git add src/stages/stage3/CatchZone.css
git commit -m "style: CatchZone y축 위치 50% → 70%"
```

---

## Task 5: HudOverlay score 제거 (TDD)

**Files:**
- Modify: `src/components/HudOverlay/HudOverlay.jsx`
- Modify: `src/components/HudOverlay/__tests__/HudOverlay.test.jsx`

- [ ] **Step 1: 테스트 먼저 수정 (RED)**

`HudOverlay.test.jsx`에서 stage 라우트 테스트를 수정한다:

```js
// 변경 전
it('/stage/* 라우트에서는 SCORE 텍스트만 노출되고 아이콘 버튼은 없다', () => {
  renderHud({ path: '/stage/1' });
  expect(screen.getByText(/SCORE/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '게임 설명' })).toBeNull();
  expect(screen.queryByRole('button', { name: '결과 확인' })).toBeNull();
});

// 변경 후
it('/stage/* 라우트에서는 HUD가 렌더되지 않는다', () => {
  const { container } = renderHud({ path: '/stage/1' });
  expect(container.querySelector('.hud-overlay')).toBeNull();
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/components/HudOverlay/__tests__/HudOverlay.test.jsx --reporter=verbose
```

Expected: FAIL — stage 라우트 테스트가 실패해야 함.

- [ ] **Step 3: HudOverlay.jsx 구현 변경 (GREEN)**

`HudOverlay.jsx`의 stage 라우트 분기를 변경한다:

```jsx
// 변경 전
if (pathname.startsWith('/stage/')) {
  return (
    <div className="hud-overlay" aria-hidden="false">
      <div className="hud-overlay__score-simple">SCORE {total}</div>
    </div>
  );
}

// 변경 후
if (pathname.startsWith('/stage/')) {
  return null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/components/HudOverlay/__tests__/HudOverlay.test.jsx --reporter=verbose
```

Expected: 모든 테스트 PASS.

- [ ] **Step 5: 전체 테스트 통과 확인**

```bash
npx vitest run --reporter=verbose
```

Expected: 전체 PASS (실패 0개).

- [ ] **Step 6: 커밋**

```bash
git add src/components/HudOverlay/HudOverlay.jsx src/components/HudOverlay/__tests__/HudOverlay.test.jsx
git commit -m "feat: HudOverlay stage 라우트 score 표시 제거"
```

---

## Task 6: FallingItem kind prop 확인 및 정리

**Files:**
- Modify (필요시): `src/stages/stage3/FallingItem.jsx`

- [ ] **Step 1: FallingItem.jsx 읽기**

```bash
cat src/stages/stage3/FallingItem.jsx
```

- [ ] **Step 2: kind prop 사용 여부 확인**

`FallingItem.jsx`가 `kind` prop을 받아 사용하는지 확인한다.

- 사용하지 않으면: 아무 변경 없이 넘어감.
- `kind === 'fake'`에 따라 시각적으로 다르게 표시하는 로직이 있으면: 해당 분기 제거 (모두 real이므로 fake 스타일 불필요).

- [ ] **Step 3: 변경이 있었다면 커밋**

```bash
git add src/stages/stage3/FallingItem.jsx
git commit -m "refactor: FallingItem fake 스타일 분기 제거"
```

---

## Task 7: 최종 검증

- [ ] **Step 1: 전체 테스트**

```bash
npx vitest run --reporter=verbose
```

Expected: 전체 PASS, 실패 0개.

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

Expected: 에러 없이 빌드 성공.

- [ ] **Step 3: 개발 서버에서 수동 확인**

```bash
npm run dev
```

확인 항목:
1. `/stage/1`, `/stage/2`, `/stage/3`, `/stage/4` 진입 시 좌측하단 SCORE 텍스트 미표시
2. Stage3 진입 → 아이템 4개만 낙하 (가짜 이미지 없음)
3. 아이템이 화면 70% 지점에서 캐치 가능
4. → 키 누르면 "캐치!" 팝업 (티어 구분 없음)
5. 캐치 못하면 "놓침" (ResultModal에서)
6. ResultModal에 캐치/놓침 두 행만 표시
