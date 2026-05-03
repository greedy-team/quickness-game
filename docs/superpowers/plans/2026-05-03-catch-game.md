# 캐치 게임(#10) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PRD §2.3에 정의된 3번 캐치 미니게임을 "장비 드롭 캐치" 컨셉으로 구현하고 App에 연결한다.

**Architecture:** 1·2번 미니게임과 동일한 phase state machine(idle/running/result) 패턴. 떨어지는 아이템은 CSS @keyframes로 애니메이션, 활성 아이템 메타데이터(id/type/spawnAt)만 React state로 관리. 위치는 매 입력마다 시간 기반으로 즉석 계산하여 state 갱신 비용 최소화. 점수 판정은 순수 함수로 분리해 4번 병렬 게임에서 utils + FallingItem 재사용 가능한 구조.

**Tech Stack:** React 19, Vite 8, plain CSS (애니메이션은 CSS keyframes), 기존 자산 활용 (`/sprites/unified_5_walk_no_weapon.png`, `/bg/world.png`)

**Spec:** `docs/superpowers/specs/2026-05-03-catch-game-design.md`

**Issue:** #10 — `20260503_#10_캐치_게임_3번_구현` 브랜치

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/components/CatchGame/catchUtils.js` | 상수 + 순수 함수 (judgeHit, getCatchResult, planSpawnTimes, pickRandomType, getItemY) |
| `src/components/CatchGame/FallingItem.jsx` | 떨어지는 아이템 단일 컴포넌트 (emoji + CSS 애니메이션) |
| `src/components/CatchGame/CatchGame.jsx` | 메인 컴포넌트, phase state machine, 게임 루프, 입력 처리, 결과 |
| `src/components/CatchGame/CatchGame.css` | 스테이지/배경/sprite/아이템/패널 스타일 |
| `src/App.jsx` (수정) | CatchGame 섹션 추가 |

---

## Verification Model

이 프로젝트에는 테스트 프레임워크가 없다. 검증은:

- **순수 함수**: `node --input-type=module -e ...` 인라인 sanity check
- **UI/애니메이션**: `npm run dev`로 브라우저 수동 확인
- **빌드/린트**: `npm run build`, `npm run lint`

각 Task의 verify 단계에 정확한 명령과 기대 결과를 명시한다.

---

## Geometry Constants (왜 이 숫자인가)

- `STAGE_HEIGHT_PX = 600` — PRD §6.2 권장 비율 1200×600
- `RED_CIRCLE_TOP_PX = 420` — 그린이 가슴~배 높이 ("장비 거치대" 비주얼). 그린이 sprite는 bottom=151, height=220이라 stage 좌표에서 head ≈ y=261, foot ≈ y=441
- `FALL_DURATION_MS = 2000` — 아이템이 빨간 원에 도달하는 시간 = 420/600 × 2000 = 1400ms (반응 시간 1.4초)
- 판정 윈도우: perfect ±10px ≈ ±33ms, near ±20px ≈ ±67ms — 적당히 도전적

---

### Task 1: catchUtils.js — 상수 + 순수 함수

**Files:**
- Create: `src/components/CatchGame/catchUtils.js`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p src/components/CatchGame
```

- [ ] **Step 2: catchUtils.js 작성**

`src/components/CatchGame/catchUtils.js`:

```js
// 캐치 게임 — 상수 및 점수 판정 로직 (순수 함수)

export const ITEM_TYPES = ['sword', 'shield', 'potion'];

export const ITEM_EMOJI = {
  sword: '⚔️',
  shield: '🛡️',
  potion: '🧪',
};

export const TARGET_DISTANCE_PERFECT = 10;  // px
export const TARGET_DISTANCE_NEAR = 20;     // px
export const HIT_RANGE_MAX = 60;            // px (이 범위 밖 입력은 fail로 카운트)

export const GAME_DURATION_MS = 10_000;
export const SPAWN_COUNT = 6;
export const SPAWN_MIN_GAP_MS = 1400;
export const SPAWN_MAX_GAP_MS = 1700;
export const SPAWN_FIRST_AT_MS = 800;
export const FALL_DURATION_MS = 2000;
export const STAGE_HEIGHT_PX = 600;
export const RED_CIRCLE_TOP_PX = 420;       // 그린이 가슴 높이

// 거리(px)를 받아 점수와 종류 반환
export function judgeHit(distancePx) {
  if (distancePx <= TARGET_DISTANCE_PERFECT) return { score: 50, kind: 'perfect' };
  if (distancePx <= TARGET_DISTANCE_NEAR) return { score: 20, kind: 'near' };
  return { score: 0, kind: 'fail' };
}

// 총점을 받아 등급/색/별 반환
export function getCatchResult(totalScore) {
  if (totalScore >= 280) return { grade: 'LEGENDARY', title: '⚔️ 전설급 장비 한 세트 완성!', desc: '하늘이 그린이를 인정했다. 완벽한 장비 보관함이다.', color: '#ffd700', stars: 5 };
  if (totalScore >= 200) return { grade: 'RARE', title: '✨ 레어 장비 모음', desc: '훌륭한 캐치! 빛나는 장비를 충분히 모았다.', color: '#a78bfa', stars: 4 };
  if (totalScore >= 120) return { grade: 'COMMON', title: '🛡️ 평범한 장비 보관함', desc: '쓸 만한 장비를 모았다. 보스전 준비는 가능하다.', color: '#86efac', stars: 3 };
  if (totalScore >= 40)  return { grade: 'FAIL', title: '🔨 부족한 장비', desc: '장비가 부족하다. 다시 도전해보자.', color: '#fb923c', stars: 1 };
  return { grade: 'DEAD', title: '💀 빈 손으로 돌아왔다', desc: '아무 장비도 챙기지 못했다.', color: '#f87171', stars: 0 };
}

// 게임 시작 후 아이템이 등장할 시각(ms) 배열
export function planSpawnTimes(
  durationMs = GAME_DURATION_MS,
  count = SPAWN_COUNT,
  minGapMs = SPAWN_MIN_GAP_MS,
  maxGapMs = SPAWN_MAX_GAP_MS,
  firstAtMs = SPAWN_FIRST_AT_MS,
  fallMs = FALL_DURATION_MS,
) {
  const times = [];
  let t = firstAtMs;
  for (let i = 0; i < count; i++) {
    if (t + fallMs > durationMs) break;  // 빨간 원에 도달 못 하면 spawn 안 함
    times.push(t);
    const gap = Math.floor(minGapMs + Math.random() * (maxGapMs - minGapMs));
    t += gap;
  }
  return times;
}

export function pickRandomType() {
  return ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
}

// spawnAt 이후 elapsed 기반 시간 계산으로 현재 y 위치(px) 반환
export function getItemY(elapsedSinceSpawnMs, stageHeightPx = STAGE_HEIGHT_PX, fallDurationMs = FALL_DURATION_MS) {
  const progress = elapsedSinceSpawnMs / fallDurationMs;
  return progress * stageHeightPx;
}
```

