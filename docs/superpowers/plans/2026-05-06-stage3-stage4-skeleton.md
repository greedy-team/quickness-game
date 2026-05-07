# Stage 3 풀 구현 + Stage 4 3분할 뼈대 + Sub-Stage Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stage 3(캐치) 메커닉을 양궁형 캐치 존 + 6개 아이템 10초 낙하로 풀 구현하고, 같은 컴포넌트가 단독 모드와 Stage 4의 한 칸에서 모두 동작하도록 sub-stage contract를 합의하며, Stage 4의 3분할 호스트·점수 집계·1초 합체 골격을 마련한다.

**Architecture:** 모든 sub-stage(Stage1/2/3)는 `<StageNGame mode="standalone|split" isRunning onResult />` 동일 시그니처를 따른다. Stage 3는 `<Stage3Intro/>` + `<Stage3Field/>` 조합으로 인트로(Space 시작) 후 낙하 시퀀스를 진행하며 `metric: 0(완벽)~1(최악)` 정규화된 결과를 onResult로 반환한다. Stage 4는 `<Stage4Host>`가 통합 인트로 → 3 sub-stage 동시 isRunning 신호 → 3개 onResult 평균 → 1초 합체 → 호스트 onResult로 전이한다. 모든 튜닝 변수는 `src/stages/stage3/stage3.config.js`와 `src/scoring.js`의 `STAGE_SCORE_TIERS`에 외부화한다.

**Tech Stack:** React 19 + Vite 8 + react-router-dom v7 + Zustand v5. 기존 #20 뼈대 기반.

**Spec:** `docs/superpowers/specs/2026-05-06-stage3-stage4-skeleton-design.md`

**Branch:** `20260506_#23_Stage_3_캐치_풀_구현_Stage_4_3분할_뼈대_sub_stage_통합_인터페이스_정의`

---

## Pre-Flight 상태 (시작 전 확인)

**현재 worktree 상태 (브랜치 분기 후 사용자가 추가한 미커밋 변경)**
- `M src/assets.js` — 이미 `openDoor` 사운드 추가됨 (Hub에서 문 클릭 시 재생용)
- `M src/routes/HubPage/HubPage.jsx` — `openDoor` SFX 호출 로직 추가됨
- `M public/assets/sounds/bgm.mp3` — 사용자가 BGM 파일 교체 (binary 변경)
- `?? public/assets/sounds/open_door_sound.mp3` — openDoor SFX 파일 신규
- `?? public/assets/images/memory_real_{1,2,3}.png` — Stage 3 진짜 기억 자산
- `?? public/assets/images/memory_fake_{1,2,3}.png` — Stage 3 가짜 기억 자산
- `?? .issues/20260506_기능추가_Stage3_캐치_풀구현_Stage4_3분할_뼈대.md` — 본 이슈 문서

위 변경분은 본 이슈 작업의 사전 준비물이므로 Task 0에서 정리한 후 본 작업 시작.

**참고 명령**
- 개발 서버: `npm run dev`
- 빌드 검증: `npm run build` (lint은 init 커밋부터 환경 깨짐 — 별도 이슈 처리)
- 작업 디렉터리: `/Users/luca/workspace/greedy/quickness-game`

---

## Task 0: Pre-flight — 사전 작업 커밋

**Files:**
- Stage: `.issues/20260506_기능추가_Stage3_캐치_풀구현_Stage4_3분할_뼈대.md`
- Stage: `src/assets.js` (openDoor sound)
- Stage: `src/routes/HubPage/HubPage.jsx` (openDoor 호출)
- Stage: `public/assets/sounds/open_door_sound.mp3`
- Stage: `public/assets/sounds/bgm.mp3` (교체)
- Stage: `public/assets/images/memory_real_{1,2,3}.png`
- Stage: `public/assets/images/memory_fake_{1,2,3}.png`

- [ ] **Step 1: 이슈 문서 + Stage 3 자산 커밋**

```bash
git add .issues/20260506_기능추가_Stage3_캐치_풀구현_Stage4_3분할_뼈대.md \
        public/assets/images/memory_real_1.png \
        public/assets/images/memory_real_2.png \
        public/assets/images/memory_real_3.png \
        public/assets/images/memory_fake_1.png \
        public/assets/images/memory_fake_2.png \
        public/assets/images/memory_fake_3.png
git commit -m "docs: Stage 3·4 뼈대 이슈 + 진짜/가짜 기억 자산 추가 #23"
```

- [ ] **Step 2: openDoor SFX 기능 커밋**

```bash
git add src/assets.js \
        src/routes/HubPage/HubPage.jsx \
        public/assets/sounds/open_door_sound.mp3 \
        public/assets/sounds/bgm.mp3
git commit -m "feat: 허브 문 클릭 시 SFX 재생 + BGM 파일 교체 #23"
```

- [ ] **Step 3: 상태 검증**

```bash
git status -s
```

Expected: 출력 비어있음 (clean working tree).

```bash
git log --oneline -3
```

Expected: 최근 3개가 차례로:
- `feat: 허브 문 클릭 시 SFX 재생 + BGM 파일 교체 #23`
- `docs: Stage 3·4 뼈대 이슈 + 진짜/가짜 기억 자산 추가 #23`
- `docs: Stage 3 풀구현 + Stage 4 3분할 뼈대 + sub-stage contract 설계 문서 #23`

---

## Task 1: 기반 — assets.js 갱신 + scoring tier + sub-stage contract 가이드

**Files:**
- Modify: `src/assets.js`
- Modify: `src/scoring.js`
- Create: `docs/superpowers/sub-stage-contract.md`

- [ ] **Step 1: `src/assets.js` 갱신 — memory 배열 추가**

기존 `ASSETS.images` 객체에 두 배열 키를 추가. 다른 기존 키(`hubCorridor`, `door`, `doorClear`, `cutsceneOpening`, `bgm`, `openDoor`)는 그대로 유지.

전체 파일 내용:

```js
// src/assets.js
// public/ 하위 파일은 절대경로로 그대로 서빙됨 (Vite 표준).

export const ASSETS = {
  images: {
    hubCorridor:     '/assets/images/bg_hub_corridor.png',
    door:            '/assets/images/door.png',
    doorClear:       '/assets/images/door_clear.png',
    cutsceneOpening: '/assets/images/cutscene_opening.png',
    memoryReal: [
      '/assets/images/memory_real_1.png',
      '/assets/images/memory_real_2.png',
      '/assets/images/memory_real_3.png',
    ],
    memoryFake: [
      '/assets/images/memory_fake_1.png',
      '/assets/images/memory_fake_2.png',
      '/assets/images/memory_fake_3.png',
    ],
  },
  sounds: {
    bgm:      '/assets/sounds/bgm.mp3',
    openDoor: '/assets/sounds/open_door_sound.mp3',
  },
};
```

- [ ] **Step 2: `src/scoring.js` 갱신 — Stage 3·4 tier 채움**

