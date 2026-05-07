# Ending Branch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stage 4 종료 후 누적 점수에 따라 `greenie_alive.png`(성공) / `greenie_silhouette.png`(실패) 두 컷씬으로 분기되는 엔딩 화면을 구현한다. SFX 슬롯은 `null`로 마련해 추후 음원 추가 시 코드 변경 없이 활성화되도록 한다.

**Architecture:** `scoring.js`에 단일 컷오프(`ENDING_SUCCESS_CUTOFF=600`) 기반 binary 분기 헬퍼를 추가하고, `EndingPage`를 (reveal → hold → leaving) state machine으로 재구성. 시각·자막·타이밍·SFX 슬롯은 `ending.config.js`로 외부화. `EndingCutscene` presentational 컴포넌트가 outcome에 따라 이미지/자막/SFX(null이면 skip)를 렌더한다.

**Tech Stack:** React 19, react-router-dom 7, zustand 5, Vite 8 (no unit test framework — 검증은 `npm run lint` + `npm run build` + 수동 dev 시나리오)

**Spec:** `docs/superpowers/specs/2026-05-07-ending-branch-design.md`
**Issue:** `.issues/20260507_기능추가_엔딩_컷씬_점수분기_구현.md` (#26)

---

## File Structure

| 파일 | 역할 | C/M |
|---|---|---|
| `src/scoring.js` | `ENDING_SUCCESS_CUTOFF` 상수 + `endingOutcomeFromTotal(total)` 헬퍼 추가 | M |
| `src/store.js` | `selectEndingOutcome` selector 추가 (기존 `selectTotalScore` 재사용) | M |
| `src/assets.js` | `ASSETS.images.endingAlive`, `endingSilhouette` 추가 / `ASSETS.sounds.endingAliveSfx`, `endingSilhouetteSfx` `null` 슬롯 추가 | M |
| `src/routes/EndingPage/ending.config.js` | 타이밍·자막 카피·outcome→이미지/SFX 매핑 단일 소스 | C |
| `src/routes/EndingPage/EndingCutscene.jsx` | outcome에 따라 이미지+자막+SFX(null skip) 렌더하는 presentational 컴포넌트 | C |
| `src/routes/EndingPage/EndingCutscene.css` | 컷씬 페이드인 스타일 | C |
| `src/routes/EndingPage/EndingPage.jsx` | state machine(reveal/hold/leaving), 자동 전환, 키 입력 | M (rewrite) |
| `src/routes/EndingPage/EndingPage.css` | 풀스크린 검정 + 비네팅, 점수 작게 표시 | M (rewrite) |
| `docs/PRD.md` | §7 확정 에셋 표 갱신, 기존 cutscene_ending_*.png 메모 변경 | M |

이 파일들 모두 책임이 1개씩 분리됨. `EndingCutscene`은 순수 표현(props in, render out), `EndingPage`는 상태/타이머/라우팅, `ending.config.js`는 튜닝 단일 소스.

---

## Task 1: scoring.js — 컷오프 상수 + 분기 헬퍼

**Files:**
- Modify: `src/scoring.js`

- [ ] **Step 1: 상수와 헬퍼 추가**

`src/scoring.js` 파일 끝에 다음을 추가한다 (기존 `STAGE_SCORE_TIERS` / `scoreFromMetric`은 그대로).

```js
// ───── 엔딩 분기 (PRD §6 등급 컷오프와 별개의 단일 컷오프) ─────

/**
 * 누적 점수가 이 값 이상이면 성공 엔딩, 미만이면 실패 엔딩.
 * Tunable — 부스 플레이테스트 후 조정. 등급 시스템(S/A/B/F) 확정 시
 * S/A 경계 점수와 정합시킨다.
 */
export const ENDING_SUCCESS_CUTOFF = 600;

/**
 * 누적 점수 → 엔딩 outcome 결정.
 * - totalScore >= ENDING_SUCCESS_CUTOFF → 'alive' (성공)
 * - totalScore <  ENDING_SUCCESS_CUTOFF → 'silhouette' (실패)
 *
 * 음수/NaN/비숫자 입력은 'silhouette'로 안전 분기.
 */
export function endingOutcomeFromTotal(totalScore) {
  if (typeof totalScore !== 'number' || Number.isNaN(totalScore)) {
    return 'silhouette';
  }
  return totalScore >= ENDING_SUCCESS_CUTOFF ? 'alive' : 'silhouette';
}
```

- [ ] **Step 2: lint 통과 확인**

Run: `npm run lint`
Expected: 새로운 에러/경고 없음. (기존 코드 경고는 본 이슈 범위 밖)

- [ ] **Step 3: 수동 sanity 검증 (브라우저 콘솔)**

`npm run dev` 실행 후 dev 페이지에서 콘솔에 직접 입력:

```js
// import 경로는 dev 환경에 따라 다를 수 있어 일반적인 module 경로 사용
const { endingOutcomeFromTotal, ENDING_SUCCESS_CUTOFF } = await import('/src/scoring.js');
console.assert(ENDING_SUCCESS_CUTOFF === 600, 'cutoff');
console.assert(endingOutcomeFromTotal(700) === 'alive', '700→alive');
console.assert(endingOutcomeFromTotal(600) === 'alive', 'boundary≥');
console.assert(endingOutcomeFromTotal(599) === 'silhouette', '599→silhouette');
console.assert(endingOutcomeFromTotal(0) === 'silhouette', '0→silhouette');
console.assert(endingOutcomeFromTotal(NaN) === 'silhouette', 'NaN→silhouette');
console.assert(endingOutcomeFromTotal(undefined) === 'silhouette', 'undefined→silhouette');
console.log('scoring.js: ending helpers OK');
```

Expected: `scoring.js: ending helpers OK` 로그, assertion 실패 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/scoring.js
git commit -m "feat: 엔딩 분기 헬퍼(endingOutcomeFromTotal) + 컷오프 상수 추가 #26"
```

---

## Task 2: store.js — selectEndingOutcome selector

**Files:**
- Modify: `src/store.js`

- [ ] **Step 1: selector 추가**

`src/store.js`의 import 섹션에 `endingOutcomeFromTotal` 추가:

```js
import { scoreFromMetric, endingOutcomeFromTotal } from './scoring.js';
```

파일 하단 selector 섹션(`selectClearedCount` 아래)에 다음을 추가한다.

```js
/**
 * 누적 점수 → 엔딩 outcome ('alive' | 'silhouette') selector.
 * EndingPage가 진입 시 한 번 평가하여 컷씬을 결정한다.
 */
export const selectEndingOutcome = (s) =>
  endingOutcomeFromTotal(selectTotalScore(s));
```

- [ ] **Step 2: lint 통과**

Run: `npm run lint`
Expected: 새 에러 없음.

- [ ] **Step 3: 수동 sanity 검증**

`npm run dev` 후 콘솔:

```js
const { useGameStore, selectEndingOutcome } = await import('/src/store.js');

// reset state
useGameStore.getState().resetGame();
console.assert(selectEndingOutcome(useGameStore.getState()) === 'silhouette', 'empty→silhouette');

// 4 stages PERFECT-ish (Stage 3 max=300, Stage 4 max=400 → 합산 700 가능)
useGameStore.getState().recordResult(3, 0.05);  // 300
useGameStore.getState().recordResult(4, 0.05);  // 400
console.assert(selectEndingOutcome(useGameStore.getState()) === 'alive', '700→alive');

useGameStore.getState().resetGame();
console.log('store.js: selectEndingOutcome OK');
```

Expected: `store.js: selectEndingOutcome OK`.

- [ ] **Step 4: 커밋**

```bash
git add src/store.js
git commit -m "feat: selectEndingOutcome selector 추가 #26"
```

---

## Task 3: assets.js — 엔딩 이미지 등록 + SFX null 슬롯

**Files:**
- Modify: `src/assets.js`

- [ ] **Step 1: ASSETS 객체에 키 추가**

`src/assets.js`를 다음 내용으로 교체한다 (기존 키는 모두 유지하고 신규 키만 끼워 넣음).

```js
// src/assets.js
// public/ 하위 파일은 절대경로로 그대로 서빙됨 (Vite 표준).

export const ASSETS = {
  images: {
    hubCorridor:     '/assets/images/bg_hub_corridor.png',
    door:            '/assets/images/door.png',
    doorClear:       '/assets/images/door_clear.png',
    cutsceneOpening: '/assets/images/cutscene_opening.png',
    stage1:          '/assets/images/bg_stage1_clocktower.png',
    stage2:          '/assets/images/bg_stage2_classroom.png',
    stage3:          '/assets/images/bg_stage3_room.png',
    stage4:          '/assets/images/bg_stage4_bathroom.png',
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
    // 엔딩 컷씬 (#26)
    endingAlive:      '/assets/images/greenie_alive.png',
    endingSilhouette: '/assets/images/greenie_silhouette.png',
  },
  sounds: {
    bgm:      '/assets/sounds/bgm.mp3',
    openDoor: '/assets/sounds/open_door_sound.mp3',
    // 엔딩 SFX 슬롯 — 본 이슈 범위에서는 음원 미존재. null이면 EndingCutscene에서 재생 skip.
    // images.endingAlive와 이름 겹치지 않도록 'Sfx' 접미사 사용.
    endingAliveSfx:      null,
    endingSilhouetteSfx: null,
  },
};
```

- [ ] **Step 2: 이미지 파일 존재 확인**

```bash
ls -la public/assets/images/greenie_alive.png public/assets/images/greenie_silhouette.png
```

Expected: 두 파일 모두 존재 (브랜치 생성 시 untracked로 들어와 있음).

- [ ] **Step 3: lint + build**

```bash
npm run lint && npm run build
```

Expected: 둘 다 통과.

- [ ] **Step 4: 이미지 직접 로드 검증**

`npm run dev` 후 브라우저에서 두 URL 직접 방문:
- `http://localhost:<port>/assets/images/greenie_alive.png`
- `http://localhost:<port>/assets/images/greenie_silhouette.png`

Expected: 두 이미지 모두 정상 표시.

- [ ] **Step 5: 커밋**

```bash
git add src/assets.js public/assets/images/greenie_alive.png public/assets/images/greenie_silhouette.png
git commit -m "feat: 엔딩 컷씬 이미지 등록 + SFX null 슬롯 추가 #26"
```

---

## Task 4: ending.config.js — 튜닝 단일 소스

**Files:**
- Create: `src/routes/EndingPage/ending.config.js`

- [ ] **Step 1: config 파일 생성**

`src/routes/EndingPage/ending.config.js`:

```js
// src/routes/EndingPage/ending.config.js
// 엔딩 컷씬 튜닝 단일 소스. 타이밍/자막/outcome→자산 매핑 모두 여기서 조정.

import { ASSETS } from '../../assets.js';

export const ENDING_CONFIG = {
  // 페이드인 (이미지 + 자막 등장)
  revealMs: 1000,
  // hold (정지 노출, PRD §5 "엔딩 10초"의 대부분 차지)
  holdMs:   8000,
  // 페이드아웃 후 /ranking 이동
  leaveMs:   500,

  // 한국어 자막 1줄 — PRD §10 자막 가이드 (큰 글씨, 가독성 우선)
  captions: {
    alive:      '또 다른 나를 떨쳐냈다.',
    silhouette: '또 다른 내가 되어버렸다.',
  },

  // outcome → 사용할 이미지 / SFX 키
  // SFX 경로가 null이면 EndingCutscene에서 재생 skip (안전).
  assetsByOutcome: {
    alive: {
      image:  ASSETS.images.endingAlive,
      sfxSrc: ASSETS.sounds.endingAliveSfx,
    },
    silhouette: {
      image:  ASSETS.images.endingSilhouette,
      sfxSrc: ASSETS.sounds.endingSilhouetteSfx,
    },
  },
};
```

- [ ] **Step 2: lint + build**

```bash
npm run lint && npm run build
```

Expected: 둘 다 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/routes/EndingPage/ending.config.js
git commit -m "feat: ending.config.js — 타이밍/자막/자산 매핑 단일 소스 #26"
```

---

## Task 5: EndingCutscene 컴포넌트 + CSS

**Files:**
- Create: `src/routes/EndingPage/EndingCutscene.jsx`
- Create: `src/routes/EndingPage/EndingCutscene.css`

- [ ] **Step 1: EndingCutscene.jsx 생성**

`src/routes/EndingPage/EndingCutscene.jsx`:

```jsx
// 엔딩 컷씬 — outcome에 따라 이미지/자막/SFX 렌더.
// SFX 경로가 null이면 재생 skip (음원 미존재 시 안전 동작).

import { useEffect } from 'react';
import { ENDING_CONFIG } from './ending.config.js';
import './EndingCutscene.css';

const VOLUME = 0.8;

export default function EndingCutscene({ outcome, phase, totalScore }) {
  const { image, sfxSrc } = ENDING_CONFIG.assetsByOutcome[outcome];
  const caption = ENDING_CONFIG.captions[outcome];

  // SFX — reveal 진입 시 1회. 경로 null이면 skip.
  useEffect(() => {
    if (phase !== 'reveal') return undefined;
    if (!sfxSrc) return undefined;
    const audio = new Audio(sfxSrc);
    audio.volume = VOLUME;
    audio.play().catch(() => {});  // 자동재생 정책 실패 시 silent
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [phase, sfxSrc]);

  // phase가 'leaving'이면 페이드아웃, 'entered'이면 미가시(즉시 reveal로 전환됨)
  const visibilityClass =
    phase === 'leaving' ? 'ending-cutscene--leaving'
    : phase === 'entered' ? 'ending-cutscene--entered'
    : 'ending-cutscene--visible';

  return (
    <div className={`ending-cutscene ${visibilityClass}`}>
      <img
        className="ending-cutscene__image"
        src={image}
        alt={outcome === 'alive' ? '진짜 그린이' : '귀신이 된 그린이'}
        draggable={false}
      />
      <p className="ending-cutscene__caption">{caption}</p>
      <p className="ending-cutscene__score">최종 점수 {totalScore}</p>
    </div>
  );
}
```

- [ ] **Step 2: EndingCutscene.css 생성**

`src/routes/EndingPage/EndingCutscene.css`:

```css
.ending-cutscene {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px;
  text-align: center;
  opacity: 0;
  transition: opacity 1000ms ease;
}

/* phase 매핑: revealMs (1000ms), leaveMs (500ms)와 정합 */
.ending-cutscene--entered { opacity: 0; transition-duration: 0ms; }
.ending-cutscene--visible { opacity: 1; transition-duration: 1000ms; }
.ending-cutscene--leaving { opacity: 0; transition-duration: 500ms; }

.ending-cutscene__image {
  max-height: 60vh;
  max-width: 80vw;
  object-fit: contain;
  user-select: none;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.6));
}