- [ ] **Step 3: 순수 함수 sanity check**

```bash
cd /Users/luca/workspace/greedy/quickness-game
node --input-type=module -e "
import('./src/components/CatchGame/catchUtils.js').then(m => {
  console.log('judgeHit(5):', JSON.stringify(m.judgeHit(5)));
  console.log('judgeHit(15):', JSON.stringify(m.judgeHit(15)));
  console.log('judgeHit(50):', JSON.stringify(m.judgeHit(50)));
  console.log('getCatchResult(280):', m.getCatchResult(280).grade);
  console.log('getCatchResult(120):', m.getCatchResult(120).grade);
  console.log('getCatchResult(0):', m.getCatchResult(0).grade);
  console.log('planSpawnTimes() length:', m.planSpawnTimes().length);
  console.log('planSpawnTimes() sample:', m.planSpawnTimes());
  console.log('getItemY(1400):', m.getItemY(1400));
  console.log('pickRandomType():', m.pickRandomType());
});
"
```

Expected:
```
judgeHit(5): {"score":50,"kind":"perfect"}
judgeHit(15): {"score":20,"kind":"near"}
judgeHit(50): {"score":0,"kind":"fail"}
getCatchResult(280): LEGENDARY
getCatchResult(120): COMMON
getCatchResult(0): DEAD
planSpawnTimes() length: 5 또는 6 (랜덤)
planSpawnTimes() sample: [800, ~2200, ~3700, ~5200, ~6700, ~8200]
getItemY(1400): 420
pickRandomType(): sword | shield | potion 중 하나
```

- [ ] **Step 4: Commit**

```bash
git add src/components/CatchGame/catchUtils.js
git commit -m "feat: 캐치 게임 점수 판정 로직 및 상수 추가 (#10)"
```

---

### Task 2: FallingItem.jsx + CSS 애니메이션

**Files:**
- Create: `src/components/CatchGame/FallingItem.jsx`
- Create: `src/components/CatchGame/CatchGame.css` (최초, 떨어지는 애니메이션만)

- [ ] **Step 1: CatchGame.css 최초 작성**

`src/components/CatchGame/CatchGame.css`:

```css
/* === 캐치 게임 — 떨어지는 아이템 === */
.catch-falling-item {
  position: absolute;
  left: 50%;
  top: 0;
  font-size: 48px;
  pointer-events: none;
  will-change: transform;
  animation-name: catch-fall;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  z-index: 5;
}

@keyframes catch-fall {
  from { transform: translate(-50%, 0); }
  to   { transform: translate(-50%, var(--catch-stage-height, 600px)); }
}

.catch-item-emoji {
  display: inline-block;
  animation: catch-spin 1.2s linear infinite;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}

@keyframes catch-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

- [ ] **Step 2: FallingItem.jsx 작성**

`src/components/CatchGame/FallingItem.jsx`:

```jsx
import { ITEM_EMOJI, FALL_DURATION_MS } from './catchUtils';

export default function FallingItem({ type, fallDurationMs = FALL_DURATION_MS, speedMultiplier = 1 }) {
  const duration = fallDurationMs / speedMultiplier;
  return (
    <div
      className="catch-falling-item"
      style={{ animationDuration: `${duration}ms` }}
    >
      <span className="catch-item-emoji">{ITEM_EMOJI[type] ?? '?'}</span>
    </div>
  );
}
```

- [ ] **Step 3: 린트 통과 확인**

```bash
npm run lint
```

Expected: 새 파일 관련 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add src/components/CatchGame/FallingItem.jsx src/components/CatchGame/CatchGame.css
git commit -m "feat: 캐치 게임 떨어지는 아이템 컴포넌트 추가 (#10)"
```

---

### Task 3: CatchGame.jsx 스켈레톤 + App.jsx 연결 (idle phase 가시화)

**Files:**
- Create: `src/components/CatchGame/CatchGame.jsx`
- Modify: `src/components/CatchGame/CatchGame.css` (스테이지/idle UI 추가)
- Modify: `src/App.jsx`