기존 `STAGE_SCORE_TIERS`의 `3:[]`, `4:[]` 두 슬롯만 채움. `1:[]`, `2:[]`은 팀원 작업 대기로 빈 배열 유지.

전체 파일 내용:

```js
// src/scoring.js
// PRD §13 Tunable. 배열은 maxAbsError 오름차순 정렬 (앞에서부터 매칭).

export const STAGE_SCORE_TIERS = {
  1: [],   // 팀원 작업 대기
  2: [],   // 팀원 작업 대기
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
 * stageId의 metric에 해당하는 점수를 반환.
 * - tier가 비어 있으면 0 반환.
 * - metric의 절댓값이 가장 작은 tier(가장 정확)부터 매칭.
 * - 잘못된 stageId / NaN / 비숫자 metric은 0 반환.
 */
export function scoreFromMetric(stageId, metric) {
  const tiers = STAGE_SCORE_TIERS[stageId];
  if (!tiers || tiers.length === 0) return 0;
  if (typeof metric !== 'number' || Number.isNaN(metric)) return 0;

  const absError = Math.abs(metric);
  const tier = tiers.find((t) => absError <= t.maxAbsError);
  return tier?.points ?? 0;
}
```

- [ ] **Step 3: `docs/superpowers/sub-stage-contract.md` 작성**

팀원이 Stage 1·2를 만들 때 참조할 가이드 문서.

```markdown
# Sub-Stage Contract — Stage 1·2·3 컴포넌트 인터페이스

**대상 독자**: Stage 1(괘종시계) 또는 Stage 2(반응속도)를 구현하는 팀원

**선행 조건**: PRD v6 §4 + spec `docs/superpowers/specs/2026-05-06-stage3-stage4-skeleton-design.md` §3 숙지

## 컴포넌트 시그니처 (필수)

\`\`\`jsx
<StageNGame
  mode="standalone" | "split"
  isRunning={boolean}
  onResult={(metric: number) => void}
/>
\`\`\`

## 모드별 책임 분담

| 책임 | standalone | split |
|---|---|---|
| 인트로 화면 | 본인이 표시 + Space 대기 | Stage4Host가 통합 인트로 |
| 시작 트리거 | 본인이 직접 `Space` 키 listen | `isRunning=true` prop 신호 |
| 게임 진행 | 본인 | 본인 |
| 종료 | `onResult(metric)` | `onResult(metric)` |
| 사이즈 | 풀스크린 | ~33% 폭, 스케일 다운 |

## State Machine

\`\`\`
[mounted]
   ↓
[idle]       standalone: 인트로 표시 + Space 대기
              split:      조용히 마운트만
   ↓ (Space 또는 isRunning=true)
[running]    게임 진행
   ↓ (자동 종료)
[done]       onResult(metric) 호출
\`\`\`

## metric 정규화 규칙 (필수)

- `metric = 0.0` → 완벽 플레이
- `metric = 1.0` → 최악 (전부 미스/페널티)
- `0 ≤ metric ≤ 1` 범위 보장 (clamp 권장)
- 호스트가 `STAGE_SCORE_TIERS[N]`로 stage 총점 매핑 — 본인이 직접 점수 산출 안 함

## 키 충돌 방지

- Stage 1: `←`만 listen
- Stage 2: `↑`만 listen
- Stage 3: `→`만 listen
- 다른 키는 무시 (3분할에서 한 키보드 동시 입력 가능해야 함)
- `Space`는 호스트 시작 트리거 — running 중에는 무시

## "이렇게 만들면 plug-in OK" 체크리스트

- [ ] `mode` prop 받아서 standalone일 때만 본인 인트로 표시
- [ ] `isRunning` prop 받아서 split 모드 시작 신호로 사용
- [ ] `onResult` 콜백을 종료 시 정확히 1회 호출
- [ ] 반환 metric이 0~1 범위 (1을 초과하지 않도록 clamp)
- [ ] 자기 키 외 다른 키 입력 무시
- [ ] 스타일이 ~33% 폭에서도 안 깨짐 (relative units 사용)
- [ ] `STAGE_SCORE_TIERS[N]` 채움 (`src/scoring.js`)
- [ ] tunable 상수는 `src/stages/stage{N}/stage{N}.config.js`에 외부화

## 참조 예시

Stage 3 (`src/stages/stage3/Stage3Game.jsx`)이 본 contract를 따른 reference 구현. 같은 패턴으로 작성 권장.
```

- [ ] **Step 4: 빌드 검증**

```bash
npm run build
```

Expected: 성공, 0 warnings.

- [ ] **Step 5: 커밋**

```bash
git add src/assets.js src/scoring.js docs/superpowers/sub-stage-contract.md
git commit -m "feat: Stage 3·4 점수 tier + memory 자산 등록 + sub-stage contract 가이드 #23"
```

---

## Task 2: Stage 3 config + 시각 leaf 컴포넌트 (CatchZone, FallingItem, ResultPopup)

**Files:**
- Create: `src/stages/stage3/stage3.config.js`
- Create: `src/stages/stage3/CatchZone.jsx`
- Create: `src/stages/stage3/CatchZone.css`
- Create: `src/stages/stage3/FallingItem.jsx`
- Create: `src/stages/stage3/FallingItem.css`
- Create: `src/stages/stage3/ResultPopup.jsx`
- Create: `src/stages/stage3/ResultPopup.css`

- [ ] **Step 1: `src/stages/stage3/stage3.config.js` 작성**

```js
// src/stages/stage3/stage3.config.js
// PRD §13 Tunable. 모든 게임 숫자가 이 한 파일에 외부화됨.

export const STAGE3_CONFIG = {
  durationSec:       10,      // 낙하 시퀀스 총 시간
  itemCount:         6,       // 아이템 개수
  realCount:         4,       // 진짜 기억 (나머지 = fakeCount = 2)
  fallDurationSec:   2.0,     // 한 아이템이 화면 위→아래까지
  catchZoneRatio:    0.25,    // 캐치 존 높이 (화면 대비)
  spawnIntervalJitterSec: 0.3,
  horizontalRandomRatio:  0.2, // 중앙 ±20%
  seed:              null,    // null = 매 플레이 timestamp 사용

  // 캐치 존 내 정확도 tier (per-item points)
  // maxOffset: 0=중심, 1=캐치 존 가장자리
  accuracyTiers: [
    { maxOffset: 0.05, points: 100, label: 'PERFECT', color: '#FFD700' },
    { maxOffset: 0.15, points: 80,  label: 'GREAT',   color: '#FF4444' },
    { maxOffset: 0.30, points: 60,  label: 'GOOD',    color: '#FFCC00' },
    { maxOffset: 0.50, points: 40,  label: 'OK',      color: '#FFEE88' },
    { maxOffset: 1.00, points: 20,  label: 'BARE',    color: '#AAAAAA' },
  ],

  fakePenalty: -50,   // fake 캐치 시
  missScore:    0,    // real 미입력 / 캐치 존 밖 입력
};
```

