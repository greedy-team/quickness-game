# Scene Routing + 월드맵 도입 설계 (Issue #12)

> **Issue**: [#12 ⚙️ [기능추가][App][SceneRouting] PRD §1.2 사용자 플로우 구현 (scene routing + Vite 데모 정리)](https://github.com/greedy-team/quickness-game/issues/12)
> **Branch**: `20260504_#12_PRD_1_2_사용자_플로우_구현_scene_routing_Vite_데모_정리`
> **Date**: 2026-05-04
> **Status**: Design (브레인스토밍 완료, 사용자 리뷰 대기)

---

## 1. 목표

PRD §1.2 사용자 플로우(인트로 → MG1 → MG2 → MG3 → 갑옷 → MG4 → 보스 → 엔딩)를 화면 위에 구현한다. 현재 `App.jsx`에 세 미니게임이 한 페이지에 세로로 나열된 데모 형태를 정리하고, **한 번에 하나의 씬만 렌더링하는 라우터**와 **누적 점수·진행 상태 전역 store**를 도입한다.

추가로, 미니게임 사이를 **그린이가 직접 걷는 월드 구간**으로 채워 PRD §1.2의 "그린이 등장 + 좌우 이동 안내" 의도를 살린다. 각 미니게임은 월드의 **체크포인트**로 배치되고 사용자가 도달해 Space를 누르면 시작된다.

---

## 2. 범위 (Scope)

### 포함 (이번 PR)

- 9개 씬 enum + Context 기반 전역 store
- `intro`, `world`, `minigame_1~3` 정식 구현
- `armor`, `minigame_4`, `boss_fight`, `ending` placeholder 구현 (자리만, 별도 이슈에서 콘텐츠 구현)
- 그린이 좌우 이동 + 체크포인트 진입 시스템
- 기존 `TenSecondsGame`, `ColorReactionGame`, `CatchGame` 컴포넌트에 `autoStart`/`onComplete` props 추가 + 점수 함수 추가
- Vite 데모 마크업/자산 완전 제거

### 제외 (별도 이슈)

- MG4 (병렬 진행) 게임 로직 — placeholder
- 갑옷 장착 연출 (스프라이트 변경 등) — placeholder
- 보스전 시스템 (HP, 공격 모션, 빔) — placeholder
- 엔딩 씬의 점수+등급 표시 — placeholder ("총점 N점"만)
- BGM/효과음
- Vitest 등 테스트 인프라 도입

---

## 3. 설계 결정 트레이스

| # | 결정 사항 | 선택 | 근거 |
|---|---|---|---|
| 1 | 작업 범위 | A: scene routing만 (MG4·갑옷·보스 별도 이슈) | 이슈 본문이 "갑옷 연출 별도 이슈" 명시. PR 단위 적정화 |
| 2 | 전역 상태 라이브러리 | React Context + useReducer | 4개 필드/5개 액션으로 작음. deps 추가 0개, surgical |
| 3 | 월드맵 구조 | 선형 진행 (한 방향) | PRD §1.2 선형 흐름과 일치. 토대 코드 최소 |
| 4 | 카메라/스크롤 | 1구간=1화면, 페이드 전환 | PRD §7.3 절대좌표 패턴 그대로. 카메라 시스템 불필요 |
| 5 | 미니게임 인터페이스 | `autoStart`/`onComplete` props 2개만 추가 | 기존 시각/UX 보존, 변경 최소화 |
| 6 | 시작 화면 | 별도 인트로 씬 (시작 버튼 + 스토리) | 명확한 진입점. 새로고침/재진입 자연스러움 |
| 7 | 미구현 씬 | 통일된 `PlaceholderScene` 컴포넌트 (엔딩 포함) | 코드 1개를 4번 재사용. 다음 이슈에서 자연스럽게 채울 자리 |
| 8 | Vite 데모 처리 | 완전 제거 (마크업 + 자산) | 이슈가 "정리" 명시. dead code 0 |

---

## 4. 씬 구조

### 4.1 씬 enum (9개)

```
intro
world (worldStage: 0|1|2|3)
minigame_1
minigame_2
minigame_3
armor          # placeholder
minigame_4     # placeholder
boss_fight     # placeholder
ending         # placeholder
```

### 4.2 씬 흐름

```
intro
  └→ Space →  world(stage=0)
                └→ 우측 도달 + Space → minigame_1
                                          └→ 결과 + Enter → world(stage=1)
                                                              └→ ... → minigame_2
                                                                          └→ ... → world(stage=2)
                                                                                      └→ ... → minigame_3
                                                                                                  └→ ... → world(stage=3)
                                                                                                              └→ ... → armor (PH)
                                                                                                                          └→ Enter → minigame_4 (PH)
                                                                                                                                        └→ Enter → boss_fight (PH)
                                                                                                                                                      └→ Enter → ending (PH)
                                                                                                                                                                    └→ R/Click → RESET → intro
```

### 4.3 worldStage ↔ 다음 씬 매핑

| worldStage | 다음 씬 |
|---|---|
| 0 | `minigame_1` |
| 1 | `minigame_2` |
| 2 | `minigame_3` |
| 3 | `armor` |

---

## 5. 전역 store (`src/store/gameStore.jsx`)

### 5.1 State shape (초기값)

```js
const initialState = {
  scene: 'intro',         // 'intro' | 'world' | 'minigame_1~3' | 'armor' | 'minigame_4' | 'boss_fight' | 'ending'
  worldStage: 0,          // 0 | 1 | 2 | 3
  totalScore: 0,
  hasArmor: false,
  bossHP: 1500,           // 옵션 A 범위에선 사용 안 함, PRD §3.2 자리만
  lastMiniScore: null,    // 가장 최근 미니게임 점수 (옵션 — 미래 HUD용)
};
```

### 5.2 Actions (useReducer)

| Type | Payload | 효과 |
|---|---|---|
| `GO_TO_SCENE` | `scene` | `state.scene = scene` |
| `SET_WORLD_STAGE` | `idx` | `state.worldStage = idx` |
| `ADD_SCORE` | `points` | `totalScore += points`, `lastMiniScore = points` |
| `EQUIP_ARMOR` | — | `hasArmor = true` |
| `RESET` | — | 초기 상태로 복귀 |

### 5.3 Provider/Hook

```js
export function GameProvider({ children }) { ... }
export function useGame() { return { state, dispatch }; }
```

`main.jsx`에서 `<App>`을 `<GameProvider>`로 감쌈.

---

## 6. 폴더 구조

```
src/
├── App.jsx                          # 씬 라우터 (대폭 변경)
├── main.jsx                         # GameProvider 추가
├── App.css / index.css              # Vite 데모 클래스 정리
├── store/
│   └── gameStore.jsx                # 신규: Context + Reducer + useGame()
├── scenes/
│   ├── IntroScene.jsx               # 신규: 시작 화면
│   ├── IntroScene.css               # 신규
│   ├── WorldScene.jsx               # 신규: 그린이 좌우 이동 + 체크포인트
│   ├── WorldScene.css               # 신규
│   ├── PlaceholderScene.jsx         # 신규: armor/mg4/boss 공용
│   ├── PlaceholderScene.css         # 신규
│   ├── EndingScene.jsx              # 신규: placeholder + Reset 버튼
│   └── EndingScene.css              # 신규
├── components/
│   ├── Hero.jsx                     # 신규: 그린이 스프라이트 (PRD §7.3)
│   ├── Hero.css                     # 신규: keyframes play
│   ├── TenSecondsGame/              # 수정: autoStart/onComplete props + getScore
│   ├── ColorReactionGame/           # 수정: 동일
│   └── CatchGame/                   # 수정: 동일
├── constants/
│   └── sprites.js                   # 신규: HERO_SPRITES.walk_no_weapon만
├── hooks/
│   └── useKeyboardMovement.js       # 신규: PRD §7.6 패턴
└── assets/
    ├── react.svg                    # 삭제
    ├── vite.svg                     # 삭제
    └── hero.png                     # 삭제
```

`public/`:
- `vite.svg`가 있으면 삭제
- `icons.svg`는 grep 후 사용처 없으면 삭제

---

## 7. 컴포넌트 명세

### 7.1 신규 컴포넌트

#### `src/store/gameStore.jsx`
- React Context + `useReducer`
- export: `GameProvider`, `useGame()`
- 초기 상태/액션은 §5 참조

#### `src/constants/sprites.js`

```js
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

#### `src/components/Hero.jsx`
- props: `action='walk_no_weapon'`, `x`, `bottom=151`, `facing='right'`, `playing=true`
- PRD §7.3 패턴
- `playing=false` 시 `animation-play-state: paused`
- `key={action}` 부여 (PRD §10.1 — 모션 변경 시 재 mount)

#### `src/hooks/useKeyboardMovement.js`
- 인자: `{ enabled, onTick(keysObj) }`
- `keydown`/`keyup`으로 keysRef 갱신
- `requestAnimationFrame` 루프에서 `onTick(keysRef.current)` 호출
- 방향키는 `e.preventDefault()` (스크롤 방지)
- enabled false → 모든 리스너/RAF cleanup

#### `src/scenes/IntroScene.jsx`

레이아웃:
```
┌─────────────────────────────────┐
│  용사 그린이의 대모험             │
│                                 │
│  평화롭던 그린 왕국에 어둠의      │
│  군주가 나타나 성을 점령했다.     │
│                                 │
│      ▶ 시작 (Space)              │
│                                 │
│  ← → 이동 / Space 시작·진입       │
└─────────────────────────────────┘
```

- 키보드: Space/Enter → `dispatch({ type: 'GO_TO_SCENE', payload: 'world' })` + `SET_WORLD_STAGE(0)`
- 시작 버튼 클릭도 동일 동작

#### `src/scenes/WorldScene.jsx`

상태:
- `heroX` (local, 시작값 100)
- `facing` ('left'|'right', 키 입력 시 갱신)

인터랙션:
- `useKeyboardMovement({ enabled: true, onTick })` → ← → 누름 동안 200px/s 이동
- heroX clamp: [100, 1100]
- heroX >= 1000 → 체크포인트 영역
- 체크포인트 영역에서 Space 누름 → store에서 `worldStage` 읽고 다음 씬으로 dispatch
  - 0/1/2 → `minigame_${stage+1}`
  - 3 → `armor`

렌더:
- 컨테이너 1200×600 (배경 `/bg/world.png` cover)
- 체크포인트 표지판 (CSS art): 우측 1050px 위치, "MG{N+1} ▼" 또는 "갑옷 ▼"
- `<Hero x={heroX} action="walk_no_weapon" playing={isMoving} facing={facing} />`
- 상단 HUD: 누적 점수 (`useGame().state.totalScore`)
- heroX >= 1000일 때 하단 토스트: "Space로 시작"

#### `src/scenes/PlaceholderScene.jsx`
- props: `title`, `description`, `onContinue`
- 렌더: 제목 + 설명 + "현재 점수: N점" + "다음으로 → (Enter)" 버튼
- 키보드: Enter/클릭 → `onContinue()`
- App.jsx에서 사용:
  ```jsx
  case 'armor':       <PlaceholderScene title="🛡 갑옷 장착" description="훈련을 마친 그린이! 갑옷과 검을 손에 넣었다!" onContinue={() => dispatch(GO_TO_SCENE('minigame_4'))} />
  case 'minigame_4':  <PlaceholderScene title="⚔️ 미니게임 4: 병렬 진행" description="(별도 이슈에서 구현 예정)" onContinue={() => dispatch(GO_TO_SCENE('boss_fight'))} />
  case 'boss_fight':  <PlaceholderScene title="🔥 보스전" description="(별도 이슈에서 구현 예정)" onContinue={() => dispatch(GO_TO_SCENE('ending'))} />
  ```
- armor 진입 시 App.jsx의 `useEffect`에서 `EQUIP_ARMOR` 추가 dispatch (state.scene 변경 감지)

#### `src/scenes/EndingScene.jsx`
- 통일된 placeholder 스타일이지만 마지막 화면 톤
- 렌더: "🏁 모험 종료" + "총점 {totalScore}점" + "처음부터 (R)"
- 키보드: R/클릭 → `RESET` → intro

### 7.2 수정 컴포넌트

#### `src/App.jsx` (대폭 변경)

```jsx
import { useGame } from './store/gameStore';
import IntroScene from './scenes/IntroScene';
import WorldScene from './scenes/WorldScene';
import PlaceholderScene from './scenes/PlaceholderScene';
import EndingScene from './scenes/EndingScene';
import TenSecondsGame from './components/TenSecondsGame/TenSecondsGame';
import ColorReactionGame from './components/ColorReactionGame/ColorReactionGame';
import CatchGame from './components/CatchGame/CatchGame';
import './App.css';

export default function App() {
  const { state, dispatch } = useGame();

  // armor 진입 시 자동으로 EQUIP_ARMOR
  useEffect(() => {
    if (state.scene === 'armor' && !state.hasArmor) {
      dispatch({ type: 'EQUIP_ARMOR' });
    }
  }, [state.scene, state.hasArmor, dispatch]);

  const handleMiniComplete = (nextWorldStage) => (score) => {
    dispatch({ type: 'ADD_SCORE', payload: score });
    // 결과 패널의 "다음으로" 버튼이 onContinue를 호출하면 world 복귀
    // → 미니게임 컴포넌트가 onComplete 호출 후 자체적으로 결과 패널 표시
    //   "다음으로" 클릭 시 onContinue(nextWorldStage) → dispatch(SET_WORLD_STAGE) + GO_TO_SCENE('world')
  };

  return (
    <div className="app-stage" key={state.scene}>
      {state.scene === 'intro'      && <IntroScene />}
      {state.scene === 'world'      && <WorldScene />}
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
      {state.scene === 'minigame_2' && (
        <ColorReactionGame autoStart
          onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
          onContinue={() => {
            dispatch({ type: 'SET_WORLD_STAGE', payload: 2 });
            dispatch({ type: 'GO_TO_SCENE', payload: 'world' });
          }} />
      )}
      {state.scene === 'minigame_3' && (
        <CatchGame autoStart
          onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
          onContinue={() => {
            dispatch({ type: 'SET_WORLD_STAGE', payload: 3 });
            dispatch({ type: 'GO_TO_SCENE', payload: 'world' });
          }} />
      )}
      {state.scene === 'armor'      && <PlaceholderScene title="🛡 갑옷 장착" description="훈련을 마친 그린이! 갑옷과 검을 손에 넣었다!" onContinue={() => dispatch({ type: 'GO_TO_SCENE', payload: 'minigame_4' })} />}
      {state.scene === 'minigame_4' && <PlaceholderScene title="⚔️ 미니게임 4: 병렬 진행" description="(별도 이슈에서 구현 예정)" onContinue={() => dispatch({ type: 'GO_TO_SCENE', payload: 'boss_fight' })} />}
      {state.scene === 'boss_fight' && <PlaceholderScene title="🔥 보스전" description="(별도 이슈에서 구현 예정)" onContinue={() => dispatch({ type: 'GO_TO_SCENE', payload: 'ending' })} />}
      {state.scene === 'ending'     && <EndingScene />}
    </div>
  );
}
```

> **참고**: `onContinue`는 `onComplete`와 별개로 미니게임 컴포넌트에 추가하는 prop. `onComplete(score)`은 result phase 진입 시 1회 호출 (점수 누적), `onContinue()`은 결과 패널의 "다음으로" 버튼 클릭/Enter 시 호출 (씬 전환).

#### `src/components/TenSecondsGame/TenSecondsGame.jsx`
- 새 props: `autoStart` (bool, default false), `onComplete` (fn, default noop), `onContinue` (fn, default noop)
- 변경:
  - `useEffect(() => { if (autoStart && phase === 'idle') startGame(); }, [autoStart])` (phase 의존성 제외 → 한 번만)
  - `stopGame()` 끝부분: `onComplete(getScore(diff))` 호출
  - 결과 패널: `onContinue` prop 있으면 "다시하기/처음으로" 숨김, 대신 "다음으로 → (Enter)" 버튼 1개
  - Enter 키 리스너: 결과 phase에서 `onContinue` 있으면 호출
  - Space 시작 키: `autoStart` 일 때 비활성화 (이중 시작 방지)

#### `src/components/TenSecondsGame/gameUtils.js`
신규 export (PRD §2.1):
```js
export function getScore(diff) {
  if (diff <= 0.1) return 100;
  if (diff <= 0.3) return 70;
  if (diff <= 0.5) return 40;
  return 10;
}
```

#### `src/components/ColorReactionGame/ColorReactionGame.jsx`
- 같은 props 추가 (`autoStart`/`onComplete`/`onContinue`)
- `endGame('result')` 시: `onComplete(getScore(reactionMs))` 호출
- `endGame('early')` 시: `onComplete(-20)` 호출 (PRD §2.2 페이크 페널티)
- `endGame('timeout')` 시: `onComplete(0)` 호출
- 결과/에러/타임아웃 패널 모두 `onContinue` 있으면 "다음으로" 버튼 + Enter

#### `src/components/ColorReactionGame/reactionUtils.js`
신규 export (PRD §2.2):
```js
export function getScore(ms) {
  if (ms <= 200) return 100;
  if (ms <= 400) return 70;
  if (ms <= 600) return 40;
  return 10;
}
```

#### `src/components/CatchGame/CatchGame.jsx`
- 같은 props 추가
- 이미 `score` state 보유 → `endTimeoutRef` 콜백 (게임 종료 시) 안에서 `onComplete(score)` 호출
- 결과 패널 버튼 교체 동일

---

## 8. 키보드 매핑

| 씬 | 활성 키 | 동작 |
|---|---|---|
| `intro` | Space, Enter, Click | "시작" → world |
| `world` | ← / → | heroX 좌우 이동 (200px/s) |
| `world` (heroX≥1000) | Space | 다음 씬 (minigame_X 또는 armor) |
| `minigame_1` (running) | ← | 정지 → result |
| `minigame_2` (waiting/react) | ↑ | 반응 (early/result/none) |
| `minigame_3` (running) | → | 캐치 |
| `minigame_X` (result/error) | Enter, Click | "다음으로" → world |
| `armor`/`mg4`/`boss` | Enter, Click | "다음으로" → 다음 씬 |
| `ending` | R, Click | RESET → intro |

**전 씬 공통**: ← → ↑ ↓ Space는 `e.preventDefault()`. 씬 컴포넌트는 unmount 시 자동 cleanup (PRD §10.3 충족).

---

## 9. 씬 전환 (페이드)

```css
/* App.css */
.app-stage > * {
  animation: scene-fade-in 200ms ease-out;
}
@keyframes scene-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

`<div className="app-stage" key={state.scene}>` — scene 변경 시 새 mount → 자연스러운 페이드.

---

## 10. Edge cases & 가드

1. **`autoStart` 무한 루프 방지**: useEffect 의존성 배열에 `phase`를 넣지 않음. mount 시 `phase === 'idle'` 가드.
2. **`onComplete` 중복 호출 방지**: result phase 진입 시 1회만 호출 (endGame 내부 또는 useEffect with `phase` 변화 감지 + 호출 여부 ref).
3. **결과 화면 Enter 연타**: scene 전환 즉시 unmount → 두 번째 dispatch는 다음 씬에서 처리. World 씬은 Enter 키 매핑이 없어 안전.
4. **체크포인트 토스트 깜빡임**: heroX≥1000 단방향 비교만 사용 (hysteresis 불필요).
5. **store reset**: ending에서 RESET 시 `lastMiniScore`, `worldStage`, `bossHP`, `hasArmor`, `totalScore` 모두 초기값 복귀.
6. **공격 스프라이트 reuse**: Hero 컴포넌트 `key={action}` 부여 (PRD §10.1).
7. **arrow 키 페이지 스크롤**: 모든 씬에서 `e.preventDefault()`.
8. **컨테이너 크기**: 1200×600 고정 (PRD §6.2 풀밭 라인 정확도).

---

## 11. Vite 데모 정리 체크리스트

코드:
- [ ] `App.jsx` 전면 재작성 (Vite 마크업 + import 모두 제거)
- [ ] `App.css`에서 unused 클래스 정리: `.hero`, `.ticks`, `#center`, `#next-steps`, `#spacer`, `#docs`, `#social`, `.button-icon`, `.logo`, `.counter`, `.framework`, `.vite`, `.base`
- [ ] `index.css`에서 Vite 기본 스타일 검토 (게임에 필요한 reset만 남김)

자산:
- [ ] `src/assets/react.svg` 삭제
- [ ] `src/assets/vite.svg` 삭제
- [ ] `src/assets/hero.png` 삭제 (PRD 자산 명세에 없음)
- [ ] `public/icons.svg` 검토 — 사용처 grep 후 미사용이면 삭제
- [ ] `public/vite.svg` 있으면 삭제

---

## 12. 검증 전략

자동:
- `npm run lint` 통과 (eslint warning 0)
- `npm run build` 통과 (이전 이슈 #11처럼 CSS 중복 경고 0)
- 단위 테스트는 도입하지 않음 (Vitest 셋업은 별도 이슈)

수동 QA 체크리스트:
1. 새로고침 시 `intro` 첫 화면이 보임
2. Space → world stage 0, 그린이 좌측 등장 + idle (정지 상태)
3. → 누르면 우측 이동 + walk 애니메이션 재생
4. 좌(100)/우(1100) 가장자리 clamp 정상
5. heroX≥1000에서 "Space로 시작" 토스트 표시
6. Space → `minigame_1` 자동 시작 (Space 추가 입력 불필요)
7. ← 정지 → result 패널에 점수 표시 + "다음으로" 버튼만
8. Enter → world stage 1 (그린이 좌측 부활), 누적 점수 HUD에 반영
9. MG2/MG3 동일 검증
10. world stage 3 → Space → `armor` placeholder
11. armor → mg4 → boss → ending 순서로 Enter 진행
12. ending에서 "총점 N점" 표시, R/클릭 → intro 복귀, 점수 0 리셋
13. 모든 씬에서 페이지 스크롤 안 됨
14. 콘솔 에러/경고 0
15. world에서 좌측 가장자리에 ← 계속 눌러도 멈춤만 (애니메이션은 정지)

---

## 13. 참고

- PRD: `docs/PRD.md`
- 자산: `public/sprites/unified_5_walk_no_weapon.png`, `public/bg/world.png`
- 핵심 패턴: PRD §7.3 (Hero), §7.6 (useKeyboardMovement), §7.7 (store)