.ending-cutscene__caption {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  color: #f4f4f4;
  letter-spacing: 0.02em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
}

.ending-cutscene__score {
  margin: 0;
  font-size: 18px;
  color: rgba(244, 244, 244, 0.7);
}
```

- [ ] **Step 3: lint + build**

```bash
npm run lint && npm run build
```

Expected: 둘 다 통과.

- [ ] **Step 4: 커밋**

```bash
git add src/routes/EndingPage/EndingCutscene.jsx src/routes/EndingPage/EndingCutscene.css
git commit -m "feat: EndingCutscene presentational 컴포넌트 추가 #26"
```

---

## Task 6: EndingPage — state machine + 자동 전환 + 키 입력

**Files:**
- Modify: `src/routes/EndingPage/EndingPage.jsx` (full rewrite)

- [ ] **Step 1: EndingPage.jsx 교체**

`src/routes/EndingPage/EndingPage.jsx`를 다음 내용으로 완전 교체:

```jsx
// /ending — Stage 4 종료 후 누적 점수 기반 성공/실패 컷씬 분기.
// state machine: entered → reveal → hold → leaving → /ranking
//
// timing 파라미터는 ENDING_CONFIG에서 조정.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, selectTotalScore, selectEndingOutcome } from '../../store.js';
import { ENDING_CONFIG } from './ending.config.js';
import EndingCutscene from './EndingCutscene.jsx';
import './EndingPage.css';