- [ ] **Step 2: `src/stages/stage3/CatchZone.jsx` 작성**

```jsx
// 양궁형 캐치 존 — 화면 중앙 가로 띠, 5단 색대.
// 시각 전용 컴포넌트, 입력·점수 로직 없음.
import { STAGE3_CONFIG } from './stage3.config.js';
import './CatchZone.css';

export default function CatchZone() {
  const tiers = STAGE3_CONFIG.accuracyTiers;

  return (
    <div className="catch-zone" aria-hidden="true">
      {/* tier 색대 — 중심으로부터 바깥으로 그라디언트.
          maxOffset이 큰 tier부터 그려서 작은 tier가 위에 쌓이도록. */}
      {[...tiers].reverse().map((tier) => (
        <div
          key={tier.label}
          className={`catch-zone__band catch-zone__band--${tier.label.toLowerCase()}`}
          style={{
            backgroundColor: tier.color,
            height: `${tier.maxOffset * 100}%`,
          }}
        />
      ))}
      {/* 중심선 */}
      <div className="catch-zone__center-line" />
    </div>
  );
}
```

- [ ] **Step 3: `src/stages/stage3/CatchZone.css` 작성**

```css
.catch-zone {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 25%;            /* STAGE3_CONFIG.catchZoneRatio = 0.25 와 일치 */
  pointer-events: none;
}

.catch-zone__band {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.35;
}

.catch-zone__band--perfect { opacity: 0.55; }
.catch-zone__band--great   { opacity: 0.40; }
.catch-zone__band--good    { opacity: 0.30; }
.catch-zone__band--ok      { opacity: 0.22; }
.catch-zone__band--bare    { opacity: 0.15; }

.catch-zone__center-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 2px;
  background: #fff;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.7);
  transform: translateY(-50%);
}
```

- [ ] **Step 4: `src/stages/stage3/FallingItem.jsx` 작성**

```jsx
// 단일 낙하 아이템. 부모(Stage3Field)가 위치·종류 결정, 본인은 시각 표시만.
import './FallingItem.css';

export default function FallingItem({ src, kind, leftPercent, topPercent }) {
  return (
    <img
      className={`falling-item falling-item--${kind}`}
      src={src}
      alt=""
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
      }}
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 5: `src/stages/stage3/FallingItem.css` 작성**

```css
.falling-item {
  position: absolute;
  width: 80px;
  height: 80px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6));
  will-change: top, left;
}

.falling-item--real {
  filter: drop-shadow(0 0 8px rgba(255, 220, 150, 0.7));
}

.falling-item--fake {
  filter: drop-shadow(0 0 8px rgba(255, 60, 60, 0.7));
}
```

- [ ] **Step 6: `src/stages/stage3/ResultPopup.jsx` 작성**

```jsx
// 캐치/미스/페널티 직후 0.4초간 표시되는 텍스트 팝업.
// 부모가 visible/label/color/key를 바꿔서 매번 새 인스턴스로 강제 리렌더.
import './ResultPopup.css';

export default function ResultPopup({ visible, label, color }) {
  if (!visible) return null;
  return (
    <div className="result-popup" style={{ color }}>
      {label}
    </div>
  );
}
```

- [ ] **Step 7: `src/stages/stage3/ResultPopup.css` 작성**

```css
.result-popup {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 48px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-shadow: 0 0 12px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  animation: result-popup-fade 0.4s ease-out forwards;
}