- [ ] **Step 1: CatchGame.jsx 최초 버전 (idle phase + 스테이지 비주얼만)**

`src/components/CatchGame/CatchGame.jsx`:

```jsx
import { useState } from 'react';
import './CatchGame.css';

export default function CatchGame() {
  const [phase, setPhase] = useState('idle');

  const startGame = () => {
    setPhase('running');
  };

  return (
    <div className="catch-stage">
      <div className="catch-bg" aria-hidden="true" />
      <div className="catch-greenie" aria-hidden="true" />
      <div className="catch-circle" aria-hidden="true" />

      <div className="catch-ui-overlay">
        {phase === 'idle' && (
          <div className="catch-panel catch-panel-start">
            <h2 className="catch-title">⚔️ 장비 드롭의 시련</h2>
            <p>하늘에서 떨어지는 장비를 거치대(빨간 원) 위치에서 <b>→ 키</b>로 잡아라!</p>
            <button className="catch-btn catch-btn-primary" onClick={startGame} type="button">
              ▶ 시작 (Space)
            </button>
          </div>
        )}

        {phase === 'running' && (
          <div className="catch-hud">
            <div>장비 드롭 진행 중...</div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: CatchGame.css에 스테이지/스프라이트/원/패널 스타일 추가**

`src/components/CatchGame/CatchGame.css` 끝에 추가:

```css
/* === 캐치 게임 — 스테이지/UI === */
.catch-stage {
  position: relative;
  width: min(1200px, 100%);
  height: 600px;
  margin: 0 auto;
  background: #1a1a2e;
  overflow: hidden;
  border: 2px solid #333;
  --catch-stage-height: 600px;
}

.catch-bg {
  position: absolute;
  inset: 0;
  background-image: url('/bg/world.png');
  background-size: cover;
  background-position: center bottom;
  image-rendering: pixelated;
  z-index: 1;
}

/* 무방비 그린이 sprite (8프레임 walking, 0.8s loop) */
.catch-greenie {
  position: absolute;
  bottom: 151px;
  left: 50%;
  margin-left: -200px;        /* width 400 의 절반 */
  width: 400px;
  height: 220px;
  background-image: url('/sprites/unified_5_walk_no_weapon.png');
  background-repeat: no-repeat;
  image-rendering: pixelated;
  animation: catch-greenie-walk 0.8s steps(8) infinite;
  z-index: 2;
}

@keyframes catch-greenie-walk {
  to { background-position: -3200px 0; }   /* 400 × 8 frames */
}

/* 빨간 원 = 장비 거치대 */
.catch-circle {
  position: absolute;
  top: 420px;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ff8a8a, #d42b2b 70%);
  box-shadow: 0 0 24px rgba(255, 90, 90, 0.7), inset 0 0 8px rgba(255, 255, 255, 0.4);
  z-index: 3;
}

/* UI 오버레이 */
.catch-ui-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

.catch-panel {
  pointer-events: auto;
  background: rgba(15, 15, 26, 0.92);
  color: #f0f0f0;
  padding: 28px 36px;
  border-radius: 12px;
  border: 2px solid #4ade80;
  text-align: center;
  max-width: 480px;
  font-family: system-ui, sans-serif;
}

.catch-title {
  margin: 0 0 12px;
  font-size: 24px;
  color: #ffd700;
}

.catch-btn {
  margin-top: 16px;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  border: 2px solid #f0f0f0;
  background: #4ade80;
  color: #0f0f1a;
  border-radius: 6px;
  font-weight: 700;
}

.catch-btn:hover { filter: brightness(1.1); }

.catch-hud {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  font-family: system-ui, sans-serif;
  pointer-events: none;
}
```

- [ ] **Step 3: App.jsx에 CatchGame import 및 섹션 추가**

`src/App.jsx`에서 `ColorReactionGame` import 라인 아래에 추가:

```jsx
import CatchGame from './components/CatchGame/CatchGame';
```

그리고 `ColorReactionGame` 섹션 (배경 `#0f0f1a`) 바로 뒤에 새 섹션 추가:

```jsx
      {/* --- 세 번째 게임: 캐치 (장비 드롭) --- */}
      <div className="ticks"></div>
      <section style={{ padding: '40px 0', backgroundColor: '#1a1a2e' }}>
        <CatchGame />
      </section>
      {/* ----------------------------------------- */}
```

- [ ] **Step 4: 브라우저 검증**

```bash
npm run dev
```

브라우저 페이지 하단으로 스크롤. 다음을 확인:
- 캐치 게임 섹션 보임 (네이비 배경 + 풀밭 world.png 적용)
- 무방비 그린이 sprite가 화면 중앙 풀밭 위에서 걷기 애니메이션 (8프레임)
- 그린이 가슴 높이에 빨간 원(거치대)이 빛나며 보임
- 중앙에 "⚔️ 장비 드롭의 시련" idle 패널 + 시작 버튼
- 시작 버튼 클릭 → 패널 사라지고 상단에 "장비 드롭 진행 중..." 표시
- 콘솔 에러 없음

`Ctrl+C`로 dev server 종료.

- [ ] **Step 5: Lint 확인**

```bash
npm run lint
```

Expected: 새 파일 관련 에러 없음.

- [ ] **Step 6: Commit**

```bash
git add src/components/CatchGame/CatchGame.jsx src/components/CatchGame/CatchGame.css src/App.jsx
git commit -m "feat: 캐치 게임 스테이지/idle UI 및 App 연결 (#10)"
```

---

