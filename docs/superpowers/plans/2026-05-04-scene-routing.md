# Scene Routing + 월드맵 도입 Implementation Plan (Issue #12)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PRD §1.2 사용자 플로우를 화면에 구현한다. 9개 씬을 가진 라우터 + 그린이가 직접 걸어 체크포인트(미니게임)에 진입하는 월드맵 + 누적 점수 전역 store를 도입하고, Vite 데모 마크업/자산을 완전 제거한다.

**Architecture:** React Context + useReducer로 전역 상태(scene/worldStage/totalScore/hasArmor/bossHP). App.jsx가 단일 씬 라우터. 기존 미니게임 컴포넌트(MG1/MG2/MG3)는 `autoStart`/`onComplete`/`onContinue` props 추가로 최소 변경. armor/MG4/boss/ending 씬은 통일된 Placeholder 컴포넌트로 자리만 마련 (실제 콘텐츠는 별도 이슈).

**Tech Stack:** React 19, Vite, 기존 자산(`/sprites/unified_5_walk_no_weapon.png`, `/bg/world.png`). 신규 의존성 0개.

**Spec:** `docs/superpowers/specs/2026-05-04-scene-routing-design.md`

> **Test 정책:** 이번 PR은 Vitest 등 테스트 인프라 도입 없음 (spec §12). TDD 사이클 대신 각 task 끝에서 `npm run lint` + `npm run build` + (UI인 경우) `npm run dev`로 수동 검증. 각 task 단위 commit.

---

## Phase 1 — Foundation (store, sprites, Hero, hooks)

### Task 1: 전역 store (Context + Reducer)

**Files:**
- Create: `src/store/gameStore.jsx`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p src/store
```

- [ ] **Step 2: gameStore.jsx 작성**

```jsx
// src/store/gameStore.jsx
import { createContext, useContext, useReducer } from 'react';

const initialState = {
  scene: 'intro',         // 'intro' | 'world' | 'minigame_1~3' | 'armor' | 'minigame_4' | 'boss_fight' | 'ending'
  worldStage: 0,          // 0..3
  totalScore: 0,
  hasArmor: false,
  bossHP: 1500,           // PRD §3.2 자리만 (옵션 A에서 미사용)
  lastMiniScore: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'GO_TO_SCENE':
      return { ...state, scene: action.payload };
    case 'SET_WORLD_STAGE':
      return { ...state, worldStage: action.payload };
    case 'ADD_SCORE':
      return {
        ...state,
        totalScore: state.totalScore + action.payload,
        lastMiniScore: action.payload,
      };
    case 'EQUIP_ARMOR':
      return { ...state, hasArmor: true };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 0 errors, 0 warnings (해당 파일에 대해)

- [ ] **Step 4: Commit**

```bash
git add src/store/gameStore.jsx
git commit -m "feat: GameProvider/useGame 전역 store 추가 (#12)"
```

---

### Task 2: 스프라이트 메타데이터 + Hero 컴포넌트

**Files:**
- Create: `src/constants/sprites.js`
- Create: `src/components/Hero.jsx`
- Create: `src/components/Hero.css`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p src/constants
```

- [ ] **Step 2: sprites.js 작성**

```js
// src/constants/sprites.js
export const HERO_FRAME_W = 400;
export const HERO_FRAME_H = 220;

export const HERO_SPRITES = {
  walk_no_weapon: {
    src: '/sprites/unified_5_walk_no_weapon.png',
    frames: 8,
    duration: '0.8s',
    loop: true,
  },
};
```

- [ ] **Step 3: Hero.css 작성 (keyframes)**

```css
/* src/components/Hero.css */
@keyframes hero-play {
  to { background-position: var(--end-pos) 0; }
}

.hero-sprite {
  position: absolute;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  pointer-events: none;
}

.hero-sprite.paused {
  animation-play-state: paused !important;
}
```

- [ ] **Step 4: Hero.jsx 작성**

```jsx
// src/components/Hero.jsx
import { HERO_SPRITES, HERO_FRAME_W, HERO_FRAME_H } from '../constants/sprites';
import './Hero.css';

export default function Hero({
  action = 'walk_no_weapon',
  x = 100,
  bottom = 151,
  facing = 'right',
  playing = true,
}) {
  const a = HERO_SPRITES[action];
  if (!a) return null;
  return (
    <div
      key={action}
      className={`hero-sprite ${playing ? '' : 'paused'}`}
      style={{
        bottom,
        left: x,
        width: HERO_FRAME_W,
        height: HERO_FRAME_H,
        backgroundImage: `url(${a.src})`,
        animation: `hero-play ${a.duration} steps(${a.frames}) ${a.loop ? 'infinite' : 'forwards'}`,
        ['--end-pos']: `-${HERO_FRAME_W * a.frames}px`,
        transform: facing === 'left' ? 'scaleX(-1)' : 'none',
      }}
    />
  );
}
```

- [ ] **Step 5: Lint + Build**

Run: `npm run lint && npm run build`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/constants/sprites.js src/components/Hero.jsx src/components/Hero.css
git commit -m "feat: Hero 스프라이트 컴포넌트 + sprites 상수 추가 (#12)"
```

---

### Task 3: useKeyboardMovement 훅

**Files:**
- Create: `src/hooks/useKeyboardMovement.js`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p src/hooks
```

- [ ] **Step 2: 훅 작성**

PRD §7.6 패턴. arrow 키는 `e.preventDefault()`로 페이지 스크롤 방지.

```js
// src/hooks/useKeyboardMovement.js
import { useEffect, useRef } from 'react';

const ARROW_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

/**
 * 매 프레임 onTick(keysObj)을 호출. keysObj는 { ArrowLeft: bool, ... }.
 * @param {{ enabled: boolean, onTick: (keys: Record<string, boolean>) => void }} opts
 */
export default function useKeyboardMovement({ enabled, onTick }) {
  const keysRef = useRef({});
  const onTickRef = useRef(onTick);

  useEffect(() => { onTickRef.current = onTick; }, [onTick]);

  useEffect(() => {
    if (!enabled) {
      keysRef.current = {};
      return;
    }
    const down = (e) => {
      if (ARROW_KEYS.includes(e.code) || e.code === 'Space') e.preventDefault();
      keysRef.current[e.code] = true;
    };
    const up = (e) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    let rafId;
    const loop = () => {
      onTickRef.current(keysRef.current);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      cancelAnimationFrame(rafId);
      keysRef.current = {};
    };
  }, [enabled]);
}
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useKeyboardMovement.js
git commit -m "feat: useKeyboardMovement 훅 추가 (#12)"
```

---

## Phase 2 — Vite 데모 정리 + App 라우터 골격

### Task 4: main.jsx에 GameProvider + App.jsx 스켈레톤 라우터

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/App.jsx` (전면 재작성)

- [ ] **Step 1: main.jsx 수정**

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { GameProvider } from './store/gameStore.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
)
```

- [ ] **Step 2: App.jsx 전면 재작성 (스켈레톤)**

이 단계에서는 모든 씬을 임시 div로 렌더해 라우터만 동작하게 함. 실제 씬 컴포넌트는 다음 task에서.

```jsx
// src/App.jsx
import { useEffect } from 'react';
import { useGame } from './store/gameStore.jsx';
import './App.css';