const ADVANCE_KEYS = new Set(['Space', 'Enter']);

export default function EndingPage() {
  const navigate = useNavigate();
  const totalScore = useGameStore(selectTotalScore);

  // outcome은 마운트 시 한 번만 평가 — 진행 중 store가 바뀌어도 결말은 고정.
  const outcomeAtMount = useMemo(
    () => selectEndingOutcome(useGameStore.getState()),
    [],
  );

  const [phase, setPhase] = useState('entered'); // entered | reveal | hold | leaving

  // entered → reveal (즉시)
  useEffect(() => {
    if (phase !== 'entered') return undefined;
    const id = requestAnimationFrame(() => setPhase('reveal'));
    return () => cancelAnimationFrame(id);
  }, [phase]);

  // reveal → hold (revealMs 후)
  useEffect(() => {
    if (phase !== 'reveal') return undefined;
    const id = setTimeout(() => setPhase('hold'), ENDING_CONFIG.revealMs);
    return () => clearTimeout(id);
  }, [phase]);

  // hold → leaving (holdMs 후 자동)
  useEffect(() => {
    if (phase !== 'hold') return undefined;
    const id = setTimeout(() => setPhase('leaving'), ENDING_CONFIG.holdMs);
    return () => clearTimeout(id);
  }, [phase]);

  // leaving → /ranking (leaveMs 후)
  useEffect(() => {
    if (phase !== 'leaving') return undefined;
    const id = setTimeout(() => navigate('/ranking'), ENDING_CONFIG.leaveMs);
    return () => clearTimeout(id);
  }, [phase, navigate]);

  // 키 입력으로 즉시 leaving 진입 (이미 leaving이면 무시)
  useEffect(() => {
    if (phase === 'leaving') return undefined;
    const handle = (e) => {
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        setPhase('leaving');
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [phase]);

  return (
    <div className="ending-page">
      <EndingCutscene
        outcome={outcomeAtMount}
        phase={phase}
        totalScore={totalScore}
      />
    </div>
  );
}
```

- [ ] **Step 2: lint + build**

```bash
npm run lint && npm run build
```

Expected: 둘 다 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/routes/EndingPage/EndingPage.jsx
git commit -m "feat: EndingPage state machine + outcome 분기 + 자동 전환/키 입력 #26"
```

---

## Task 7: EndingPage.css — 풀스크린 검정 + 비네팅

**Files:**
- Modify: `src/routes/EndingPage/EndingPage.css` (full rewrite)

- [ ] **Step 1: CSS 교체**

`src/routes/EndingPage/EndingPage.css`를 다음 내용으로 완전 교체:

```css
.ending-page {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0a0a;
  overflow: hidden;
}

/* 가벼운 비네팅 */
.ending-page::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse at center,
    transparent 50%,
    rgba(0, 0, 0, 0.85) 100%
  );
}
```

- [ ] **Step 2: lint + build**

```bash
npm run lint && npm run build
```

Expected: 둘 다 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/routes/EndingPage/EndingPage.css
git commit -m "style: EndingPage 풀스크린 검정 + 비네팅 #26"
```

---

## Task 8: PRD §7 갱신

**Files:**
- Modify: `docs/PRD.md`

- [ ] **Step 1: 확정 에셋 표에 두 행 추가**

`docs/PRD.md`의 §7 "✅ 확정 에셋" 표를 찾아 마지막 행 뒤에 다음 두 행을 추가:

```markdown
| `greenie_alive.png` | 엔딩 — 성공 (귀신을 떨친 진짜 그린이) |
| `greenie_silhouette.png` | 엔딩 — 실패 (귀신이 된 그린이) |
```

- [ ] **Step 2: 기존 cutscene_ending_*.png 섹션에 메모 추가**

§7 "🎨 생성 필요 이미지 에셋" 섹션의 `cutscene_ending_true.png`와 `cutscene_ending_bad.png` 항목 각각의 프롬프트 코드 블록 위(섹션 헤더 바로 아래)에 다음 줄을 삽입:

```markdown
> ⚠️ 대체됨 — `greenie_alive.png` / `greenie_silhouette.png`로 대체 운영 (#26 참고)
```

각 항목 (`### **\`cutscene_ending_true.png\`** — 엔딩 (성공)`와 `### **\`cutscene_ending_bad.png\`** — 엔딩 (실패)`) 헤더 직후에 한 줄씩.

- [ ] **Step 3: 변경 확인**

```bash
git diff docs/PRD.md
```

Expected:
- 확정 에셋 표 끝에 2행 추가
- cutscene_ending_true 헤더 다음 줄에 대체 메모
- cutscene_ending_bad 헤더 다음 줄에 대체 메모

- [ ] **Step 4: 커밋**

```bash
git add docs/PRD.md
git commit -m "docs: PRD §7 엔딩 자산 갱신 (greenie_alive/silhouette 도입) #26"
```

---

## Task 9: end-to-end 수동 검증

**Files:** (no changes)

이 태스크는 코드 변경 없이, 본 기능이 시나리오대로 동작하는지 dev 환경에서 직접 확인한다.

- [ ] **Step 1: dev 서버 기동**

```bash
npm run dev
```

브라우저로 dev 페이지 진입.

- [ ] **Step 2: 시나리오 #1 — 성공 엔딩 (totalScore ≥ 600)**

1. 타이틀에서 시작 → /hub
2. Stage 1·2 mock PERFECT 버튼으로 결과 기록 (각 stage 1·2의 점수 tier가 비어 있어 0점이지만, Stage 3·4가 충분하면 600 도달 가능)
3. Stage 3 진입 → 실제 캐치 게임에서 PERFECT 가까이 플레이 → /hub 복귀 시 ~300점 가산
4. Stage 4 진입 → split 모드에서 가능한 좋은 metric 만들기 → /ending 진입 시 ~400점 가산
5. 누적 ≥ 600일 경우 `greenie_alive.png` + "또 다른 나를 떨쳐냈다." 컷씬 노출 확인
6. 약 9.5초 후 자동으로 /ranking 진입 확인

콘솔 보조 (옵션 — 빠르게 600점 만들기):

```js
const { useGameStore } = await import('/src/store.js');
useGameStore.getState().recordResult(3, 0.05); // 300
useGameStore.getState().recordResult(4, 0.05); // 400
// 그 후 /ending으로 직접 이동
location.hash = '/ending'; // (BrowserRouter면 location.pathname='/ending')
```

Expected: 성공 컷씬, 자막 alive, 점수 700, 자동 /ranking 전환.

- [ ] **Step 3: 시나리오 #2 — 실패 엔딩 (totalScore < 600)**

콘솔에서:

```js
const { useGameStore } = await import('/src/store.js');
useGameStore.getState().resetGame();
useGameStore.getState().recordResult(3, 0.5);  // 낮은 tier
useGameStore.getState().recordResult(4, 0.5);
// /ending으로 이동
```

Expected: `greenie_silhouette.png` + "또 다른 내가 되어버렸다." + 점수 작게 + 자동 /ranking.

- [ ] **Step 4: 시나리오 #3 — Space로 즉시 전환**

성공 또는 실패 시나리오 진입 직후 Space (또는 Enter) 누르기.
Expected: 즉시 leaving phase → 약 0.5s 페이드아웃 → /ranking.

- [ ] **Step 5: 시나리오 #4 — SFX null skip**

브라우저 콘솔에 audio 관련 에러/경고 없음 확인.
Expected: SFX 경로가 null이라 Audio 인스턴스 생성 자체가 일어나지 않음. 콘솔 깨끗함.

- [ ] **Step 6: 시나리오 #5 — 컷오프 경계**

콘솔:

```js
const { useGameStore, selectEndingOutcome } = await import('/src/store.js');
useGameStore.getState().resetGame();
// totalScore가 정확히 600이 되도록 강제 설정 — recordResult로는 정확히 600을 만들기 어려우니 직접 검증
const { endingOutcomeFromTotal } = await import('/src/scoring.js');
console.assert(endingOutcomeFromTotal(600) === 'alive', 'boundary');
console.assert(endingOutcomeFromTotal(599) === 'silhouette', 'just below');
```

Expected: assertion 통과.

- [ ] **Step 7: 시나리오 #6 — resetGame 후 재플레이**

`/ranking`에서 타이틀로 복귀 → 새 플레이 시작 → /ending 진입.
Expected: 직전 outcome 잔존 없음, 새 totalScore 기준으로 분기 결정.

- [ ] **Step 8: 회귀 검증 — Stage 3·4 정상 동작**

기존 Stage 3 단독 / Stage 4 split 시나리오가 그대로 동작하는지 1회 확인.
Expected: 기존 동작 영향 없음.

- [ ] **Step 9: 최종 build 통과**

```bash
npm run lint && npm run build
```

Expected: 둘 다 통과.

- [ ] **Step 10: 검증 결과를 메모 (선택)**

수동 시나리오 모두 통과했으면 본 task에는 커밋 불필요. 실패가 있으면 해당 task로 돌아가 수정 후 재검증.

---

## Risks & Mitigations

| 위험 | 대응 |
|---|---|
| `npm run dev` 자동재생 정책으로 SFX 미재생 가능 | 본 이슈 SFX 경로 모두 null이라 영향 없음. 음원 추가 후 후속 이슈에서 BGM 정책(`hasUserStarted`) 준용 |
| 컷오프 600이 부스 운영상 부적절 | `ENDING_SUCCESS_CUTOFF` 한 줄 조정. Stage 1·2 점수 tier 확정 후 재산정 |
| `useMemo`로 outcome 마운트 시 1회 평가 → 디버깅 중 store 조작이 즉시 반영 안 됨 | 의도된 설계 (결말 고정). 디버깅 시 페이지 리로드로 재평가 |
| 자동 전환 9.5s가 길어 부스 회전율 ↓ | `holdMs` 한 줄 조정 또는 운영자 Space로 단축 |

---

## Self-Review

**1. Spec coverage:**
- §3 분기 결정 로직 → Task 1 ✓
- §4 자산 등록 → Task 3 ✓
- §5.1 컴포넌트 구조 → Task 5 (EndingCutscene) + Task 6 (EndingPage) ✓
- §5.2 state machine → Task 6 ✓
- §5.3 자막 카피 → Task 4 (config) ✓
- §5.4 키 입력 즉시 전환 → Task 6 ✓
- §5.5 SFX null skip → Task 5 ✓
- §5.6 Tunable 외부화 → Task 4 ✓
- §6 폴더 구조 → Tasks 1·2·3·4·5·6·7 합산으로 일치 ✓
- §7 데이터 흐름 → Task 6 ✓
- §8 검증 시나리오 → Task 9 ✓
- §9 위험 요소 → 본 plan Risks 섹션 ✓
- §10 완료 정의 → Tasks 1~8 ✓
- §11 후속 이슈 분리 → spec에서 관리 ✓

**2. Placeholder scan:** "TBD"·"TODO"·"implement later" 없음. 모든 step에 실 코드/명령. ✓

**3. Type consistency:**
- `endingOutcomeFromTotal` 시그니처 (Task 1) → `selectEndingOutcome` 내부 사용 (Task 2) → `EndingPage`의 `selectEndingOutcome(useGameStore.getState())` 호출 (Task 6) 일관 ✓
- `ASSETS.images.endingAlive` / `endingSilhouette` (Task 3) → `ending.config.js`에서 참조 (Task 4) → `EndingCutscene`이 `assetsByOutcome[outcome].image` 사용 (Task 5) ✓
- `ASSETS.sounds.endingAliveSfx` / `endingSilhouetteSfx` (Task 3) → `ending.config.js` (Task 4) → `EndingCutscene` `sfxSrc` (Task 5) ✓
- `phase` 값 `'entered' | 'reveal' | 'hold' | 'leaving'` (Task 6 EndingPage) → `EndingCutscene` className 매핑 (Task 5) 정합 ✓
- `outcome` 값 `'alive' | 'silhouette'` 일관 ✓

이슈/모호함 없음.