@keyframes result-popup-fade {
  0%   { opacity: 0; transform: translate(-50%, -40%) scale(0.8); }
  20%  { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
  60%  { opacity: 1; transform: translate(-50%, -50%) scale(1.0); }
  100% { opacity: 0; transform: translate(-50%, -60%) scale(1.0); }
}
```

- [ ] **Step 8: 빌드 검증**

```bash
npm run build
```

Expected: 성공, 0 warnings.

- [ ] **Step 9: 커밋**

```bash
git add src/stages/stage3/stage3.config.js \
        src/stages/stage3/CatchZone.jsx \
        src/stages/stage3/CatchZone.css \
        src/stages/stage3/FallingItem.jsx \
        src/stages/stage3/FallingItem.css \
        src/stages/stage3/ResultPopup.jsx \
        src/stages/stage3/ResultPopup.css
git commit -m "feat: Stage 3 config + 시각 leaf 컴포넌트(CatchZone, FallingItem, ResultPopup) #23"
```

---

## Task 3: Stage 3 Field — 게임 로직 코어

**Files:**
- Create: `src/stages/stage3/Stage3Field.jsx`
- Create: `src/stages/stage3/Stage3Field.css`

`Stage3Field`는 낙하 시퀀스·정확도 측정·점수 누적·결과 팝업 트리거의 코어 로직을 담당. `mode`/`isRunning`/`onResult` 시그니처를 받지만, 본 컴포넌트는 인트로를 다루지 않음 (Stage3Game이 인트로 + Field를 조합).

- [ ] **Step 1: `Stage3Field.jsx` 작성**

```jsx
// src/stages/stage3/Stage3Field.jsx
// 낙하 시퀀스 + → 입력 처리 + 정확도 측정 + 점수 누적.
// running 상태에서만 동작. 종료 시 onResult(metric: 0~1) 호출.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { STAGE3_CONFIG } from './stage3.config.js';
import { ASSETS } from '../../assets.js';
import CatchZone from './CatchZone.jsx';
import FallingItem from './FallingItem.jsx';
import ResultPopup from './ResultPopup.jsx';
import './Stage3Field.css';

// 시드 기반 PRNG (mulberry32) — 결정적 시퀀스용
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 결정적 아이템 시퀀스 생성
// 반환: [{ kind: 'real'|'fake', imgSrc, spawnAt: sec, horizontalPct }]
function buildSequence(config) {
  const seed = config.seed ?? Date.now();
  const rand = mulberry32(seed);
  const fakeCount = config.itemCount - config.realCount;

  // 종류 배열 (real/fake) — 연속 같은 타입 3+ 회피하면서 섞기
  const kinds = [];
  let realLeft = config.realCount;
  let fakeLeft = fakeCount;
  let lastKind = null;
  let sameStreak = 0;

  for (let i = 0; i < config.itemCount; i++) {
    let pickReal;
    if (realLeft === 0) pickReal = false;
    else if (fakeLeft === 0) pickReal = true;
    else if (sameStreak >= 2) pickReal = (lastKind !== 'real'); // 강제 변경
    else pickReal = rand() < (realLeft / (realLeft + fakeLeft));

    const kind = pickReal ? 'real' : 'fake';
    kinds.push(kind);
    if (kind === 'real') realLeft--; else fakeLeft--;
    if (kind === lastKind) sameStreak++; else { sameStreak = 1; lastKind = kind; }
  }

  // 스폰 시각 — 등간격 + jitter
  const baseInterval = config.durationSec / config.itemCount;
  const jitter = config.spawnIntervalJitterSec;

  return kinds.map((kind, i) => {
    const offset = (rand() * 2 - 1) * jitter;
    const spawnAt = Math.max(0, i * baseInterval + offset);
    const horizontalPct = 50 + (rand() * 2 - 1) * config.horizontalRandomRatio * 100;
    const pool = kind === 'real' ? ASSETS.images.memoryReal : ASSETS.images.memoryFake;
    const imgSrc = pool[Math.floor(rand() * pool.length)];
    return { kind, imgSrc, spawnAt, horizontalPct };
  });
}

// 정확도 offset → tier 매칭 → per-item 점수
function pointsForOffset(absOffset, tiers) {
  const tier = tiers.find((t) => absOffset <= t.maxOffset);
  return tier ? { points: tier.points, label: tier.label, color: tier.color } : { points: 0, label: 'MISS', color: '#888' };
}

export default function Stage3Field({ isRunning, onResult }) {
  const config = STAGE3_CONFIG;
  const sequence = useMemo(() => buildSequence(config), [config]);

  // 활성 아이템 상태 — { id, kind, imgSrc, spawnAt, horizontalPct, topPercent, status }
  // status: 'falling' | 'caught' | 'missed'
  const [items, setItems] = useState([]);
  const [popup, setPopup] = useState({ visible: false, label: '', color: '', key: 0 });

  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const totalPointsRef = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const popupKeyRef = useRef(0);
  const showPopup = useCallback((label, color) => {
    popupKeyRef.current += 1;
    setPopup({ visible: true, label, color, key: popupKeyRef.current });
    setTimeout(() => {
      setPopup((prev) => prev.key === popupKeyRef.current ? { ...prev, visible: false } : prev);
    }, 400);
  }, []);

  // running 시작 — start time 기록 + RAF 시작
  useEffect(() => {
    if (!isRunning) return;
    startTimeRef.current = performance.now();
    totalPointsRef.current = 0;
    setItems(sequence.map((s, idx) => ({
      id: idx,
      ...s,
      topPercent: -10,            // 화면 위 시작
      status: 'falling',
    })));

    const tick = () => {
      const now = performance.now();
      const elapsed = (now - startTimeRef.current) / 1000;

      setItems((prev) => prev.map((it) => {
        if (it.status !== 'falling') return it;
        const localT = elapsed - it.spawnAt;
        if (localT < 0) return { ...it, topPercent: -10 };
        if (localT > config.fallDurationSec) {
          // 화면 밖으로 떨어짐 — 캐치 안 됨
          if (it.kind === 'real') totalPointsRef.current += config.missScore;
          // fake는 통과해도 0점 (정상)
          return { ...it, status: 'missed', topPercent: 110 };
        }
        const topPercent = -10 + (localT / config.fallDurationSec) * 120; // -10% → 110%
        return { ...it, topPercent };
      }));

      // 종료 조건 — 마지막 아이템의 spawnAt + fallDuration + 0.5초 마진
      const lastEnd = sequence[sequence.length - 1].spawnAt + config.fallDurationSec + 0.5;
      if (elapsed >= lastEnd) {
        // metric 산출
        const maxPossible = config.realCount * config.accuracyTiers[0].points;
        const ratio = Math.max(0, Math.min(1, totalPointsRef.current / maxPossible));
        const metric = 1 - ratio;
        cancelAnimationFrame(rafRef.current);
        onResult(metric);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isRunning, sequence, config, onResult]);

  // → 입력 처리 — 캐치 존 안의 가장 가까운 아이템 캐치
  useEffect(() => {
    if (!isRunning) return;

    const handleKeyDown = (e) => {
      if (e.code !== 'ArrowRight') return;
      e.preventDefault();

      // 캐치 존 = 화면 50% ± (catchZoneRatio/2 × 100%)
      const zoneCenter = 50;
      const zoneHalf = config.catchZoneRatio / 2 * 100;
      const zoneTop = zoneCenter - zoneHalf;
      const zoneBottom = zoneCenter + zoneHalf;

      // 존 안 falling 아이템 중 중심선에 가장 가까운 것 찾기
      const candidates = itemsRef.current.filter(
        (it) => it.status === 'falling' && it.topPercent >= zoneTop && it.topPercent <= zoneBottom
      );
      if (candidates.length === 0) return; // 존 밖 입력 — 무시 (페널티 없음)

      const target = candidates.reduce((best, it) => {
        const itDist = Math.abs(it.topPercent - zoneCenter);
        const bestDist = Math.abs(best.topPercent - zoneCenter);
        return itDist < bestDist ? it : best;
      });

      // offset 계산 — 0 ~ 1 (zoneHalf 기준 정규화)
      const absOffset = Math.abs(target.topPercent - zoneCenter) / zoneHalf;

      if (target.kind === 'real') {
        const { points, label, color } = pointsForOffset(absOffset, config.accuracyTiers);
        totalPointsRef.current += points;
        showPopup(label, color);
      } else {
        totalPointsRef.current += config.fakePenalty;
        showPopup('INCORRECT', '#FF3333');
      }

      setItems((prev) => prev.map(
        (it) => it.id === target.id ? { ...it, status: 'caught' } : it
      ));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, config, showPopup]);

  return (
    <div className="stage3-field">
      <CatchZone />
      {items.map((it) => (
        it.status === 'falling' && (
          <FallingItem
            key={it.id}
            src={it.imgSrc}
            kind={it.kind}
            leftPercent={it.horizontalPct}
            topPercent={it.topPercent}
          />
        )
      ))}
      <ResultPopup visible={popup.visible} label={popup.label} color={popup.color} />
    </div>
  );
}
```

- [ ] **Step 2: `Stage3Field.css` 작성**

```css
.stage3-field {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, #0a0a14 0%, #1a1a2e 50%, #0a0a14 100%);
}
```

- [ ] **Step 3: 빌드 검증**

```bash
npm run build
```

Expected: 성공, 0 warnings.

- [ ] **Step 4: 커밋**

```bash
git add src/stages/stage3/Stage3Field.jsx src/stages/stage3/Stage3Field.css
git commit -m "feat: Stage3Field — 낙하 시퀀스 + 정확도 측정 + 점수 누적 #23"
```

---

## Task 4: Stage 3 Intro + Stage3Game entry

**Files:**
- Create: `src/stages/stage3/Stage3Intro.jsx`
- Create: `src/stages/stage3/Stage3Intro.css`
- Create: `src/stages/stage3/Stage3Game.jsx`
- Create: `src/stages/stage3/Stage3Game.css`

- [ ] **Step 1: `Stage3Intro.jsx` 작성**

```jsx
// 인트로 화면 — real/fake 미리보기 + Space 안내.
// standalone 모드에서만 사용. split 모드에서는 호스트가 통합 인트로.
import { ASSETS } from '../../assets.js';
import './Stage3Intro.css';

export default function Stage3Intro() {
  return (
    <div className="stage3-intro">
      <h1 className="stage3-intro__title">⚠️ 기억의 조각이 떨어진다</h1>

      <div className="stage3-intro__group">
        <p className="stage3-intro__label stage3-intro__label--real">✅ 진짜 기억 — 받기 (→)</p>
        <div className="stage3-intro__row">
          {ASSETS.images.memoryReal.map((src) => (
            <img key={src} className="stage3-intro__thumb" src={src} alt="" />
          ))}
        </div>
      </div>

      <div className="stage3-intro__group">
        <p className="stage3-intro__label stage3-intro__label--fake">❌ 가짜 기억 — 피하기 (누르지 않음)</p>
        <div className="stage3-intro__row">
          {ASSETS.images.memoryFake.map((src) => (
            <img key={src} className="stage3-intro__thumb" src={src} alt="" />
          ))}
        </div>
      </div>

      <p className="stage3-intro__cta">▶ 준비되면 [Space] 누르기</p>
    </div>
  );
}
```

- [ ] **Step 2: `Stage3Intro.css` 작성**

```css
.stage3-intro {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 32px;
  text-align: center;
  background: rgba(0, 0, 0, 0.65);
  z-index: 10;
}

.stage3-intro__title {
  font-size: clamp(24px, 3vw, 40px);
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.stage3-intro__group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.stage3-intro__label {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.stage3-intro__label--real { color: #88dd88; }
.stage3-intro__label--fake { color: #ff8888; }

.stage3-intro__row {
  display: flex;
  gap: 12px;
}

.stage3-intro__thumb {
  width: 72px;
  height: 72px;
  object-fit: contain;
}

.stage3-intro__cta {
  margin-top: 12px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.08em;
  animation: stage3-intro-pulse 1.4s ease-in-out infinite;
}

@keyframes stage3-intro-pulse {
  0%, 100% { opacity: 0.7; }
  50%      { opacity: 1.0; }
}
```

- [ ] **Step 3: `Stage3Game.jsx` 작성**

```jsx
// Stage 3 entry — sub-stage contract 진입점.
// state machine: idle → running → done
// standalone: 본인 인트로 + Space listen / split: isRunning prop 신호

import { useEffect, useState } from 'react';
import Stage3Intro from './Stage3Intro.jsx';
import Stage3Field from './Stage3Field.jsx';
import './Stage3Game.css';

export default function Stage3Game({ mode = 'standalone', isRunning, onResult }) {
  // local phase: 'idle' | 'running' | 'done'
  const [phase, setPhase] = useState('idle');

  // standalone: Space 키로 self-trigger
  useEffect(() => {
    if (mode !== 'standalone') return;
    if (phase !== 'idle') return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setPhase('running');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, phase]);

  // split: isRunning prop watch
  useEffect(() => {
    if (mode !== 'split') return;
    if (isRunning && phase === 'idle') setPhase('running');
  }, [mode, isRunning, phase]);

  const handleFieldDone = (metric) => {
    setPhase('done');
    onResult(metric);
  };

  return (
    <div className={`stage3-game stage3-game--${mode}`}>
      {phase === 'idle' && mode === 'standalone' && <Stage3Intro />}
      {(phase === 'running' || phase === 'done') && (
        <Stage3Field
          isRunning={phase === 'running'}
          onResult={handleFieldDone}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: `Stage3Game.css` 작성**

```css
.stage3-game {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.stage3-game--split {
  /* 3분할 칸 안에서도 동작하도록 — 부모가 사이즈 결정 */
}
```

- [ ] **Step 5: 빌드 검증**

```bash
npm run build
```

Expected: 성공, 0 warnings.

- [ ] **Step 6: 커밋**

```bash
git add src/stages/stage3/Stage3Intro.jsx \
        src/stages/stage3/Stage3Intro.css \
        src/stages/stage3/Stage3Game.jsx \
        src/stages/stage3/Stage3Game.css
git commit -m "feat: Stage3Game entry + Stage3Intro — sub-stage contract 구현 #23"
```

---

## Task 5: Stage 1·2 Placeholder

**Files:**
- Create: `src/stages/stage1/Stage1Placeholder.jsx`
- Create: `src/stages/stage1/Stage1Placeholder.css`
- Create: `src/stages/stage2/Stage2Placeholder.jsx`
- Create: `src/stages/stage2/Stage2Placeholder.css`

Stage 4 호스트가 mount할 임시 컴포넌트. split 모드 전용. `isRunning=true`되면 카운트다운 + 가짜 진행바 표시 후 `onResult(0.5)` 호출.

- [ ] **Step 1: `Stage1Placeholder.jsx` 작성**

```jsx
// src/stages/stage1/Stage1Placeholder.jsx
// 팀원 작업 도착 전 임시 컴포넌트. split 모드 전용.

import { useEffect, useState } from 'react';
import './Stage1Placeholder.css';

const PLACEHOLDER_DURATION_SEC = 10;

export default function Stage1Placeholder({ mode = 'split', isRunning, onResult }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const start = performance.now();
    let raf;
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const p = Math.min(1, elapsed / PLACEHOLDER_DURATION_SEC);
      setProgress(p);
      if (p >= 1) {
        onResult(0.5); // 중간 점수
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isRunning, onResult]);

  return (
    <div className={`stage1-placeholder stage1-placeholder--${mode}`}>
      <div className="stage1-placeholder__icon">←</div>
      <div className="stage1-placeholder__title">Stage 1</div>
      <div className="stage1-placeholder__note">팀원 작업 대기 중</div>
      <div className="stage1-placeholder__bar">
        <div
          className="stage1-placeholder__bar-fill"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `Stage1Placeholder.css` 작성**

```css
.stage1-placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  text-align: center;
}

.stage1-placeholder__icon {
  font-size: 48px;
  font-weight: 800;
  color: #ffd700;
  text-shadow: 0 0 12px rgba(255, 215, 0, 0.5);
}

.stage1-placeholder__title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.stage1-placeholder__note {
  font-size: 14px;
  opacity: 0.7;
}

.stage1-placeholder__bar {
  width: 70%;
  height: 6px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  overflow: hidden;
}

.stage1-placeholder__bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #88dd88, #ffd700);
  transition: width 0.1s linear;
}
```

- [ ] **Step 3: `Stage2Placeholder.jsx` 작성 (Stage1과 동일 패턴, 텍스트만 변경)**

```jsx
// src/stages/stage2/Stage2Placeholder.jsx
import { useEffect, useState } from 'react';
import './Stage2Placeholder.css';

const PLACEHOLDER_DURATION_SEC = 10;

export default function Stage2Placeholder({ mode = 'split', isRunning, onResult }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const start = performance.now();
    let raf;
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const p = Math.min(1, elapsed / PLACEHOLDER_DURATION_SEC);
      setProgress(p);
      if (p >= 1) {
        onResult(0.5);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isRunning, onResult]);

  return (
    <div className={`stage2-placeholder stage2-placeholder--${mode}`}>
      <div className="stage2-placeholder__icon">↑</div>
      <div className="stage2-placeholder__title">Stage 2</div>
      <div className="stage2-placeholder__note">팀원 작업 대기 중</div>
      <div className="stage2-placeholder__bar">
        <div
          className="stage2-placeholder__bar-fill"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `Stage2Placeholder.css` 작성 (Stage1과 동일 구조, 클래스 prefix만 stage2)**

```css
.stage2-placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  text-align: center;
}

.stage2-placeholder__icon {
  font-size: 48px;
  font-weight: 800;
  color: #ffd700;
  text-shadow: 0 0 12px rgba(255, 215, 0, 0.5);
}

.stage2-placeholder__title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.stage2-placeholder__note {
  font-size: 14px;
  opacity: 0.7;
}

.stage2-placeholder__bar {
  width: 70%;
  height: 6px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  overflow: hidden;
}

.stage2-placeholder__bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #88dd88, #ffd700);
  transition: width 0.1s linear;
}
```

- [ ] **Step 5: 빌드 검증**

```bash
npm run build
```

Expected: 성공.

- [ ] **Step 6: 커밋**

```bash
git add src/stages/stage1/Stage1Placeholder.jsx \
        src/stages/stage1/Stage1Placeholder.css \
        src/stages/stage2/Stage2Placeholder.jsx \
        src/stages/stage2/Stage2Placeholder.css
git commit -m "feat: Stage 1·2 Placeholder — Stage 4 split 데모 동작용 #23"
```

---

## Task 6: Stage 4 leaf 컴포넌트 (Stage4Intro + Stage4MergeOverlay)

**Files:**
- Create: `src/stages/stage4/Stage4Intro.jsx`
- Create: `src/stages/stage4/Stage4Intro.css`
- Create: `src/stages/stage4/Stage4MergeOverlay.jsx`
- Create: `src/stages/stage4/Stage4MergeOverlay.css`

- [ ] **Step 1: `Stage4Intro.jsx` 작성**

```jsx
// 통합 인트로 — 3 sub-stage 미리보기 + Space 안내.
import './Stage4Intro.css';

const PREVIEWS = [
  { key: '←', title: 'Stage 1', subtitle: '괘종시계 / 타이밍' },
  { key: '↑', title: 'Stage 2', subtitle: '반응속도' },
  { key: '→', title: 'Stage 3', subtitle: '캐치' },
];

export default function Stage4Intro() {
  return (
    <div className="stage4-intro">
      <h1 className="stage4-intro__title">최종 시련 — 거울방</h1>
      <p className="stage4-intro__subtitle">⚠️ 3개 시련을 동시에 통과하라</p>

      <div className="stage4-intro__panes">
        {PREVIEWS.map((p) => (
          <div key={p.title} className="stage4-intro__pane">
            <div className="stage4-intro__key">{p.key}</div>
            <div className="stage4-intro__pane-title">{p.title}</div>
            <div className="stage4-intro__pane-subtitle">{p.subtitle}</div>
          </div>
        ))}
      </div>

      <p className="stage4-intro__cta">▶ 준비되면 [Space] 누르기</p>
    </div>
  );
}
```

- [ ] **Step 2: `Stage4Intro.css` 작성**

```css
.stage4-intro {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 32px;
  text-align: center;
  background: rgba(0, 0, 0, 0.7);
  z-index: 10;
}

.stage4-intro__title {
  font-size: clamp(28px, 3.5vw, 48px);
  margin: 0;
  letter-spacing: 0.04em;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
}

.stage4-intro__subtitle {
  margin: 0;
  font-size: 16px;
  opacity: 0.85;
}

.stage4-intro__panes {
  display: flex;
  gap: 16px;
}

.stage4-intro__pane {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  min-width: 140px;
  background: rgba(255, 255, 255, 0.05);
}

.stage4-intro__key {
  font-size: 36px;
  font-weight: 800;
  color: #ffd700;
}

.stage4-intro__pane-title {
  font-size: 16px;
  font-weight: 700;
}

.stage4-intro__pane-subtitle {
  font-size: 13px;
  opacity: 0.7;
}

.stage4-intro__cta {
  margin-top: 12px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.08em;
  animation: stage4-intro-pulse 1.4s ease-in-out infinite;
}

@keyframes stage4-intro-pulse {
  0%, 100% { opacity: 0.7; }
  50%      { opacity: 1.0; }
}
```

- [ ] **Step 3: `Stage4MergeOverlay.jsx` 작성**

```jsx
// 1초 합체 연출 골격 — 3 panes fade + scale + center 모임.
// 부모(Stage4Host)가 active 동안만 마운트, 1초 후 unmount.
// TODO(post-skeleton): 거울 균열 SVG, "진짜만 남음" 텍스트, 충격음 등 후속 폴리싱.

import './Stage4MergeOverlay.css';

export default function Stage4MergeOverlay() {
  return <div className="stage4-merge-overlay" aria-hidden="true" />;
}
```

- [ ] **Step 4: `Stage4MergeOverlay.css` 작성**

```css
.stage4-merge-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at center,
    rgba(255, 215, 0, 0.0) 0%,
    rgba(255, 215, 0, 0.4) 50%,
    rgba(0, 0, 0, 0.95) 100%
  );
  pointer-events: none;
  z-index: 20;
  animation: stage4-merge-bloom 1s ease-out forwards;
}

@keyframes stage4-merge-bloom {
  0%   { opacity: 0; transform: scale(1.4); }
  30%  { opacity: 0.8; transform: scale(1.1); }
  100% { opacity: 1.0; transform: scale(1.0); }
}
```

- [ ] **Step 5: 빌드 검증**

```bash
npm run build
```

Expected: 성공.

- [ ] **Step 6: 커밋**

```bash
git add src/stages/stage4/Stage4Intro.jsx \
        src/stages/stage4/Stage4Intro.css \
        src/stages/stage4/Stage4MergeOverlay.jsx \
        src/stages/stage4/Stage4MergeOverlay.css
git commit -m "feat: Stage 4 leaf — 통합 인트로 + 합체 오버레이 골격 #23"
```

---

## Task 7: Stage 4 Split 컨테이너 + Host entry

**Files:**
- Create: `src/stages/stage4/Stage4Split.jsx`
- Create: `src/stages/stage4/Stage4Split.css`
- Create: `src/stages/stage4/Stage4Host.jsx`
- Create: `src/stages/stage4/Stage4Host.css`

- [ ] **Step 1: `Stage4Split.jsx` 작성**

```jsx
// 3분할 컨테이너 — 좌(Stage1) / 중(Stage2) / 우(Stage3) sub-stage 마운트.
// 각 sub-stage에 isRunning 신호 전파 + onResult 수집.

import Stage1Placeholder from '../stage1/Stage1Placeholder.jsx';
import Stage2Placeholder from '../stage2/Stage2Placeholder.jsx';
import Stage3Game from '../stage3/Stage3Game.jsx';
import './Stage4Split.css';

export default function Stage4Split({ isRunning, onSubResult }) {
  return (
    <div className="stage4-split">
      <div className="stage4-split__pane">
        <Stage1Placeholder
          mode="split"
          isRunning={isRunning}
          onResult={onSubResult(1)}
        />
      </div>
      <div className="stage4-split__pane">
        <Stage2Placeholder
          mode="split"
          isRunning={isRunning}
          onResult={onSubResult(2)}
        />
      </div>
      <div className="stage4-split__pane">
        <Stage3Game
          mode="split"
          isRunning={isRunning}
          onResult={onSubResult(3)}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `Stage4Split.css` 작성**

```css
.stage4-split {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 2px;
  background: #000;
}

.stage4-split__pane {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

- [ ] **Step 3: `Stage4Host.jsx` 작성**

```jsx
// Stage 4 진입점 — 통합 인트로 + 3분할 + 점수 집계 + 1초 합체 → onResult.
// state machine: intro → running → merging → done

import { useCallback, useEffect, useRef, useState } from 'react';
import Stage4Intro from './Stage4Intro.jsx';
import Stage4Split from './Stage4Split.jsx';
import Stage4MergeOverlay from './Stage4MergeOverlay.jsx';
import './Stage4Host.css';

const MERGE_DURATION_MS = 1000;

export default function Stage4Host({ onResult }) {
  const [phase, setPhase] = useState('intro'); // intro | running | merging | done
  const [results, setResults] = useState({ 1: null, 2: null, 3: null });
  const aggregateRef = useRef(null);

  // intro 단계: Space 누르면 running 진입
  useEffect(() => {
    if (phase !== 'intro') return;
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setPhase('running');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  // sub-stage 결과 수집기
  const handleSubResult = useCallback((subId) => (metric) => {
    setResults((prev) => {
      if (prev[subId] !== null) return prev; // 중복 방지
      return { ...prev, [subId]: metric };
    });
  }, []);

  // 3개 모두 도착하면 평균 산출 + merging 진입
  useEffect(() => {
    if (phase !== 'running') return;
    if (results[1] !== null && results[2] !== null && results[3] !== null) {
      const avg = (results[1] + results[2] + results[3]) / 3;
      aggregateRef.current = Math.max(0, Math.min(1, avg));
      setPhase('merging');
    }
  }, [phase, results]);

  // merging 진입 1초 후 done 전이 + onResult
  useEffect(() => {
    if (phase !== 'merging') return;
    const id = setTimeout(() => {
      setPhase('done');
      onResult(aggregateRef.current);
    }, MERGE_DURATION_MS);
    return () => clearTimeout(id);
  }, [phase, onResult]);

  return (
    <div className="stage4-host">
      {/* split은 phase=running 또는 merging 동안 마운트 (sub-stage 동작) */}
      {(phase === 'running' || phase === 'merging') && (
        <Stage4Split
          isRunning={phase === 'running'}
          onSubResult={handleSubResult}
        />
      )}
      {/* 인트로는 intro phase에서만 */}
      {phase === 'intro' && <Stage4Intro />}
      {/* 합체 오버레이는 merging phase에서만 */}
      {phase === 'merging' && <Stage4MergeOverlay />}
    </div>
  );
}
```

- [ ] **Step 4: `Stage4Host.css` 작성**

```css
.stage4-host {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, #0a0a14 0%, #1a1a2e 50%, #0a0a14 100%);
}
```

- [ ] **Step 5: 빌드 검증**

```bash
npm run build
```

Expected: 성공.

- [ ] **Step 6: 커밋**

```bash
git add src/stages/stage4/Stage4Split.jsx \
        src/stages/stage4/Stage4Split.css \
        src/stages/stage4/Stage4Host.jsx \
        src/stages/stage4/Stage4Host.css
git commit -m "feat: Stage4Host — 3분할 + 점수 집계 + 1초 합체 #23"
```

---

## Task 8: StagePage 라우팅 갱신 + 최종 검증

**Files:**
- Modify: `src/routes/StagePage/StagePage.jsx`
- Modify: `src/routes/StagePage/StagePage.css`

기존 mock 점수 버튼 제거 후 id별로 적절한 컴포넌트 마운트:
- `id='3'` → `<Stage3Game mode="standalone" onResult={recordResult+navigate} />`
- `id='4'` → `<Stage4Host onResult={recordResult+navigate} />`
- `id='1'`, `id='2'` → 기존 mock 버튼 그대로 유지 (팀원 이슈 도착 전)

- [ ] **Step 1: `StagePage.jsx` 갱신 — 전체 교체**

```jsx
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
import Stage3Game from '../../stages/stage3/Stage3Game.jsx';
import Stage4Host from '../../stages/stage4/Stage4Host.jsx';
import './StagePage.css';

const VALID_IDS = ['1', '2', '3', '4'];

export default function StagePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const recordResult = useGameStore((s) => s.recordResult);
  const clearStageResult = useGameStore((s) => s.clearStageResult);

  if (!VALID_IDS.includes(id)) return <Navigate to="/hub" replace />;

  const stageId = Number(id);
  const nextRoute = id === '4' ? '/ending' : '/hub';

  // Stage 3 — 실 구현
  if (id === '3') {
    return (
      <Stage3Game
        mode="standalone"
        onResult={(metric) => {
          recordResult(3, metric);
          navigate('/hub');
        }}
      />
    );
  }

  // Stage 4 — 3분할 호스트
  if (id === '4') {
    return (
      <Stage4Host
        onResult={(metric) => {
          recordResult(4, metric);
          navigate('/ending');
        }}
      />
    );
  }

  // Stage 1·2 — 팀원 작업 대기, 기존 mock 버튼 유지
  // TODO(post-skeleton): 팀원이 Stage1Game/Stage2Game을 contract에 맞게 구현하면
  //                       여기서 import + 마운트 추가.
  const simulatePerfect = () => {
    recordResult(stageId, 0.05);
    navigate(nextRoute);
  };
  const simulateLow = () => {
    recordResult(stageId, 0.4);
    navigate(nextRoute);
  };
  const simulateClear = () => {
    clearStageResult(stageId);
  };

  return (
    <div className="stage-page">
      <h1 className="stage-page__title">[Stage {stageId}]</h1>
      <p className="stage-page__note">TODO: Stage {stageId} 게임 메커닉 (팀원 이슈)</p>
      <div className="stage-page__actions">
        <button type="button" onClick={simulatePerfect}>
          모의 PERFECT (metric 0.05) → {nextRoute}
        </button>
        <button type="button" onClick={simulateLow}>
          모의 낮은 점수 (metric 0.4) → {nextRoute}
        </button>
        <button type="button" onClick={simulateClear}>
          결과 무효화 (clearStageResult)
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `StagePage.css` 그대로 유지**

(기존 파일 변경 불필요. mock 버튼 스타일이 Stage 1·2에 그대로 사용됨.)

- [ ] **Step 3: 빌드 검증**

```bash
npm run build
```

Expected: 성공, 0 warnings.

- [ ] **Step 4: 수동 검증 — Stage 3 단독 시나리오**

```bash
npm run dev
```

브라우저:
1. `/` → "시작" → `/opening` → "다음" → `/hub`
2. 문 3 클릭 → `/stage/3` 진입
3. Stage 3 인트로 화면 — real_1/2/3 + fake_1/2/3 썸네일 + "Space 누르기" 안내 표시 확인
4. `Space` 누름 → 인트로 사라지고 낙하 시작
5. 6개 아이템 순차 낙하 (real 4개 + fake 2개)
6. 캐치 존 안에서 `→` 누르면 PERFECT/GREAT/GOOD/OK/BARE 팝업 표시
7. fake 캐치 시 "INCORRECT" 빨강 팝업
8. 마지막 아이템 통과 후 자동 종료 → `/hub` 복귀
9. `/hub`: 문 3이 `door_clear.png`로 변경, HUD 점수 갱신

- [ ] **Step 5: 수동 검증 — Stage 4 split 시나리오**

(시나리오 #4 계속, dev 서버 그대로)
1. 문 1 → 모의 PERFECT 클릭 → `/hub`
2. 문 2 → 모의 PERFECT 클릭 → `/hub`
3. (이제 1·2·3 클리어됨, 문 4 활성화) 문 4 클릭 → `/stage/4`
4. Stage 4 통합 인트로 — 3 panes 미리보기 + Space 안내
5. `Space` 누름 → 3분할 시작
6. 좌(Stage1 placeholder), 중(Stage2 placeholder): 카운트다운 + 진행바
7. 우(Stage3): 실제 낙하 시퀀스 진행 (10초)
8. → 키 입력 시 우 칸의 캐치 존 안 아이템 캐치 시도 (좌/중은 영향 없음)
9. 모든 sub-stage 종료 후 1초 합체 오버레이 표시
10. 자동으로 `/ending` 진입 → 총점 표시
11. "랭킹 보기" → `/ranking` → "처음으로" → `/`

- [ ] **Step 6: 시나리오 #5 — 시간 제한 없는 인트로 검증**

1. `/stage/3` 진입 후 `Space` 누르지 않고 1분 대기
2. 인트로 그대로 유지, 자동 진행 없음
3. `Space` 누름 → 그제서야 시작

- [ ] **Step 7: 시나리오 #6 — fake 페널티 검증**

1. `/stage/3` 시작 후 fake 아이템이 캐치 존에 들어왔을 때 `→` 누름
2. 빨강 팝업 "INCORRECT" 표시
3. 종료 시 metric에 페널티 반영됨 (실 점수가 모든 real PERFECT보다 낮게 나오는지 확인)

- [ ] **Step 8: 모든 시나리오 통과 시 dev 서버 종료**

Ctrl+C.

- [ ] **Step 9: 커밋**

```bash
git add src/routes/StagePage/StagePage.jsx
git commit -m "feat: StagePage /stage/3·4 실 컴포넌트 마운트, mock 버튼 제거 #23"
```

- [ ] **Step 10: 최종 git history 확인**

```bash
git log --oneline c4dd718..HEAD
```

Expected (위→아래):
- `feat: StagePage /stage/3·4 실 컴포넌트 마운트, mock 버튼 제거 #23`
- `feat: Stage4Host — 3분할 + 점수 집계 + 1초 합체 #23`
- `feat: Stage 4 leaf — 통합 인트로 + 합체 오버레이 골격 #23`
- `feat: Stage 1·2 Placeholder — Stage 4 split 데모 동작용 #23`
- `feat: Stage3Game entry + Stage3Intro — sub-stage contract 구현 #23`
- `feat: Stage3Field — 낙하 시퀀스 + 정확도 측정 + 점수 누적 #23`
- `feat: Stage 3 config + 시각 leaf 컴포넌트(CatchZone, FallingItem, ResultPopup) #23`
- `feat: Stage 3·4 점수 tier + memory 자산 등록 + sub-stage contract 가이드 #23`
- `feat: 허브 문 클릭 시 SFX 재생 + BGM 파일 교체 #23`
- `docs: Stage 3·4 뼈대 이슈 + 진짜/가짜 기억 자산 추가 #23`
- `docs: Stage 3 풀구현 + Stage 4 3분할 뼈대 + sub-stage contract 설계 문서 #23`
- (기존 main 커밋들...)

---

## Definition of Done

- [ ] `src/stages/stage3/` 8 파일(jsx 4개 + css 4개) + config.js 완성, 풀 메커닉 동작
- [ ] `src/stages/stage4/` 호스트 + Intro + Split + MergeOverlay 완성
- [ ] `src/stages/stage1/Stage1Placeholder.jsx` + Stage 2 동일 완성
- [ ] `STAGE_SCORE_TIERS[3]`, `STAGE_SCORE_TIERS[4]` 채워짐 (1·2는 빈 배열 유지)
- [ ] `src/assets.js`에 memoryReal/memoryFake 배열 추가 (기존 키 보존)
- [ ] `docs/superpowers/sub-stage-contract.md` 가이드 문서 존재
- [ ] `StagePage.jsx`에서 `/stage/3` → Stage3Game, `/stage/4` → Stage4Host 마운트
- [ ] `npm run build` 통과, 0 warnings
- [ ] 수동 검증 시나리오(#4, #5, #6) 모두 통과
- [ ] git history Task 0~8 단위 커밋 분리

---

## 후속 이슈 분리 (본 이슈 외)

- Stage 1 (괘종시계) 메커닉 — 팀원 담당, sub-stage contract 따라 작성. `Stage1Placeholder` → `Stage1Game` 교체.
- Stage 2 (반응속도) 메커닉 — 팀원 담당. `Stage2Placeholder` → `Stage2Game` 교체.
- Stage 4 합체 연출 비주얼 폴리싱 — 거울 균열, "진짜만 남음" 텍스트, 충격음, 1인칭 흔들림.
- 캐치/입력/합체 SFX 추가 — `audio/` 모듈 확장.
- bg_stage{1,2,3,4} 배경 이미지 추가 (현재는 단색/그라디언트 fallback).
- 운영자 ESC 키 / 강제 다음 플레이어 진입.
- 재도전 UI/UX 정책.
- lint config (`eslint-config-airbnb-extended` import-x 등록 누락) — init 커밋부터 환경 깨짐, 별도 이슈.