### Task 4: CatchGame.jsx — running phase (타이머 + 아이템 spawn)

**Files:**
- Modify: `src/components/CatchGame/CatchGame.jsx`

- [ ] **Step 1: CatchGame.jsx 전체 교체 (게임 루프 추가)**

`src/components/CatchGame/CatchGame.jsx` 전체를 다음으로 교체:

```jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GAME_DURATION_MS,
  FALL_DURATION_MS,
  planSpawnTimes,
  pickRandomType,
} from './catchUtils';
import FallingItem from './FallingItem';
import './CatchGame.css';

let nextItemId = 1;

export default function CatchGame() {
  const [phase, setPhase] = useState('idle');
  const [activeItems, setActiveItems] = useState([]);  // [{ id, type, spawnAt }]
  const [elapsedMs, setElapsedMs] = useState(0);

  const gameStartMsRef = useRef(0);
  const spawnTimeoutsRef = useRef([]);
  const cleanupTimeoutsRef = useRef([]);
  const endTimeoutRef = useRef(null);
  const tickIntervalRef = useRef(null);

  const spawnItem = useCallback(() => {
    const id = nextItemId++;
    const spawnAt = performance.now() - gameStartMsRef.current;
    setActiveItems((prev) => [...prev, { id, type: pickRandomType(), spawnAt }]);
    // 화면 밖으로 나간 후 자동 제거
    const tid = setTimeout(() => {
      setActiveItems((prev) => prev.filter((it) => it.id !== id));
    }, FALL_DURATION_MS + 300);
    cleanupTimeoutsRef.current.push(tid);
  }, []);

  const cleanupTimers = useCallback(() => {
    spawnTimeoutsRef.current.forEach(clearTimeout);
    cleanupTimeoutsRef.current.forEach(clearTimeout);
    spawnTimeoutsRef.current = [];
    cleanupTimeoutsRef.current = [];
    if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current);
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    endTimeoutRef.current = null;
    tickIntervalRef.current = null;
  }, []);

  const startGame = useCallback(() => {
    cleanupTimers();
    setActiveItems([]);
    setElapsedMs(0);
    gameStartMsRef.current = performance.now();
    setPhase('running');

    const schedule = planSpawnTimes();
    spawnTimeoutsRef.current = schedule.map((t) => setTimeout(spawnItem, t));

    tickIntervalRef.current = setInterval(() => {
      setElapsedMs(performance.now() - gameStartMsRef.current);
    }, 100);

    endTimeoutRef.current = setTimeout(() => {
      cleanupTimers();
      setPhase('result');
    }, GAME_DURATION_MS);
  }, [cleanupTimers, spawnItem]);

  // 컴포넌트 unmount 시 cleanup
  useEffect(() => () => cleanupTimers(), [cleanupTimers]);

  const remainingSec = Math.max(0, (GAME_DURATION_MS - elapsedMs) / 1000);

  return (
    <div className="catch-stage">
      <div className="catch-bg" aria-hidden="true" />
      <div className="catch-greenie" aria-hidden="true" />
      <div className="catch-circle" aria-hidden="true" />

      {phase === 'running' && activeItems.map((item) => (
        <FallingItem key={item.id} type={item.type} />
      ))}

      <div className="catch-ui-overlay">
        {phase === 'idle' && (
          <div className="catch-panel catch-panel-start">
            <h2 className="catch-title">⚔️ 장비 드롭의 시련</h2>
            <p>하늘에서 떨어지는 장비를 거치대(빨간 원) 위치에서 <b>→ 키</b>로 잡아라!</p>
            <button className="catch-btn catch-btn-primary" onClick={startGame} type="button">
              ▶ 시작 (Space)
            </button>
          </div>
        )}

        {phase === 'running' && (
          <div className="catch-hud">
            <div>남은 시간: {remainingSec.toFixed(1)}s</div>
          </div>
        )}

        {phase === 'result' && (
          <div className="catch-panel">
            <h2>임시 결과 (Task 5·6에서 완성)</h2>
            <button className="catch-btn" onClick={startGame} type="button">다시 도전</button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 브라우저 검증**

```bash
npm run dev
```

확인:
- 시작 버튼 클릭 → idle 패널 사라지고 상단에 "남은 시간: 10.0s" 카운트다운
- 약 0.8초 후부터 ⚔️/🛡️/🧪 아이콘이 화면 중앙 위에서 떨어지기 시작 (회전하면서)
- 각 아이템이 빨간 원을 통과해 아래로 흘러내림
- 5~6개 내외 아이템이 등장
- 약 10초 후 "임시 결과" 패널 표시
- "다시 도전" 클릭으로 새 게임 시작 가능
- 콘솔 에러 없음

`Ctrl+C`로 종료.

- [ ] **Step 3: Commit**

```bash
git add src/components/CatchGame/CatchGame.jsx
git commit -m "feat: 캐치 게임 running phase 게임 루프 및 아이템 스폰 구현 (#10)"
```

---

### Task 5: CatchGame.jsx — 입력 처리 + 캐치 판정

**Files:**
- Modify: `src/components/CatchGame/CatchGame.jsx`

- [ ] **Step 1: CatchGame.jsx 전체 교체 (입력/판정/점수/카운트 추가)**

`src/components/CatchGame/CatchGame.jsx` 전체를 다음으로 교체:

```jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GAME_DURATION_MS,
  FALL_DURATION_MS,
  STAGE_HEIGHT_PX,
  RED_CIRCLE_TOP_PX,
  HIT_RANGE_MAX,
  planSpawnTimes,
  pickRandomType,
  judgeHit,
  getItemY,
} from './catchUtils';
import FallingItem from './FallingItem';
import './CatchGame.css';