export default function App() {
  const { state, dispatch } = useGame();

  // armor 진입 시 갑옷 자동 장착
  useEffect(() => {
    if (state.scene === 'armor' && !state.hasArmor) {
      dispatch({ type: 'EQUIP_ARMOR' });
    }
  }, [state.scene, state.hasArmor, dispatch]);

  return (
    <div className="app-stage" key={state.scene}>
      {/* 씬 분기는 후속 task에서 채움 */}
      <div style={{ padding: 40, color: '#fff' }}>
        <h1>scene: {state.scene}</h1>
        <p>worldStage: {state.worldStage} / totalScore: {state.totalScore}</p>
        <button onClick={() => dispatch({ type: 'GO_TO_SCENE', payload: 'world' })}>go world</button>
        <button onClick={() => dispatch({ type: 'RESET' })}>reset</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build + Dev 서버 수동 확인**

```bash
npm run build
npm run dev
```

Expected: 빌드 성공 + dev 서버 띄워보면 "scene: intro / worldStage: 0 / totalScore: 0" 텍스트와 두 버튼 보임. "go world" 클릭 시 텍스트가 "scene: world"로 변경.

- [ ] **Step 4: Commit**

```bash
git add src/main.jsx src/App.jsx
git commit -m "refactor: App.jsx 씬 라우터 스켈레톤 + main.jsx GameProvider 적용 (#12)"
```

---

### Task 5: Vite 데모 자산 + App.css 정리

**Files:**
- Modify: `src/App.css` (Vite 데모 클래스 제거, app-stage 스타일 추가)
- Modify: `src/index.css` (Vite 기본 스타일 정리, 게임용 reset만 남김)
- Delete: `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png`
- Delete: `public/vite.svg` (있으면), `public/icons.svg` (사용처 없으면)

- [ ] **Step 1: 자산 사용처 확인**

```bash
grep -rn "react.svg\|vite.svg\|hero.png\|icons.svg" src/ public/ index.html
```

Expected: src/ 안에 react.svg/vite.svg/hero.png 참조 0건 (이전 task에서 App.jsx 재작성하며 import 모두 제거됨). public/icons.svg 참조도 모두 제거되었는지 확인.

- [ ] **Step 2: 사용 안 되는 자산 삭제**

```bash
rm -f src/assets/react.svg src/assets/vite.svg src/assets/hero.png
rm -f public/vite.svg
# icons.svg는 grep 결과가 0이면 삭제
[ -z "$(grep -rn icons.svg src/ public/ index.html 2>/dev/null)" ] && rm -f public/icons.svg
```

- [ ] **Step 3: App.css 정리**

App.css에서 Vite 데모 관련 클래스/ID(`.hero`, `.ticks`, `#center`, `#next-steps`, `#spacer`, `#docs`, `#social`, `.button-icon`, `.logo`, `.counter`, `.framework`, `.vite`, `.base`, `.icon` 등) 모두 제거. 새 라이아웃 + 페이드 keyframes 추가:

```css
/* src/App.css */
.app-stage {
  position: relative;
  width: 1200px;
  height: 600px;
  margin: 0 auto;
  background: #000;
  overflow: hidden;
  border: 2px solid #333;
}

.app-stage > * {
  animation: scene-fade-in 200ms ease-out;
}

@keyframes scene-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

> 기존 App.css의 다른 내용 중 미니게임에서 참조하는 게 있을 수 있으니 grep으로 확인 후 제거. 미니게임은 자기 CSS를 따로 가짐.

- [ ] **Step 4: index.css 검토**

`src/index.css` 열고 Vite 기본 reset/typography 중 게임에 필요한 것만 남기고 나머지(예: `:root` color-scheme 외 link/button 기본 스타일이 게임에 방해되면) 정리. 안전한 최소 변경:

```css
/* src/index.css 권장 최소 형태 */
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; }
body {
  background: #1a1a2e;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;  /* arrow 키 스크롤 방지 보강 */
}
#root { height: 100%; display: flex; align-items: center; justify-content: center; }
```

기존 index.css가 PRD에서 미니게임이 의존하는 keyframes를 갖고 있다면 보존.

- [ ] **Step 5: Lint + Build + Dev 수동 확인**

```bash
npm run lint && npm run build && npm run dev
```

Expected:
- Lint/Build 0 errors
- Dev 서버에서 빌드 경고(React/Vite/SNS 링크) 없음
- 검은 1200×600 박스 가운데에 Task 4의 임시 텍스트 보임

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: Vite 데모 마크업/자산/스타일 완전 제거 (#12)"
```

---

## Phase 3 — Scene 컴포넌트 구현

### Task 6: IntroScene

**Files:**
- Create: `src/scenes/IntroScene.jsx`
- Create: `src/scenes/IntroScene.css`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p src/scenes
```

- [ ] **Step 2: IntroScene.css 작성**

```css
/* src/scenes/IntroScene.css */
.intro-scene {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #0d1b2a 0%, #1b263b 100%);
  color: #fff;
  text-align: center;
  padding: 40px;
}
.intro-title { font-size: 48px; margin: 0 0 24px; letter-spacing: 4px; }
.intro-story { font-size: 18px; line-height: 1.7; max-width: 600px; margin: 0 0 40px; opacity: 0.9; }
.intro-start-btn {
  padding: 16px 40px; font-size: 20px; font-weight: bold;
  background: #4ade80; color: #0d1b2a; border: 4px solid #fff;
  cursor: pointer; image-rendering: pixelated;
}
.intro-start-btn:hover { background: #86efac; }
.intro-hint { margin-top: 24px; font-size: 14px; opacity: 0.6; }
```

- [ ] **Step 3: IntroScene.jsx 작성**

```jsx
// src/scenes/IntroScene.jsx
import { useEffect } from 'react';
import { useGame } from '../store/gameStore.jsx';
import './IntroScene.css';

export default function IntroScene() {
  const { dispatch } = useGame();

  const start = () => {
    dispatch({ type: 'SET_WORLD_STAGE', payload: 0 });
    dispatch({ type: 'GO_TO_SCENE', payload: 'world' });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="intro-scene">
      <h1 className="intro-title">용사 그린이의 대모험</h1>
      <p className="intro-story">
        평화롭던 그린 왕국에 어둠의 군주가 나타나 성을 점령했다.<br />
        우리의 그린이는 아직 약하지만, 훈련을 통해 점점 강해질 수 있다.
      </p>
      <button type="button" className="intro-start-btn" onClick={start}>▶ 시작 (Space)</button>
      <p className="intro-hint">← → 이동 / Space 시작·진입</p>
    </div>
  );
}
```

- [ ] **Step 4: App.jsx에 IntroScene 연결**

```jsx
// src/App.jsx 의 return 부분 수정
import IntroScene from './scenes/IntroScene.jsx';
// ...
return (
  <div className="app-stage" key={state.scene}>
    {state.scene === 'intro' && <IntroScene />}
    {state.scene !== 'intro' && (
      <div style={{ padding: 40, color: '#fff' }}>
        <h1>scene: {state.scene}</h1>
        <p>worldStage: {state.worldStage} / totalScore: {state.totalScore}</p>
        <button onClick={() => dispatch({ type: 'GO_TO_SCENE', payload: 'intro' })}>back to intro</button>
      </div>
    )}
  </div>
);
```

- [ ] **Step 5: Dev 서버 수동 확인**

```bash
npm run dev
```

Expected:
- 첫 화면에 "용사 그린이의 대모험" 인트로 보임
- Space 또는 시작 버튼 클릭 → "scene: world" 텍스트 화면으로
- 인트로에서 ↑↓는 페이지 스크롤 발생 안 함

- [ ] **Step 6: Commit**

```bash
git add src/scenes/IntroScene.jsx src/scenes/IntroScene.css src/App.jsx
git commit -m "feat: IntroScene 추가 + App 라우터 연결 (#12)"
```

---

### Task 7: PlaceholderScene + EndingScene

**Files:**
- Create: `src/scenes/PlaceholderScene.jsx`
- Create: `src/scenes/PlaceholderScene.css`
- Create: `src/scenes/EndingScene.jsx`

> EndingScene은 PlaceholderScene과 스타일 공유. 별도 컴포넌트로 두되 동일한 .css 사용.

- [ ] **Step 1: PlaceholderScene.css 작성**

```css
/* src/scenes/PlaceholderScene.css */
.placeholder-scene {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #1b263b 0%, #0d1b2a 100%);
  color: #fff;
  text-align: center;
  padding: 40px;
}
.placeholder-title { font-size: 36px; margin: 0 0 24px; }
.placeholder-desc { font-size: 18px; line-height: 1.7; max-width: 600px; margin: 0 0 32px; opacity: 0.9; }
.placeholder-score { font-size: 22px; font-weight: bold; margin: 0 0 32px; color: #ffd700; }
.placeholder-btn {
  padding: 14px 36px; font-size: 18px; font-weight: bold;
  background: #fbbf24; color: #0d1b2a; border: 4px solid #fff;
  cursor: pointer; image-rendering: pixelated;
}
.placeholder-btn:hover { background: #fcd34d; }
```

- [ ] **Step 2: PlaceholderScene.jsx 작성**

```jsx
// src/scenes/PlaceholderScene.jsx
import { useEffect } from 'react';
import { useGame } from '../store/gameStore.jsx';
import './PlaceholderScene.css';

export default function PlaceholderScene({ title, description, buttonLabel = '다음으로 → (Enter)', onContinue }) {
  const { state } = useGame();

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Enter') {
        e.preventDefault();
        onContinue?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue]);

  return (
    <div className="placeholder-scene">
      <h1 className="placeholder-title">{title}</h1>
      <p className="placeholder-desc">{description}</p>
      <p className="placeholder-score">현재 점수: {state.totalScore}점</p>
      <button type="button" className="placeholder-btn" onClick={onContinue}>{buttonLabel}</button>
    </div>
  );
}
```

- [ ] **Step 3: EndingScene.jsx 작성**

```jsx
// src/scenes/EndingScene.jsx
import { useEffect } from 'react';
import { useGame } from '../store/gameStore.jsx';
import './PlaceholderScene.css';

export default function EndingScene() {
  const { state, dispatch } = useGame();

  const reset = () => dispatch({ type: 'RESET' });

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyR' || e.code === 'Enter') {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="placeholder-scene">
      <h1 className="placeholder-title">🏁 모험 종료</h1>
      <p className="placeholder-score">총점 {state.totalScore}점</p>
      <p className="placeholder-desc">(엔딩 등급/연출은 별도 이슈에서 구현 예정)</p>
      <button type="button" className="placeholder-btn" onClick={reset}>처음부터 (R)</button>
    </div>
  );
}
```

- [ ] **Step 4: App.jsx에 placeholder 4개 + ending 연결**

```jsx
// src/App.jsx 의 return 부분 (점진적 채움)
import IntroScene from './scenes/IntroScene.jsx';
import PlaceholderScene from './scenes/PlaceholderScene.jsx';
import EndingScene from './scenes/EndingScene.jsx';

// ...

return (
  <div className="app-stage" key={state.scene}>
    {state.scene === 'intro' && <IntroScene />}
    {state.scene === 'world' && (
      <div style={{ padding: 40, color: '#fff' }}>
        <h1>WorldScene (Task 8 예정)</h1>
        <p>worldStage: {state.worldStage} / totalScore: {state.totalScore}</p>
        <button onClick={() => {
          const next = state.worldStage < 3
            ? `minigame_${state.worldStage + 1}`
            : 'armor';
          dispatch({ type: 'GO_TO_SCENE', payload: next });
        }}>다음 씬 (임시)</button>
      </div>
    )}
    {/* MG1~3는 Task 9~11에서 연결, 일단 placeholder로 */}
    {state.scene === 'minigame_1' && (
      <PlaceholderScene title="🎯 미니게임 1: 10초" description="(Task 9에서 연결)"
        onContinue={() => { dispatch({ type: 'SET_WORLD_STAGE', payload: 1 }); dispatch({ type: 'GO_TO_SCENE', payload: 'world' }); }} />
    )}
    {state.scene === 'minigame_2' && (
      <PlaceholderScene title="🗿 미니게임 2: 색상반응" description="(Task 10에서 연결)"
        onContinue={() => { dispatch({ type: 'SET_WORLD_STAGE', payload: 2 }); dispatch({ type: 'GO_TO_SCENE', payload: 'world' }); }} />
    )}
    {state.scene === 'minigame_3' && (
      <PlaceholderScene title="⚔️ 미니게임 3: 캐치" description="(Task 11에서 연결)"
        onContinue={() => { dispatch({ type: 'SET_WORLD_STAGE', payload: 3 }); dispatch({ type: 'GO_TO_SCENE', payload: 'world' }); }} />
    )}
    {state.scene === 'armor' && (
      <PlaceholderScene title="🛡 갑옷 장착" description="훈련을 마친 그린이! 갑옷과 검을 손에 넣었다!"
        onContinue={() => dispatch({ type: 'GO_TO_SCENE', payload: 'minigame_4' })} />
    )}
    {state.scene === 'minigame_4' && (
      <PlaceholderScene title="⚔️ 미니게임 4: 병렬 진행" description="(별도 이슈에서 구현 예정)"
        onContinue={() => dispatch({ type: 'GO_TO_SCENE', payload: 'boss_fight' })} />
    )}
    {state.scene === 'boss_fight' && (
      <PlaceholderScene title="🔥 보스전" description="(별도 이슈에서 구현 예정)"
        onContinue={() => dispatch({ type: 'GO_TO_SCENE', payload: 'ending' })} />
    )}
    {state.scene === 'ending' && <EndingScene />}
  </div>
);
```

- [ ] **Step 5: Dev 서버 수동 확인**

Run: `npm run dev`

Expected (intro → world(임시) → minigame_1 placeholder → world → ... → ending → 다시 intro):
- intro에서 Space → world(Task 8 예정 텍스트)
- "다음 씬 (임시)" 버튼 → minigame_1 placeholder
- placeholder의 "다음으로" 버튼/Enter → world로 복귀
- 3번 반복하면 worldStage 3에서 armor placeholder로
- armor → mg4 → boss → ending 순서로 Enter 진행
- ending에서 R 또는 클릭 → intro 복귀, totalScore 0으로 리셋

- [ ] **Step 6: Commit**

```bash
git add src/scenes/PlaceholderScene.jsx src/scenes/PlaceholderScene.css src/scenes/EndingScene.jsx src/App.jsx
git commit -m "feat: PlaceholderScene + EndingScene + 라우터 분기 추가 (#12)"
```

---

### Task 8: WorldScene (그린이 이동 + 체크포인트)

**Files:**
- Create: `src/scenes/WorldScene.jsx`
- Create: `src/scenes/WorldScene.css`
- Modify: `src/App.jsx` (임시 world 마크업 → WorldScene으로 교체)

- [ ] **Step 1: WorldScene.css 작성**

```css
/* src/scenes/WorldScene.css */
.world-scene {
  position: absolute;
  inset: 0;
  background: url('/bg/world.png') center bottom / cover no-repeat;
  image-rendering: pixelated;
  overflow: hidden;
}

.world-hud {
  position: absolute;
  top: 12px; left: 12px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  border: 2px solid #fff;
  z-index: 10;
}

.world-checkpoint {
  position: absolute;
  bottom: 151px;
  left: 1050px;
  width: 80px;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  pointer-events: none;
  z-index: 5;
}
.world-checkpoint-post {
  width: 12px;
  height: 80px;
  background: linear-gradient(180deg, #6b3410 0%, #4a2308 100%);
  border: 2px solid #2a1404;
}
.world-checkpoint-sign {
  position: absolute;
  top: 0;
  width: 80px;
  padding: 6px;
  background: #d97706;
  border: 3px solid #2a1404;
  color: #fff;
  font-size: 12px;
  font-weight: bold;
  text-align: center;
  white-space: nowrap;
}

.world-toast {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 28px;
  background: rgba(0, 0, 0, 0.85);
  color: #fbbf24;
  font-size: 18px;
  font-weight: bold;
  border: 3px solid #fbbf24;
  z-index: 20;
  animation: world-toast-pulse 0.8s ease-in-out infinite alternate;
}
@keyframes world-toast-pulse {
  from { transform: translateX(-50%) scale(1); opacity: 0.85; }
  to   { transform: translateX(-50%) scale(1.05); opacity: 1; }
}
```

- [ ] **Step 2: WorldScene.jsx 작성**

```jsx
// src/scenes/WorldScene.jsx
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../store/gameStore.jsx';
import useKeyboardMovement from '../hooks/useKeyboardMovement.js';
import Hero from '../components/Hero.jsx';
import './WorldScene.css';

const HERO_SPEED_PX_PER_S = 200;
const HERO_X_MIN = 100;
const HERO_X_MAX = 1100;
const CHECKPOINT_X = 1000;

const STAGE_LABELS = ['MG1 ▼', 'MG2 ▼', 'MG3 ▼', '갑옷 ▼'];
const STAGE_NEXT_SCENE = ['minigame_1', 'minigame_2', 'minigame_3', 'armor'];

export default function WorldScene() {
  const { state, dispatch } = useGame();
  const [heroX, setHeroX] = useState(HERO_X_MIN);
  const [facing, setFacing] = useState('right');
  const [isMoving, setIsMoving] = useState(false);
  const lastTimeRef = useRef(performance.now());
  const heroXRef = useRef(HERO_X_MIN);

  // 매 프레임 호출
  useKeyboardMovement({
    enabled: true,
    onTick: (keys) => {
      const now = performance.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      let dx = 0;
      if (keys.ArrowRight) dx += HERO_SPEED_PX_PER_S * dt;
      if (keys.ArrowLeft) dx -= HERO_SPEED_PX_PER_S * dt;

      if (dx !== 0) {
        const next = Math.max(HERO_X_MIN, Math.min(HERO_X_MAX, heroXRef.current + dx));
        if (next !== heroXRef.current) {
          heroXRef.current = next;
          setHeroX(next);
          setIsMoving(true);
          setFacing(dx > 0 ? 'right' : 'left');
        } else {
          setIsMoving(false);
        }
      } else {
        setIsMoving(false);
      }
    },
  });

  // Space로 체크포인트 진입 (별도 keydown 리스너; useKeyboardMovement는 이동 전용)
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (heroXRef.current >= CHECKPOINT_X) {
          const nextScene = STAGE_NEXT_SCENE[state.worldStage];
          dispatch({ type: 'GO_TO_SCENE', payload: nextScene });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.worldStage, dispatch]);

  const atCheckpoint = heroX >= CHECKPOINT_X;
  const label = STAGE_LABELS[state.worldStage] ?? '???';

  return (
    <div className="world-scene">
      <div className="world-hud">누적 점수: {state.totalScore}</div>

      <div className="world-checkpoint" aria-hidden="true">
        <div className="world-checkpoint-sign">{label}</div>
        <div className="world-checkpoint-post" />
      </div>

      <Hero
        x={heroX}
        action="walk_no_weapon"
        playing={isMoving}
        facing={facing}
      />

      {atCheckpoint && <div className="world-toast">Space로 시작</div>}
    </div>
  );
}
```

- [ ] **Step 3: App.jsx의 임시 world 분기 교체**

```jsx
import WorldScene from './scenes/WorldScene.jsx';
// ...
{state.scene === 'world' && <WorldScene />}
// (이전 임시 div + "다음 씬 (임시)" 버튼 코드 삭제)
```

- [ ] **Step 4: Dev 서버 수동 확인**

Run: `npm run dev`

Expected:
- intro → Space → world에 그린이가 좌측(x=100)에 등장
- → 누르면 우측 이동 + walk 애니메이션
- ← 누르면 좌측 이동 + facing 좌측 (스프라이트 좌우 반전)
- 우측 가장자리(x=1100)에서 멈춤 + 좌측(x=100) 가장자리에서 멈춤
- x≥1000 도달 시 화면 하단에 "Space로 시작" 토스트
- 토스트 떴을 때 Space → minigame_1 placeholder 진입
- 좌상단 HUD에 "누적 점수: 0"

- [ ] **Step 5: Build + Lint 검증**

```bash
npm run lint && npm run build
```

Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/scenes/WorldScene.jsx src/scenes/WorldScene.css src/App.jsx
git commit -m "feat: WorldScene 그린이 이동 + 체크포인트 진입 시스템 (#12)"
```

---

## Phase 4 — 미니게임 통합

### Task 9: TenSecondsGame에 점수 함수 + props 추가

**Files:**
- Modify: `src/components/TenSecondsGame/gameUtils.js` (getScore 추가)
- Modify: `src/components/TenSecondsGame/TenSecondsGame.jsx` (autoStart/onComplete/onContinue props)

- [ ] **Step 1: gameUtils.js에 getScore 추가**

PRD §2.1 점수 공식. 기존 파일 끝에 append:

```js
// src/components/TenSecondsGame/gameUtils.js (기존 + 아래 추가)

/**
 * PRD §2.1: ±0.1초 100, ±0.3초 70, ±0.5초 40, 그 외 10.
 * @param {number} diff |finalTime - 10| (초)
 */
export function getScore(diff) {
  if (diff <= 0.1) return 100;
  if (diff <= 0.3) return 70;
  if (diff <= 0.5) return 40;
  return 10;
}
```

- [ ] **Step 2: TenSecondsGame.jsx 수정 (props + autoStart + 결과 패널 버튼)**

기존 컴포넌트에 변경할 핵심:
1. props 추가: `autoStart`, `onComplete`, `onContinue`
2. mount 시 `autoStart && phase === 'idle'`이면 자동 시작 (한 번만)
3. `stopGame` 끝부분에서 `onComplete(getScore(diff))` 호출
4. Space 시작 키: `autoStart` 일 때 비활성화
5. 결과 패널: `onContinue` 있으면 "다시하기/처음으로" 숨기고 "다음으로 → (Enter)" 버튼 1개 + Enter 키 리스너

전체 변경된 컴포넌트:

```jsx
// src/components/TenSecondsGame/TenSecondsGame.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { TARGET, getResult, getScore } from "./gameUtils";
import { Clouds, FarBg, Trees } from "./BackgroundElements";
import StarRating from "./StarRating";
import "./TenSecondsGame.css";

export default function TenSecondsGame({ autoStart = false, onComplete, onContinue }) {
  const [phase, setPhase] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const [finalTime, setFinalTime] = useState(null);
  const [shake, setShake] = useState(false);

  const startRef = useRef(null);
  const rafRef = useRef(null);
  const completedRef = useRef(false); // onComplete 중복 호출 방지

  const tick = useCallback(() => {
    const t = (performance.now() - startRef.current) / 1000;
    setElapsed(t);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startGame = useCallback(() => {
    if (phase === "running") return;
    completedRef.current = false;
    startRef.current = performance.now();
    setElapsed(0);
    setFinalTime(null);
    setPhase("running");
    rafRef.current = requestAnimationFrame(tick);
  }, [phase, tick]);

  const stopGame = useCallback(() => {
    if (phase !== "running") return;
    cancelAnimationFrame(rafRef.current);
    const t = (performance.now() - startRef.current) / 1000;
    setFinalTime(t);
    setPhase("result");
    if (!completedRef.current) {
      completedRef.current = true;
      const diff = Math.abs(t - TARGET);
      onComplete?.(getScore(diff));
    }
  }, [phase, onComplete]);

  const resetGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPhase("idle");
    setElapsed(0);
    setFinalTime(null);
    completedRef.current = false;
  }, []);

  // autoStart: mount 시 한 번만
  useEffect(() => {
    if (autoStart) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // 키보드: ← 정지, Space 시작(autoStart=false일 때만), Enter 다음으로(result + onContinue)
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "ArrowLeft") { e.preventDefault(); stopGame(); }
      else if (e.code === "Space" && !autoStart) {
        e.preventDefault();
        if (phase !== "running") startGame();
      }
      else if (e.code === "Enter" && phase === "result" && onContinue) {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, startGame, stopGame, autoStart, onContinue]);

  useEffect(() => {
    setShake(phase === "running" && elapsed >= 9);
  }, [elapsed, phase]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const displayTime = phase === "result" ? finalTime : elapsed;
  const diff = finalTime !== null ? Math.abs(finalTime - TARGET) : null;
  const result = diff !== null ? getResult(diff) : null;
  const score = diff !== null ? getScore(diff) : null;

  let timerUrgency = "";
  if (phase === "running") {
    if (displayTime >= 9) timerUrgency = "urgency-critical";
    else if (displayTime >= 7) timerUrgency = "urgency-warn";
  }

  return (
    <div className={`game-world ${shake ? "world-shake" : ""}`}>
      <Clouds />
      <FarBg />
      <Trees />

      <div className="ground-strip" aria-hidden="true">
        <div className="ground-grass-row" />
        <div className="ground-dirt-row" />
        <div className="ground-sub-row" />
      </div>

      <div className="game-ground-block">
        <div className="grass-top" aria-hidden="true">
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className={`grass-blade grass-blade-${(i % 6) + 1}`} />
          ))}
        </div>

        <div className="game-inner">
          <div className="sign-board">
            <span className="sign-icon">⏱</span>
            <span className="sign-text">10초  맞추기</span>
            <span className="sign-icon">⏱</span>
          </div>
          <p className="sign-subtitle">그린이의 시련 — 정확히 10.00초에 멈춰라!</p>

          <div className={`timer-board ${timerUrgency}`}>
            <div className="timer-inner">
              <span className="timer-digits">
                {displayTime.toFixed(2)}<span className="timer-unit">s</span>
              </span>
            </div>
            <div className="timer-label">ELAPSED TIME</div>
          </div>

          <div className="controls-area">
            {phase === "idle" && !autoStart && (
              <button className="pixel-btn pixel-btn-green" onClick={startGame}>
                <span>▶ 시작 (Space)</span>
              </button>
            )}
            {phase === "running" && (
              <button className="pixel-btn pixel-btn-red" onClick={stopGame}>
                <span>◼ 정지 (← 방향키)</span>
              </button>
            )}
            {phase === "result" && (
              onContinue ? (
                <button className="pixel-btn pixel-btn-yellow" onClick={onContinue}>
                  <span>다음으로 → (Enter)</span>
                </button>
              ) : (
                <div className="result-btns">
                  <button className="pixel-btn pixel-btn-yellow" onClick={startGame}>
                    <span>▶ 다시하기 (Space)</span>
                  </button>
                  <button className="pixel-btn pixel-btn-gray" onClick={resetGame}>
                    <span>↩ 처음으로</span>
                  </button>
                </div>
              )
            )}
          </div>

          {phase === "idle" && !autoStart && (
            <p className="hint-text">Space를 눌러 타이머를 시작하고,<br />← 방향키로 10.00초에 멈추세요!</p>
          )}
          {phase === "running" && (
            <p className="hint-text running-hint">
              {displayTime >= 9 ? "🚨 지금이다! 멈춰!!!" : displayTime >= 7 ? "⚠️ 슬슬 준비해..." : "타이머가 흘러가고 있다..."}
            </p>
          )}

          {phase === "result" && result && (
            <div className="result-panel" style={{ "--result-color": result.color }}>
              <div className="result-grade-badge" data-grade={result.grade}>{result.grade}</div>
              <div className="result-title" style={{ color: result.color }}>{result.title}</div>
              <StarRating count={result.stars} />
              <div className="result-stats">
                <div className="stat-row">
                  <span className="stat-label">기록 시간</span>
                  <span className="stat-value">{finalTime.toFixed(3)}s</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">목표 시간</span>
                  <span className="stat-value">10.000s</span>
                </div>
                <div className="stat-row stat-row-highlight">
                  <span className="stat-label">오차</span>
                  <span className="stat-value">{diff < 0.001 ? "PERFECT" : `± ${diff.toFixed(3)}s`}</span>
                </div>
                {score !== null && (
                  <div className="stat-row stat-row-highlight">
                    <span className="stat-label">점수</span>
                    <span className="stat-value">+{score}</span>
                  </div>
                )}
              </div>
              <p className="result-desc">{result.desc}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: App.jsx에 TenSecondsGame 연결 (placeholder 교체)**

```jsx
import TenSecondsGame from './components/TenSecondsGame/TenSecondsGame';
// ...
{state.scene === 'minigame_1' && (
  <TenSecondsGame
    autoStart
    onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
    onContinue={() => {
      dispatch({ type: 'SET_WORLD_STAGE', payload: 1 });
      dispatch({ type: 'GO_TO_SCENE', payload: 'world' });
    }}
  />
)}
```

- [ ] **Step 4: Dev 수동 확인**

Run: `npm run dev`

Expected:
- intro → world → 우측 끝 → Space → MG1 자동 시작 (Space 추가 입력 불필요, 시작 버튼 안 보임)
- 약 10초 후 ← 누르면 결과 패널 + "+점수" 표시 + "다음으로 →" 버튼만 (다시하기/처음으로 안 보임)
- Enter 또는 클릭 → world stage 1로 복귀, HUD 점수 갱신

- [ ] **Step 5: Build + Lint**

```bash
npm run lint && npm run build
```

Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/components/TenSecondsGame/gameUtils.js src/components/TenSecondsGame/TenSecondsGame.jsx src/App.jsx
git commit -m "feat: TenSecondsGame autoStart/onComplete/onContinue + getScore 추가 (#12)"
```

---

### Task 10: ColorReactionGame에 점수 함수 + props 추가

**Files:**
- Modify: `src/components/ColorReactionGame/reactionUtils.js`
- Modify: `src/components/ColorReactionGame/ColorReactionGame.jsx`

- [ ] **Step 1: reactionUtils.js에 getScore 추가**

PRD §2.2 점수 공식. 기존 파일 끝에 append:

```js
// src/components/ColorReactionGame/reactionUtils.js (기존 + 아래 추가)

/**
 * PRD §2.2: 0.2s 100, 0.4s 70, 0.6s 40, 그 이상 10.
 * @param {number} ms 반응 시간 (밀리초)
 */
export function getScore(ms) {
  if (ms <= 200) return 100;
  if (ms <= 400) return 70;
  if (ms <= 600) return 40;
  return 10;
}
```

- [ ] **Step 2: ColorReactionGame.jsx 수정**

핵심 변경:
1. props 추가
2. `endGame('result')` → `onComplete(getScore(reactionTime))`
3. `endGame('early')` → `onComplete(-20)` (PRD §2.2 페이크 페널티)
4. `endGame('timeout')` → `onComplete(0)`
5. autoStart로 mount 시 즉시 startGame
6. result/early/timeout 패널 버튼: `onContinue` 있으면 "다음으로 → (Enter)"로 교체 + Enter 리스너

```jsx
// src/components/ColorReactionGame/ColorReactionGame.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { getReactionResult, getScore } from "./reactionUtils";
import "./ColorReactionGame.css";

export default function ColorReactionGame({ autoStart = false, onComplete, onContinue }) {
  const [phase, setPhase] = useState("idle");
  const [timeLeft, setTimeLeft] = useState(10.00);
  const [reactionTime, setReactionTime] = useState(0);

  const glowStartTimeRef = useRef(null);
  const timeoutIdRef = useRef(null);
  const gameIntervalRef = useRef(null);
  const completedRef = useRef(false);

  const startGame = useCallback(() => {
    completedRef.current = false;
    setPhase("waiting");
    setTimeLeft(10.00);
    setReactionTime(0);

    gameIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.01) {
          endGame("timeout");
          return 0;
        }
        return prev - 0.01;
      });
    }, 10);

    // 4~10초 사이 랜덤 (사용자 IDE 변경 반영)
    const randomDelay = Math.random() * 6000 + 4000;
    timeoutIdRef.current = setTimeout(() => {
      setPhase("react");
      glowStartTimeRef.current = performance.now();
    }, randomDelay);
  }, []);

  const endGame = useCallback((reason, computedScore = null) => {
    clearInterval(gameIntervalRef.current);
    clearTimeout(timeoutIdRef.current);
    setPhase(reason);
    if (!completedRef.current) {
      completedRef.current = true;
      const score = computedScore !== null
        ? computedScore
        : reason === 'early' ? -20
          : reason === 'timeout' ? 0
            : 0; // 'result'는 호출 측에서 직접 score 전달
      onComplete?.(score);
    }
  }, [onComplete]);

  // 키보드: ↑ 반응, Space 시작(autoStart=false), Enter 다음으로
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "ArrowUp") {
        e.preventDefault();
        if (phase === "waiting") {
          endGame("early");
        } else if (phase === "react") {
          const rTime = performance.now() - glowStartTimeRef.current;
          const ms = Math.floor(rTime);
          setReactionTime(ms);
          endGame("result", getScore(ms));
        }
      } else if (e.code === "Space" && !autoStart) {
        e.preventDefault();
        if (["idle", "result", "early", "timeout"].includes(phase)) {
          startGame();
        }
      } else if (e.code === "Enter"
                 && ["result", "early", "timeout"].includes(phase)
                 && onContinue) {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, startGame, endGame, autoStart, onContinue]);

  // autoStart: mount 시 한 번
  useEffect(() => {
    if (autoStart) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    return () => {
      clearInterval(gameIntervalRef.current);
      clearTimeout(timeoutIdRef.current);
    };
  }, []);

  const resultData = phase === "result" ? getReactionResult(reactionTime) : null;
  const isGlowing = phase === "react";
  const score = phase === "result" ? getScore(reactionTime)
              : phase === "early"  ? -20
              : phase === "timeout" ? 0
              : null;

  return (
    <div className={`dungeon-world ${isGlowing ? "dungeon-alert" : ""}`}>
      {(phase === "waiting" || phase === "react") && (
        <div className="dungeon-timer">
          남은 시간: {timeLeft.toFixed(2)}s
        </div>
      )}

      <div className={`stone-statue-container ${isGlowing ? "shake-hard" : "breathe-slow"}`}>
        <div className="statue-greenie">
          <div className="greenie-head">
            <div className="greenie-horns">
              <div className="horn left-horn"></div>
              <div className="horn right-horn"></div>
            </div>
            <div className="greenie-eyes">
              <div className={`eye left-eye ${isGlowing ? "eye-glow" : ""}`}></div>
              <div className={`eye right-eye ${isGlowing ? "eye-glow" : ""}`}></div>
            </div>
            <div className="greenie-snout">
              <div className="nostril left-nostril"></div>
              <div className="nostril right-nostril"></div>
            </div>
          </div>
          <div className="greenie-neck">
            <div className="stone-spot spot-1"></div>
            <div className="stone-spot spot-2"></div>
            <div className="stone-spot spot-3"></div>
            <div className="stone-crack crack-1"></div>
            <div className="stone-crack crack-2"></div>
          </div>
        </div>
      </div>

      <div className="dungeon-ui-overlay">
        {phase === "idle" && !autoStart && (
          <div className="dungeon-panel start-panel">
            <h2 className="dungeon-title">🗿 침묵의 석상</h2>
            <p>석상의 눈에 <b>붉은 안광</b>이 서리면 ⬆️키를 누르세요!</p>
            <p className="dungeon-warning">주의: 빛나기 전에 움직이면 즉사합니다.</p>
            <button className="dungeon-btn start-btn" onClick={startGame}>
              ▶ 던전 입장 (Space)
            </button>
          </div>
        )}

        {phase === "early" && (
          <div className="dungeon-panel error-panel">
            <h2>💥 끔찍한 죽음</h2>
            <p>석상이 빛나기 전에 움직였습니다!</p>
            {score !== null && <p style={{ color: '#fca5a5', fontWeight: 'bold' }}>점수: {score}</p>}
            {onContinue
              ? <button className="dungeon-btn" onClick={onContinue}>다음으로 → (Enter)</button>
              : <button className="dungeon-btn" onClick={startGame}>다시 도전 (Space)</button>}
          </div>
        )}

        {phase === "timeout" && (
          <div className="dungeon-panel error-panel">
            <h2>⏰ 시간 초과</h2>
            <p>던전이 무너져 내렸습니다.</p>
            {score !== null && <p style={{ color: '#fbbf24', fontWeight: 'bold' }}>점수: +{score}</p>}
            {onContinue
              ? <button className="dungeon-btn" onClick={onContinue}>다음으로 → (Enter)</button>
              : <button className="dungeon-btn" onClick={startGame}>다시 도전 (Space)</button>}
          </div>
        )}

        {phase === "result" && resultData && (
          <div className="dungeon-panel result-panel">
            <h2 style={{ color: resultData.color }}>{resultData.title}</h2>
            <h1 className="reaction-time-text">{reactionTime} ms</h1>
            {score !== null && <p style={{ color: '#fbbf24', fontWeight: 'bold' }}>점수: +{score}</p>}
            <p className="result-desc">{resultData.desc}</p>
            {onContinue
              ? <button className="dungeon-btn" onClick={onContinue}>다음으로 → (Enter)</button>
              : <button className="dungeon-btn" onClick={startGame}>다시 도전 (Space)</button>}
          </div>
        )}

        {(phase === "waiting" || phase === "react") && (
          <div className="instruction-toast">
            {phase === "waiting" ? "숨을 죽이고 석상을 주시하십시오..." : "지금입니다! ⬆️ 방향키를 누르세요!!"}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: App.jsx에 ColorReactionGame 연결**

```jsx
import ColorReactionGame from './components/ColorReactionGame/ColorReactionGame';
// ...
{state.scene === 'minigame_2' && (
  <ColorReactionGame
    autoStart
    onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
    onContinue={() => {
      dispatch({ type: 'SET_WORLD_STAGE', payload: 2 });
      dispatch({ type: 'GO_TO_SCENE', payload: 'world' });
    }}
  />
)}
```

- [ ] **Step 4: Dev 수동 확인**

Run: `npm run dev`

Expected:
- world stage 1 → 우측 끝 → Space → MG2 자동 시작 (waiting)
- ↑를 빨리(<=200ms) → result 100점, "다음으로" 버튼/Enter
- ↑를 너무 일찍(waiting 중) → early -20점
- 10초 안 누르면 → timeout 0점
- 모든 종료 패널에서 Enter/클릭 → world stage 2로

- [ ] **Step 5: Build + Lint**

```bash
npm run lint && npm run build
```

Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/components/ColorReactionGame/reactionUtils.js src/components/ColorReactionGame/ColorReactionGame.jsx src/App.jsx
git commit -m "feat: ColorReactionGame autoStart/onComplete/onContinue + getScore 추가 (#12)"
```

---

### Task 11: CatchGame에 props 추가

**Files:**
- Modify: `src/components/CatchGame/CatchGame.jsx`

> CatchGame은 이미 `score` state 보유. getScore 함수 추가 불필요.

- [ ] **Step 1: CatchGame.jsx 수정**

핵심 변경:
1. props 추가: `autoStart`, `onComplete`, `onContinue`
2. autoStart 시 mount → startGame 한 번
3. `endTimeoutRef` 콜백(게임 종료, `setPhase('result')`) 안에서 `onComplete(score)` 호출
4. result 패널 버튼: `onContinue` 있으면 "다음으로 → (Enter)"로 교체 + Enter 리스너

기존 컴포넌트의 startGame 안 endTimeoutRef 콜백 위치를 찾아 수정. 핵심 부분만:

```jsx
// src/components/CatchGame/CatchGame.jsx 의 변경 포인트

// 1. 함수 시그니처
export default function CatchGame({ autoStart = false, onComplete, onContinue }) {
  // ...기존 state 그대로...
  const completedRef = useRef(false);

  // ...기존 useEffect들 그대로...

  // 2. startGame 안의 endTimeoutRef 콜백 수정
  const startGame = useCallback(() => {
    cleanupTimers();
    setActiveItems([]);
    setElapsedMs(0);
    setScore(0);
    setCounts({ perfect: 0, near: 0, fail: 0, miss: 0 });
    setFeedback(null);
    completedRef.current = false;       // [추가]
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
      if (!completedRef.current) {              // [추가]
        completedRef.current = true;            // [추가]
        // setScore 호출 후이므로 closure score는 stale.
        // setScore의 최신값을 읽으려면 ref 미러 필요. 간단히 별도 ref 추가:
      }
    }, GAME_DURATION_MS);
  }, [cleanupTimers, spawnItem]);

  // ...
}
```

> **주의:** `score`는 setScore로 갱신되어 endTimeoutRef 콜백 안의 closure에선 stale일 수 있음. ref 미러 필요. 정확한 구현:

```jsx
// src/components/CatchGame/CatchGame.jsx (전체 변경된 핵심부)
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GAME_DURATION_MS,
  FALL_DURATION_MS,
  STAGE_HEIGHT_PX,
  RED_CIRCLE_TOP_RATIO,
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

let nextItemId = 1;

export default function CatchGame({ autoStart = false, onComplete, onContinue }) {
  const [phase, setPhase] = useState('idle');
  const [activeItems, setActiveItems] = useState([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [score, setScore] = useState(0);
  const [counts, setCounts] = useState({ perfect: 0, near: 0, fail: 0, miss: 0 });
  const [feedback, setFeedback] = useState(null);

  const gameStartMsRef = useRef(0);
  const spawnTimeoutsRef = useRef([]);
  const cleanupTimeoutsRef = useRef([]);
  const endTimeoutRef = useRef(null);
  const tickIntervalRef = useRef(null);
  const activeItemsRef = useRef([]);
  const phaseRef = useRef('idle');
  const feedbackTimeoutRef = useRef(null);
  const feedbackIdRef = useRef(0);
  const scoreRef = useRef(0);          // [추가] endTimeoutRef closure stale 방지
  const completedRef = useRef(false);  // [추가]

  useEffect(() => { activeItemsRef.current = activeItems; }, [activeItems]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { scoreRef.current = score; }, [score]);   // [추가]

  // ... (removeItem, showFeedback, spawnItem, cleanupTimers는 기존 그대로) ...

  const startGame = useCallback(() => {
    cleanupTimers();
    setActiveItems([]);
    setElapsedMs(0);
    setScore(0);
    scoreRef.current = 0;                // [추가]
    setCounts({ perfect: 0, near: 0, fail: 0, miss: 0 });
    setFeedback(null);
    completedRef.current = false;        // [추가]
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
      if (!completedRef.current) {              // [추가]
        completedRef.current = true;
        onComplete?.(scoreRef.current);
      }
    }, GAME_DURATION_MS);
  }, [cleanupTimers, spawnItem, onComplete]);   // [수정] onComplete 의존성 추가

  // 키보드 (기존 + Enter 처리 추가)
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (phaseRef.current !== 'running') return;
        const nowSinceStart = performance.now() - gameStartMsRef.current;
        const items = activeItemsRef.current;
        if (items.length === 0) return;

        let bestId = null;
        let bestDist = Infinity;
        const circleTopPx = RED_CIRCLE_TOP_RATIO * STAGE_HEIGHT_PX;
        for (const it of items) {
          const elapsed = nowSinceStart - it.spawnAt;
          if (elapsed < 0) continue;
          const y = getItemY(elapsed, STAGE_HEIGHT_PX, FALL_DURATION_MS);
          const dist = Math.abs(y - circleTopPx);
          if (dist < bestDist) { bestDist = dist; bestId = it.id; }
        }
        if (bestId === null) return;
        if (bestDist > HIT_RANGE_MAX) {
          setCounts((c) => ({ ...c, fail: c.fail + 1 }));
          showFeedback('fail', 'FAIL');
          return;
        }
        const result = judgeHit(bestDist);
        setScore((s) => s + result.score);
        setCounts((c) => ({ ...c, [result.kind]: c[result.kind] + 1 }));
        const label = result.kind === 'perfect' ? 'PERFECT +50'
                    : result.kind === 'near'    ? 'GOOD +20'
                    :                              'FAIL';
        showFeedback(result.kind, label);
        removeItem(bestId);
      } else if (e.code === 'Space' && !autoStart) {            // [수정]
        e.preventDefault();
        if (phaseRef.current === 'idle' || phaseRef.current === 'result') {
          startGame();
        }
      } else if (e.code === 'Enter'                              // [추가]
                 && phaseRef.current === 'result'
                 && onContinue) {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [removeItem, startGame, showFeedback, autoStart, onContinue]);

  useEffect(() => () => cleanupTimers(), [cleanupTimers]);

  // autoStart                                                       // [추가]
  useEffect(() => {
    if (autoStart) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // ... (return JSX 기존 그대로 + 결과 패널의 버튼만 onContinue 분기) ...
}
```

결과 패널 버튼 분기 (return 안 result 패널):

```jsx
{phase === 'result' && (() => {
  const result = getCatchResult(score);
  const totalJudged = counts.perfect + counts.near + counts.fail + counts.miss;
  return (
    <div className="catch-panel catch-panel-result" style={{ '--catch-result-color': result.color }}>
      <div className="catch-grade-badge" data-grade={result.grade}>{result.grade}</div>
      <div className="catch-result-title" style={{ color: result.color }}>{result.title}</div>
      <StarRating count={result.stars} />
      <div className="catch-stats">
        <div className="catch-stat-row"><span>총점</span><span className="catch-stat-value">+{score}</span></div>
        <div className="catch-stat-row"><span>완벽 (50점)</span><span>{counts.perfect}</span></div>
        <div className="catch-stat-row"><span>근접 (20점)</span><span>{counts.near}</span></div>
        <div className="catch-stat-row"><span>실패 / 놓침</span><span>{counts.fail + counts.miss}</span></div>
        <div className="catch-stat-row catch-stat-row-highlight"><span>판정 횟수</span><span>{totalJudged}</span></div>
      </div>
      <p className="catch-result-desc">{result.desc}</p>

      <div className="catch-result-btns">
        {onContinue ? (
          <button className="catch-btn catch-btn-primary" onClick={onContinue} type="button">
            다음으로 → (Enter)
          </button>
        ) : (
          <>
            <button className="catch-btn catch-btn-primary" onClick={startGame} type="button">
              ▶ 다시 도전 (Space)
            </button>
            <button className="catch-btn catch-btn-ghost" onClick={() => setPhase('idle')} type="button">
              ↩ 처음으로
            </button>
          </>
        )}
      </div>
    </div>
  );
})()}
```

idle 패널 시작 버튼도 `!autoStart` 가드:

```jsx
{phase === 'idle' && !autoStart && (
  <div className="catch-panel catch-panel-start">
    {/* ... 기존 내용 ... */}
  </div>
)}
```

- [ ] **Step 2: App.jsx에 CatchGame 연결**

```jsx
import CatchGame from './components/CatchGame/CatchGame';
// ...
{state.scene === 'minigame_3' && (
  <CatchGame
    autoStart
    onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
    onContinue={() => {
      dispatch({ type: 'SET_WORLD_STAGE', payload: 3 });
      dispatch({ type: 'GO_TO_SCENE', payload: 'world' });
    }}
  />
)}
```

- [ ] **Step 3: Dev 수동 확인**

Run: `npm run dev`

Expected:
- world stage 2 → 우측 끝 → Space → MG3 자동 시작 (running)
- 10초 동안 → 키로 캐치
- 종료 시 결과 패널에 "+점수" + "다음으로 →" 버튼만
- Enter 또는 클릭 → world stage 3으로

- [ ] **Step 4: Build + Lint**

```bash
npm run lint && npm run build
```

Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/components/CatchGame/CatchGame.jsx src/App.jsx
git commit -m "feat: CatchGame autoStart/onComplete/onContinue props 추가 (#12)"
```

---

## Phase 5 — 통합 검증

### Task 12: 풀 플레이 수동 QA

**Files:**
- 변경 없음 (검증만)

- [ ] **Step 1: 빌드 + 린트 최종 검증**

```bash
npm run lint
npm run build
```

Expected: 0 errors, 0 warnings (특히 spec §11에 명시한 unused class 잔여 없음, 자산 미참조 없음)

- [ ] **Step 2: 풀 플레이 시나리오 (spec §12 수동 QA 체크리스트)**

Run: `npm run dev`

체크포인트별 확인:
1. [ ] 새로고침 → `intro` 첫 화면이 보임
2. [ ] Space → world stage 0, 그린이 좌측 등장 + idle (정지 상태)
3. [ ] → 누르면 우측 이동 + walk 애니메이션 재생 / facing right
4. [ ] ← 누르면 좌측 이동 + facing left (스프라이트 좌우 반전)
5. [ ] 좌(100)/우(1100) 가장자리 clamp 정상 (벽에 막힘)
6. [ ] heroX≥1000에서 "Space로 시작" 토스트 표시
7. [ ] Space → `minigame_1` 자동 시작 (Space 추가 입력 불필요, 시작 버튼 안 보임)
8. [ ] ← 정지 → result 패널에 점수 + "다음으로" 버튼만 (다시하기/처음으로 안 보임)
9. [ ] Enter → world stage 1 (그린이 좌측 부활), 누적 점수 HUD에 반영
10. [ ] 우측 끝 → Space → minigame_2 자동 시작 (waiting → react)
11. [ ] ↑ 반응 → result. early/timeout도 onContinue 버튼이 보임
12. [ ] Enter → world stage 2 + 점수 누적
13. [ ] minigame_3 자동 시작 → 종료 → 결과 → Enter → world stage 3
14. [ ] Space → armor placeholder ("훈련을 마친 그린이! ...")
15. [ ] state.hasArmor가 true로 변경됐는지 React DevTools로 확인
16. [ ] Enter → minigame_4 placeholder
17. [ ] Enter → boss_fight placeholder
18. [ ] Enter → ending ("총점 N점")
19. [ ] R 또는 클릭 → intro 복귀, totalScore 0, hasArmor false로 리셋
20. [ ] 모든 씬에서 페이지 스크롤 발생 안 함 (arrow/Space)
21. [ ] 콘솔 에러/경고 0
22. [ ] 씬 전환 시 200ms 페이드 인 자연스러움

- [ ] **Step 3: 잔여 정리 (필요 시)**

체크리스트 중 실패 항목 있으면 fix 후 commit. 없으면 다음 step.

- [ ] **Step 4: 최종 commit (잔여 정리 있을 시)**

```bash
git add -A
git commit -m "fix: 통합 QA 잔여 이슈 수정 (#12)"
```

(잔여 없으면 이 step은 skip)

- [ ] **Step 5: 푸시 + PR 생성**

```bash
git push -u origin 20260504_#12_PRD_1_2_사용자_플로우_구현_scene_routing_Vite_데모_정리
```

PR 생성은 별도 절차 (`/pr-description` 또는 `gh pr create`).

---

## 부록 — 의존 관계 그래프

```
Task 1 (store)
   └─ Task 4 (App + main 골격)  ──── Task 5 (Vite 정리)
         ├─ Task 6 (IntroScene)
         ├─ Task 7 (PlaceholderScene + EndingScene)
         └─ Task 8 (WorldScene)  ←── Task 2 (Hero), Task 3 (useKeyboardMovement)

Task 4 골격이 들어선 후:
   ├─ Task 9 (TenSecondsGame)
   ├─ Task 10 (ColorReactionGame)
   └─ Task 11 (CatchGame)

마지막:
   └─ Task 12 (통합 QA)
```

병렬 가능: {2, 3} 동시, {6, 7} 동시 (8은 2,3 완료 후), {9, 10, 11} 동시 (4 완료 후 어느 시점이든).
순차 강제: 1 → 4 → 5 → (6,7,8) → (9,10,11) → 12.

---

## Self-Review 결과

- ✅ Spec §1~13 모든 섹션이 task로 매핑됨
- ✅ 모든 step에 정확한 코드 또는 명령어 포함 (placeholder 없음)
- ✅ 함수명/필드명 일관성: `getScore` (양 미니게임 utils), `autoStart`/`onComplete`/`onContinue` (세 미니게임 props), `GO_TO_SCENE`/`SET_WORLD_STAGE`/`ADD_SCORE`/`EQUIP_ARMOR`/`RESET` (액션)
- ✅ Spec §11 Vite 정리 체크리스트가 Task 5에 포함됨
- ✅ Spec §12 수동 QA 체크리스트가 Task 12에 그대로 반영됨
- ✅ Spec §10 edge cases가 각 task에 가드로 반영됨 (`completedRef`, `autoStart` mount-only useEffect, heroX clamp, Space `!autoStart` 가드, scene `key` prop 페이드)