let nextItemId = 1;

export default function CatchGame() {
  const [phase, setPhase] = useState('idle');
  const [activeItems, setActiveItems] = useState([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [score, setScore] = useState(0);
  const [counts, setCounts] = useState({ perfect: 0, near: 0, fail: 0, miss: 0 });

  const gameStartMsRef = useRef(0);
  const spawnTimeoutsRef = useRef([]);
  const cleanupTimeoutsRef = useRef([]);
  const endTimeoutRef = useRef(null);
  const tickIntervalRef = useRef(null);
  const activeItemsRef = useRef([]);
  const phaseRef = useRef('idle');

  // ref 미러 동기화 (closure stale 방지)
  useEffect(() => { activeItemsRef.current = activeItems; }, [activeItems]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const removeItem = useCallback((id) => {
    setActiveItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const spawnItem = useCallback(() => {
    const id = nextItemId++;
    const spawnAt = performance.now() - gameStartMsRef.current;
    setActiveItems((prev) => [...prev, { id, type: pickRandomType(), spawnAt }]);
    // 화면 밖으로 나가면 miss 카운트 + 제거
    const tid = setTimeout(() => {
      setActiveItems((prev) => {
        const stillThere = prev.some((it) => it.id === id);
        if (stillThere) {
          setCounts((c) => ({ ...c, miss: c.miss + 1 }));
        }
        return prev.filter((it) => it.id !== id);
      });
    }, FALL_DURATION_MS + 300);
    cleanupTimeoutsRef.current.push(tid);
  }, []);

  const cleanupTimers = useCallback(() => {
    spawnTimeoutsRef.current.forEach(clearTimeout);
    cleanupTimeoutsRef.current.forEach(clearTimeout);
    spawnTimeoutsRef.current = [];
    cleanupTimeoutsRef.current = [];
    if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current);
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    endTimeoutRef.current = null;
    tickIntervalRef.current = null;
  }, []);

  const startGame = useCallback(() => {
    cleanupTimers();
    setActiveItems([]);
    setElapsedMs(0);
    setScore(0);
    setCounts({ perfect: 0, near: 0, fail: 0, miss: 0 });
    gameStartMsRef.current = performance.now();
    setPhase('running');

    const schedule = planSpawnTimes();
    spawnTimeoutsRef.current = schedule.map((t) => setTimeout(spawnItem, t));

    tickIntervalRef.current = setInterval(() => {
      setElapsedMs(performance.now() - gameStartMsRef.current);
    }, 100);

    endTimeoutRef.current = setTimeout(() => {
      cleanupTimers();
      setPhase('result');
    }, GAME_DURATION_MS);
  }, [cleanupTimers, spawnItem]);

  // 키보드 입력 (→ : 캐치, Space : 시작)
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (phaseRef.current !== 'running') return;
        const nowSinceStart = performance.now() - gameStartMsRef.current;
        const items = activeItemsRef.current;
        if (items.length === 0) return;  // 활성 아이템 없으면 무시 (페널티 X)

        // 빨간 원과 가장 가까운 활성 아이템 찾기
        let bestId = null;
        let bestDist = Infinity;
        for (const it of items) {
          const elapsed = nowSinceStart - it.spawnAt;
          if (elapsed < 0) continue;
          const y = getItemY(elapsed, STAGE_HEIGHT_PX, FALL_DURATION_MS);
          const dist = Math.abs(y - RED_CIRCLE_TOP_PX);
          if (dist < bestDist) {
            bestDist = dist;
            bestId = it.id;
          }
        }
        if (bestId === null) return;
        if (bestDist > HIT_RANGE_MAX) {
          // 사거리 밖 입력 — fail 카운트만 (점수 0)
          setCounts((c) => ({ ...c, fail: c.fail + 1 }));
          return;
        }
        const result = judgeHit(bestDist);
        setScore((s) => s + result.score);
        setCounts((c) => ({ ...c, [result.kind]: c[result.kind] + 1 }));
        removeItem(bestId);
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (phaseRef.current === 'idle' || phaseRef.current === 'result') {
          startGame();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [removeItem, startGame]);

  // 컴포넌트 unmount 시 cleanup
  useEffect(() => () => cleanupTimers(), [cleanupTimers]);

  const remainingSec = Math.max(0, (GAME_DURATION_MS - elapsedMs) / 1000);

  return (
    <div className="catch-stage">
      <div className="catch-bg" aria-hidden="true" />
      <div className="catch-greenie" aria-hidden="true" />
      <div className="catch-circle" aria-hidden="true" />

      {phase === 'running' && activeItems.map((item) => (
        <FallingItem key={item.id} type={item.type} />
      ))}

      <div className="catch-ui-overlay">
        {phase === 'idle' && (
          <div className="catch-panel catch-panel-start">
            <h2 className="catch-title">⚔️ 장비 드롭의 시련</h2>
            <p>하늘에서 떨어지는 장비를 거치대(빨간 원) 위치에서 <b>→ 키</b>로 잡아라!</p>
            <button className="catch-btn catch-btn-primary" onClick={startGame} type="button">
              ▶ 시작 (Space)
            </button>
          </div>
        )}

        {phase === 'running' && (
          <div className="catch-hud">
            <div>남은 시간: {remainingSec.toFixed(1)}s · 점수: {score}</div>
          </div>
        )}

        {phase === 'result' && (
          <div className="catch-panel">
            <h2>임시 결과 — 점수 {score} (Task 6에서 완성)</h2>
            <p>완벽: {counts.perfect} · 근접: {counts.near} · 실패: {counts.fail} · 놓침: {counts.miss}</p>
            <button className="catch-btn" onClick={startGame} type="button">다시 도전 (Space)</button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 브라우저 검증**

```bash
npm run dev
```

확인:
- 게임 시작 후 떨어지는 아이템이 빨간 원에 도달하는 순간 → 키 → 점수 추가, 아이템 즉시 사라짐
- 정확하게 누르면 +50, 근접 +20, 멀리 누르면 +0(fail 카운트만)
- 아이템 없을 때 → 키 누르면 변화 없음 (페널티 없음)
- 화면 밖으로 떨어진 아이템은 miss로 카운트
- 결과 화면에 점수와 카운트(완벽/근접/실패/놓침) 표시
- 화살표 키로 페이지 스크롤 안 됨
- Space로 재시작 가능
- 콘솔 에러 없음

`Ctrl+C`로 종료.

- [ ] **Step 3: Commit**

```bash
git add src/components/CatchGame/CatchGame.jsx
git commit -m "feat: 캐치 게임 입력 처리 및 캐치 판정 로직 구현 (#10)"
```

---

### Task 6: 결과 패널 완성 (등급/별점/통계)

**Files:**
- Modify: `src/components/CatchGame/CatchGame.jsx`
- Modify: `src/components/CatchGame/CatchGame.css`

- [ ] **Step 1: CatchGame.jsx — import 라인 교체 + result 블록 교체**

`src/components/CatchGame/CatchGame.jsx`의 상단 import 블록을 다음으로 교체:

```jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GAME_DURATION_MS,
  FALL_DURATION_MS,
  STAGE_HEIGHT_PX,
  RED_CIRCLE_TOP_PX,
  HIT_RANGE_MAX,
  planSpawnTimes,
  pickRandomType,
  judgeHit,
  getItemY,
  getCatchResult,
} from './catchUtils';
import FallingItem from './FallingItem';
import StarRating from '../TenSecondsGame/StarRating';
import './CatchGame.css';
```

그리고 기존 `{phase === 'result' && (...)}` 블록을 다음으로 교체:

```jsx
{phase === 'result' && (() => {
  const result = getCatchResult(score);
  const totalJudged = counts.perfect + counts.near + counts.fail + counts.miss;
  return (
    <div
      className="catch-panel catch-panel-result"
      style={{ '--catch-result-color': result.color }}
    >
      <div className="catch-grade-badge" data-grade={result.grade}>{result.grade}</div>
      <div className="catch-result-title" style={{ color: result.color }}>{result.title}</div>
      <StarRating count={result.stars} />

      <div className="catch-stats">
        <div className="catch-stat-row">
          <span>총점</span><span className="catch-stat-value">{score}</span>
        </div>
        <div className="catch-stat-row">
          <span>완벽 (50점)</span><span>{counts.perfect}</span>
        </div>
        <div className="catch-stat-row">
          <span>근접 (20점)</span><span>{counts.near}</span>
        </div>
        <div className="catch-stat-row">
          <span>실패 / 놓침</span><span>{counts.fail + counts.miss}</span>
        </div>
        <div className="catch-stat-row catch-stat-row-highlight">
          <span>판정 횟수</span><span>{totalJudged}</span>
        </div>
      </div>
      <p className="catch-result-desc">{result.desc}</p>

      <div className="catch-result-btns">
        <button className="catch-btn catch-btn-primary" onClick={startGame} type="button">
          ▶ 다시 도전 (Space)
        </button>
        <button className="catch-btn catch-btn-ghost" onClick={() => setPhase('idle')} type="button">
          ↩ 처음으로
        </button>
      </div>
    </div>
  );
})()}
```

- [ ] **Step 2: CatchGame.css — 결과 패널 스타일 추가**

`src/components/CatchGame/CatchGame.css` 끝에 추가:

```css
/* === 캐치 게임 — 결과 패널 === */
.catch-panel-result {
  border-color: var(--catch-result-color, #ffd700);
  min-width: 360px;
  max-width: 480px;
}

.catch-grade-badge {
  display: inline-block;
  padding: 6px 14px;
  font-weight: 800;
  letter-spacing: 1px;
  background: var(--catch-result-color, #ffd700);
  color: #0f0f1a;
  border-radius: 999px;
  margin-bottom: 8px;
  font-size: 12px;
}

.catch-result-title {
  font-size: 22px;
  font-weight: 800;
  margin: 8px 0 12px;
}

.catch-stats {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px 16px;
  margin: 12px 0;
  text-align: left;
}

.catch-stat-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 14px;
  color: #d0d0d0;
}

.catch-stat-row-highlight {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 6px;
  padding-top: 8px;
  font-weight: 700;
  color: #fff;
}

.catch-stat-value {
  color: #ffd700;
  font-weight: 700;
}

.catch-result-desc {
  font-size: 13px;
  color: #c0c0c0;
  margin: 12px 0 0;
}

.catch-result-btns {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 14px;
  flex-wrap: wrap;
}

.catch-btn-ghost {
  background: transparent;
  color: #f0f0f0;
  border: 2px solid #555;
}
```

- [ ] **Step 3: 브라우저 검증**

```bash
npm run dev
```

확인:
- 10초 후 결과 패널에 다음이 모두 보임:
  - 등급 배지 (LEGENDARY/RARE/COMMON/FAIL/DEAD 중 하나, 색상 적용)
  - 별점 (StarRating, 1번 게임과 동일 컴포넌트)
  - 총점 / 완벽 / 근접 / 실패+놓침 / 판정 횟수 통계
  - 등급별 설명 문구
  - "다시 도전" + "처음으로" 버튼
- "처음으로" 클릭 → idle 화면으로 복귀
- "다시 도전" 또는 Space → 새 게임 시작
- 적당히 잘 캐치하면 RARE 이상이 나옴 (만점 300점)

`Ctrl+C`로 종료.

- [ ] **Step 4: Commit**

```bash
git add src/components/CatchGame/CatchGame.jsx src/components/CatchGame/CatchGame.css
git commit -m "feat: 캐치 게임 결과 패널 (등급/별점/통계) 완성 (#10)"
```

---

### Task 7: 시각 폴리시 (HUD, 힌트, 펄스 효과)

**Files:**
- Modify: `src/components/CatchGame/CatchGame.jsx`
- Modify: `src/components/CatchGame/CatchGame.css`

- [ ] **Step 1: CatchGame.jsx — idle/running UI 텍스트 보강**

idle 패널 내부 — 기존:

```jsx
<h2 className="catch-title">⚔️ 장비 드롭의 시련</h2>
<p>하늘에서 떨어지는 장비를 거치대(빨간 원) 위치에서 <b>→ 키</b>로 잡아라!</p>
```

다음으로 교체:

```jsx
<h2 className="catch-title">⚔️ 장비 드롭의 시련</h2>
<p className="catch-subtitle">"흐름을 읽고 잡아내라!"</p>
<p>하늘에서 떨어지는 장비를 거치대(빨간 원) 위치에서 <b>→ 키</b>로 잡아라!</p>
<p className="catch-hint">검 ⚔️ · 방패 🛡️ · 포션 🧪 — 정확히 거치대 안에서 잡으면 50점</p>
```

running HUD — 기존:

```jsx
{phase === 'running' && (
  <div className="catch-hud">
    <div>남은 시간: {remainingSec.toFixed(1)}s · 점수: {score}</div>
  </div>
)}
```

다음으로 교체:

```jsx
{phase === 'running' && (
  <>
    <div className="catch-hud">
      <div className="catch-hud-row">
        <span>남은 시간</span><b>{remainingSec.toFixed(1)}s</b>
      </div>
      <div className="catch-hud-row">
        <span>점수</span><b>{score}</b>
      </div>
    </div>
    <div className="catch-running-hint">→ 키로 거치대에서 잡아라!</div>
  </>
)}
```

- [ ] **Step 2: CatchGame.css — 폴리시 추가**

`src/components/CatchGame/CatchGame.css` 끝에 추가:

```css
/* === 캐치 게임 — 폴리시 === */
.catch-subtitle {
  margin: 4px 0 12px;
  font-size: 14px;
  font-style: italic;
  color: #ffd700;
  opacity: 0.9;
}

.catch-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #c0c0c0;
}

/* HUD를 가로로 두 칸 분리 */
.catch-hud {
  padding: 10px 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 18px;
  background: rgba(0, 0, 0, 0.6);
}

.catch-hud-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 11px;
  letter-spacing: 0.6px;
}

.catch-hud-row b {
  font-size: 18px;
  color: #ffd700;
}

.catch-running-hint {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-family: system-ui, sans-serif;
  pointer-events: none;
  z-index: 10;
}

/* 빨간 원 펄스 효과 */
.catch-circle {
  animation: catch-circle-pulse 1.4s ease-in-out infinite;
}

@keyframes catch-circle-pulse {
  0%, 100% { box-shadow: 0 0 24px rgba(255, 90, 90, 0.7), inset 0 0 8px rgba(255, 255, 255, 0.4); }
  50%      { box-shadow: 0 0 36px rgba(255, 120, 120, 0.95), inset 0 0 10px rgba(255, 255, 255, 0.5); }
}
```

- [ ] **Step 3: 브라우저 검증**

```bash
npm run dev
```

확인:
- idle: 부제목 ("흐름을 읽고 잡아내라!") + 아이템 종류 힌트 표시
- running: HUD가 두 칸(남은 시간 / 점수)으로 정돈되어 표시
- 빨간 원이 부드럽게 펄스 (맥동) 애니메이션
- 화면 하단에 "→ 키로 거치대에서 잡아라!" 힌트 보임
- 시각 톤이 1·2번 게임과 어색하지 않음

`Ctrl+C`로 종료.

- [ ] **Step 4: Commit**

```bash
git add src/components/CatchGame/CatchGame.jsx src/components/CatchGame/CatchGame.css
git commit -m "feat: 캐치 게임 시각 폴리시 (HUD, 힌트, 펄스 효과) (#10)"
```

---

### Task 8: 최종 검증 (lint + build + 수동 end-to-end)

**Files:** (수정 없음, 검증만)

- [ ] **Step 1: Lint 통과 확인**

```bash
npm run lint
```

Expected: 캐치 게임 파일(`src/components/CatchGame/**`, `src/App.jsx`) 관련 에러 없음. 기존 파일의 사전 경고는 무시 가능.

문제가 발견되면 해당 파일을 수정 → 다시 lint. 자동수정 가능 항목은 `npm run lint -- --fix`.

- [ ] **Step 2: 프로덕션 빌드 통과 확인**

```bash
npm run build
```

Expected: 에러 없이 `dist/` 디렉토리 생성. 번들 사이즈 경고는 무시 가능.

- [ ] **Step 3: 수동 end-to-end 검증**

```bash
npm run dev
```

브라우저에서 다음 시나리오를 모두 확인:

1. **시작 흐름**: idle 화면에서 시작 버튼 클릭 OR Space → 게임 시작
2. **정상 캐치**: 떨어지는 아이템이 빨간 원에 도달했을 때 → 키 → 50/20/0점이 점수에 반영
3. **사거리 밖 입력**: 아이템이 한참 위/아래에 있을 때 → 키 → 점수 변화 없음, fail 카운트 +1
4. **놓침**: 아이템을 캐치하지 않고 흘려보내면 miss 카운트 +1
5. **종료**: 10초 후 결과 패널 자동 표시
6. **결과 통계**: 총점, 완벽/근접/실패+놓침/판정횟수, 등급, 별점, 설명 모두 표시
7. **재시작**: "다시 도전" 또는 Space → 새 게임 / "처음으로" → idle 화면
8. **키 스크롤 방지**: 게임 진행 중 → 키로 페이지 스크롤되지 않음
9. **다른 게임 회귀 없음**: 1번(10초)과 2번(색상반응)이 정상 동작
10. **콘솔 에러**: 게임 사이클을 3회 반복해도 콘솔에 에러/경고 없음

`Ctrl+C`로 종료.

- [ ] **Step 4: 푸시 + PR 생성 안내**

```bash
git push -u origin "20260503_#10_캐치_게임_3번_구현"
```

PR 생성 (사용자 승인 후 실행):

```bash
gh pr create --title "feat: 캐치 게임(3번) 구현 (#10)" --body "$(cat <<'EOF'
## Summary
- PRD §2.3 캐치 미니게임 구현 ("장비 드롭" 컨셉)
- 무방비 그린이 sprite + world.png 배경 적용
- 1·2번 게임과 일관된 phase state machine + 등급/별점 결과 패널
- 4번 병렬 게임에서 재사용 가능한 utils + FallingItem 구조

## Test plan
- [x] Lint 통과 (`npm run lint`)
- [x] Build 통과 (`npm run build`)
- [x] 시작 → 캐치 → 결과 사이클 정상
- [x] 정확/근접/실패/놓침 판정 정확
- [x] → 키 페이지 스크롤 방지
- [x] 다시도전/처음으로 동작
- [x] 1·2번 게임 회귀 없음

Closes #10
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

스펙 문서(`docs/superpowers/specs/2026-05-03-catch-game-design.md`)의 각 섹션과 task 매핑:

- §1 개요 → Task 3, 8 (Stage + App.jsx 연결, 최종 검증)
- §2 컨셉/시각 (배경/sprite/원/UI) → Task 3 (스테이지), Task 7 (폴리시)
- §3 게임 룰 → Task 1 (상수), Task 4 (룰 적용), Task 5 (판정)
- §4 컴포넌트 구조 (4파일) → Task 1·2·3 (모두 생성)
- §5 데이터 흐름 → Task 4 (게임 루프), Task 5 (입력→점수→종료)
- §6 키 입력 (→/Space, preventDefault, cleanup) → Task 5
- §7 4번 호환성 (utils + FallingItem 재사용 구조) → Task 1·2
- §8 In-Scope → 전부 커버. Out-of-scope는 의도적으로 제외.
- §9 검증 기준 → Task 8 (모든 항목 포함)
- §10 위험 (즉석 계산 방식) → Task 5에서 채택 (RAF 없이 입력 시점 계산)

✅ 모든 spec 요구사항이 task로 매핑됨.

### 2. Placeholder scan

- "TBD"/"TODO"/"implement later" 검색 결과: 없음
- "임시 결과 (Task 5·6에서 완성)" 문구: Task 4에서 의도적 placeholder로, Task 5에서 카운트 추가, Task 6에서 완전 교체 — 명시적이고 일관됨
- 모든 step에 실제 코드/명령/예상 결과 포함

✅ Placeholder 없음.

### 3. Type / 시그니처 일관성

- `judgeHit(distancePx) => { score, kind }` — Task 1 정의, Task 5 사용 (`result.score`, `result.kind`) ✓
- `getCatchResult(totalScore) => { grade, title, desc, color, stars }` — Task 1 정의, Task 6 사용 ✓
- `planSpawnTimes(durationMs?, count?, minGapMs?, maxGapMs?, firstAtMs?, fallMs?) => number[]` — Task 1 정의, Task 4·5 인자 없이 호출 ✓
- `getItemY(elapsedSinceSpawnMs, stageHeightPx?, fallDurationMs?) => number` — Task 1 정의, Task 5 사용 ✓
- `pickRandomType() => 'sword'|'shield'|'potion'` — Task 1 정의, Task 4·5 사용 ✓
- `FallingItem` props: `{ type, fallDurationMs?, speedMultiplier? }` — Task 2 정의, Task 4·5에서 `type`만 전달 ✓
- `counts` 형태: `{ perfect, near, fail, miss }` — Task 5 정의, Task 6 결과 패널에서 모두 사용 ✓
- `StarRating` props: `{ count }` — 기존 컴포넌트 (`src/components/TenSecondsGame/StarRating.jsx`) 그대로 사용 ✓
- 상수 이름: `RED_CIRCLE_TOP_PX`, `STAGE_HEIGHT_PX`, `FALL_DURATION_MS`, `HIT_RANGE_MAX` — 모든 task에서 동일 이름으로 사용 ✓

✅ 시그니처/이름 일관성 OK.
