# PRD v6 뼈대 (라우터 · BGM · 점수 스토어) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PRD v6 컨셉(1인칭 학교 호러 + 허브 + 4문 + 다단계 점수)에 맞는 React Router 기반 뼈대 — 6 라우트, 라우트별 BGM, 점수 누적 스토어, HUD 오버레이 — 를 신규 구축한다. 각 스테이지 게임 로직은 후속 이슈에서 채울 수 있도록 placeholder + TODO 주석으로 표시.

**Architecture:** `src/` 전체를 폐기하고 React Router(v7) 평탄 URL + Zustand(v5) 단일 store로 재구성. 데이터 흐름은 `recordResult(stageId, metric) → store.stageResults → HUD/Hub 자동 반영`. BGM은 `useLocation()`을 구독하는 단일 `<audio>` 컨트롤러가 라우트→트랙ID→파일 3단 매핑을 통해 재생. 단일 파일로 충분한 모듈(`store.js`, `scoring.js`, `assets.js`)은 `src/` 루트, 컴포넌트는 폴더 단위(`.jsx + .css`).

**Tech Stack:** React 19 / Vite 8 / React Router v7 / Zustand v5 (기존 환경에 router, zustand만 추가).

**Spec:** `docs/superpowers/specs/2026-05-06-prd-v6-skeleton-design.md`

**Branch:** `20260506_#20_PRD_v4_기반_초기_화면_라우터_BGM_점수_스토어_뼈대_구축`

---

## Pre-Flight 상태 (시작 전 확인)

**현재 worktree 상태**
- `M docs/PRD.md` (PRD v6로 업데이트된 상태, 미커밋)
- `D public/bg/world.png`, `D public/sprites/*.png` (PRD v4 에셋 폐기, 미커밋)
- `?? public/assets/` (PRD v6 에셋 신규 디렉터리, 미커밋)
- `?? .issues/20260506_기능추가_PRD_v4_뼈대_초기화면_라우터_BGM.md` (이슈 문서, 미커밋)

위는 본 작업을 위한 사전 준비물이므로 Task 1에서 정리한 후 진행한다.

**참고 명령**
- 개발 서버: `npm run dev` (vite)
- lint: `npm run lint` (eslint)
- 작업 디렉터리: `/Users/luca/workspace/greedy/quickness-game`

---

## Task 1: Pre-flight — 사전 작업 커밋

**Files:**
- Stage: `docs/PRD.md`
- Stage: `.issues/20260506_기능추가_PRD_v4_뼈대_초기화면_라우터_BGM.md`
- Stage: `public/bg/`, `public/sprites/`, `public/assets/`

- [ ] **Step 1: PRD v6 + 이슈 문서 커밋**

```bash
git add docs/PRD.md .issues/20260506_기능추가_PRD_v4_뼈대_초기화면_라우터_BGM.md
git commit -m "docs: PRD v6 개정 + 뼈대 이슈 추가 #20"
```

- [ ] **Step 2: public 자산 마이그레이션 커밋 (구 자산 삭제 + assets/ 신규)**

```bash
git add public/bg public/sprites public/assets
git commit -m "chore: public 자산을 public/assets/{images,sounds}로 마이그레이션 #20"
```

- [ ] **Step 3: 상태 검증**

```bash
git status -s
```

Expected: 출력 비어있음 (clean working tree).

```bash
ls public/assets/images public/assets/sounds
```

Expected:
- `public/assets/images/` → `bg_hub_corridor.png  door.png  door_clear.png`
- `public/assets/sounds/` → `bgm.mp3`

---

## Task 2: Phase A — 기존 src/ 전체 제거

**Files:**
- Delete: `src/` (전체)

- [ ] **Step 1: 기존 src 제거**

```bash
git rm -r src
```

- [ ] **Step 2: 제거 확인**

```bash
ls src 2>&1
```

Expected: `ls: src: No such file or directory`

- [ ] **Step 3: 커밋**

```bash
git commit -m "chore: 기존 src 전체 제거 — PRD v6 기반 재작성 준비 #20"
```

- [ ] **Step 4: 로그 확인**

```bash
git log -1 --stat | head -3
```

Expected: 최근 커밋이 `chore: 기존 src 전체 제거 ...`로 시작.

---

## Task 3: Phase B — 의존성 추가 (react-router-dom, zustand)

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: 의존성 설치**

```bash
npm i react-router-dom@^7 zustand@^5
```

Expected: 설치 성공, 경고는 무시 (peer dep 경고 가능).

- [ ] **Step 2: package.json 변경 확인**

```bash
grep -E '"(react-router-dom|zustand)"' package.json
```

Expected:
```
    "react-router-dom": "^7...",
    "zustand": "^5..."
```

- [ ] **Step 3: 커밋**

```bash
git add package.json package-lock.json
git commit -m "chore: react-router-dom, zustand 의존성 추가 #20"
```

---

## Task 4: 부트스트랩 — main.jsx + App.jsx + CSS + index.html

**Files:**
- Create: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/App.css`
- Create: `src/reset.css`
- Modify: `index.html` (title만 갱신)

- [ ] **Step 1: `src/reset.css` 작성**

```css
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; padding: 0; }
body {
  font-family: system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif;
  background: #000;
  color: #fff;
  overflow: hidden;
}
button { font: inherit; cursor: pointer; }
```

- [ ] **Step 2: `src/App.css` 작성**

```css
.app-stage {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
}
```

- [ ] **Step 3: `src/main.jsx` 작성**

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './reset.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Step 4: `src/App.jsx` 임시 부트스트랩 작성**

(추후 RouteTree·HudOverlay·BgmController가 추가될 자리. 지금은 dev 서버 부팅 검증용 최소 마크업.)

```jsx
import './App.css';

export default function App() {
  return (
    <div className="app-stage">
      <p style={{ padding: 24 }}>PRD v6 skeleton bootstrap</p>
    </div>
  );
}
```

- [ ] **Step 5: `index.html`의 `<title>` 교체**

먼저 `index.html`을 열어서 현재 `<title>...</title>` 줄을 확인한 다음, Edit 도구로 그 줄을 다음으로 교체:

```html
<title>그린이는 나야, 둘이 될 수 없어</title>
```

(파일 내 `<title>` 줄이 한 군데이므로 단순 1:1 치환.)

- [ ] **Step 6: dev 서버 부팅 검증**

```bash
npm run dev
```

브라우저로 `http://localhost:5173`(또는 vite가 보여주는 포트) 접속 → 검은 화면에 "PRD v6 skeleton bootstrap" 텍스트만 보이면 성공. 콘솔에 에러 없음 확인 후 Ctrl+C로 종료.

- [ ] **Step 7: 커밋 보류**

이 태스크는 Phase C 일부이므로 별도 커밋 안 함. 다음 태스크로 진행.

---

## Task 5: `src/assets.js` — 에셋 경로 상수

**Files:**
- Create: `src/assets.js`

- [ ] **Step 1: 파일 작성**

```js
// src/assets.js
// public/ 하위 파일은 절대경로로 그대로 서빙됨 (Vite 표준).

export const ASSETS = {
  images: {
    hubCorridor: '/assets/images/bg_hub_corridor.png',
    door:        '/assets/images/door.png',
    doorClear:   '/assets/images/door_clear.png',
  },
  sounds: {
    bgm: '/assets/sounds/bgm.mp3',
  },
};
```

- [ ] **Step 2: 파일 존재 검증**

```bash
ls public/assets/images/bg_hub_corridor.png public/assets/images/door.png public/assets/images/door_clear.png public/assets/sounds/bgm.mp3
```

Expected: 4개 파일 모두 출력 (없으면 Task 1의 자산 마이그레이션 누락 — 되돌아가 확인).

---

## Task 6: `src/scoring.js` — 점수 산출 모듈

**Files:**
- Create: `src/scoring.js`

- [ ] **Step 1: 파일 작성**

```js
// src/scoring.js
// PRD §13 Tunable. tier 수치는 후속 이슈(스테이지 메커닉 구현)에서 채움.
// 형식: { stageId: [{ maxAbsError: number, points: number }, ...] }
//   - 배열은 maxAbsError 오름차순 정렬 (앞에서부터 매칭).

export const STAGE_SCORE_TIERS = {
  1: [],
  2: [],
  3: [],
  4: [],
};

/**
 * stageId의 metric에 해당하는 점수를 반환.
 * - tier가 비어 있으면 0 반환 (스켈레톤 단계 기본 동작).
 * - metric의 절댓값이 가장 작은 tier(가장 정확)부터 매칭.
 * - 잘못된 stageId / NaN / 비숫자 metric은 0 반환.
 *
 * 시그니처는 고정. 후속 이슈는 STAGE_SCORE_TIERS만 채우면 동작.
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

- [ ] **Step 2: 파일 존재 확인**

```bash
ls src/scoring.js
```

Expected: `src/scoring.js`

(실제 동작 검증은 store.js와 함께 후속 태스크의 dev 서버 부팅으로 수행 — store.js에서 이 모듈을 import하므로 import 사슬이 깨지면 즉시 드러남.)

---

## Task 7: `src/store.js` — Zustand store + selectors

**Files:**
- Create: `src/store.js`

- [ ] **Step 1: 파일 작성**

```js
// src/store.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { scoreFromMetric } from './scoring.js';

const initialState = {
  // 4개 스테이지 결과 — 단일 진실 공급원
  // 각 항목: null | { metric: number, score: number }
  stageResults: {
    1: null,
    2: null,
    3: null,
    4: null,
  },
  // 사용자가 타이틀에서 "시작"을 눌렀는가 (BGM autoplay 게이트 + 게임 진행 여부)
  hasUserStarted: false,
};

export const useGameStore = create(
  devtools(
    (set) => ({
      ...initialState,

      startGame: () =>
        set({ hasUserStarted: true }, false, 'startGame'),

      recordResult: (stageId, metric) =>
        set(
          (s) => ({
            stageResults: {
              ...s.stageResults,
              [stageId]: { metric, score: scoreFromMetric(stageId, metric) },
            },
          }),
          false,
          'recordResult',
        ),

      clearStageResult: (stageId) =>
        set(
          (s) => ({
            stageResults: { ...s.stageResults, [stageId]: null },
          }),
          false,
          'clearStageResult',
        ),

      resetGame: () =>
        set({ ...initialState }, false, 'resetGame'),
    }),
    { name: 'gameStore' },
  ),
);

// ───── Selectors (같은 파일 export) ─────

export const selectTotalScore = (s) =>
  Object.values(s.stageResults).reduce((acc, r) => acc + (r?.score ?? 0), 0);

export const selectIsStageCleared = (n) => (s) =>
  s.stageResults[n] !== null;

export const selectIsDoor4Unlocked = (s) =>
  [1, 2, 3].every((n) => s.stageResults[n] !== null);

export const selectClearedCount = (s) =>
  [1, 2, 3, 4].reduce((acc, n) => acc + (s.stageResults[n] ? 1 : 0), 0);
```

- [ ] **Step 2: 파일 존재 확인**

```bash
ls src/store.js
```

Expected: `src/store.js`

(실제 동작 검증은 다음 태스크들에서 컴포넌트가 useGameStore를 import할 때 자연스럽게 수행됨. 별도 임시 import 검증 불필요.)

---

## Task 8: 라우트 트리 + 6개 placeholder 페이지 (최소 스텁)

**Files:**
- Create: `src/routes/RouteTree.jsx`
- Create: `src/routes/TitlePage/TitlePage.jsx`
- Create: `src/routes/TitlePage/TitlePage.css`
- Create: `src/routes/OpeningPage/OpeningPage.jsx`
- Create: `src/routes/OpeningPage/OpeningPage.css`
- Create: `src/routes/HubPage/HubPage.jsx`
- Create: `src/routes/HubPage/HubPage.css`
- Create: `src/routes/StagePage/StagePage.jsx`
- Create: `src/routes/StagePage/StagePage.css`
- Create: `src/routes/EndingPage/EndingPage.jsx`
- Create: `src/routes/EndingPage/EndingPage.css`
- Create: `src/routes/RankingPage/RankingPage.jsx`
- Create: `src/routes/RankingPage/RankingPage.css`
- Modify: `src/App.jsx`

이 태스크의 목적: **모든 라우트가 동작하는지 먼저 검증**. 각 페이지는 최소 placeholder만 둠. 실 동작은 다음 태스크들에서 추가.

- [ ] **Step 1: 6개 페이지 placeholder 작성**

각 파일에 동일 패턴(제목 + 다음 라우트 임시 버튼). 빈 .css는 일단 생성만.

`src/routes/TitlePage/TitlePage.jsx`:
```jsx
import { useNavigate } from 'react-router-dom';
import './TitlePage.css';

export default function TitlePage() {
  const navigate = useNavigate();
  return (
    <div className="title-page">
      <h1>[Title]</h1>
      <button type="button" onClick={() => navigate('/opening')}>임시: 시작 → /opening</button>
      <button type="button" onClick={() => navigate('/ranking')}>임시: 랭킹 → /ranking</button>
    </div>
  );
}
```

`src/routes/OpeningPage/OpeningPage.jsx`:
```jsx
import { useNavigate } from 'react-router-dom';
import './OpeningPage.css';

export default function OpeningPage() {
  const navigate = useNavigate();
  // TODO(post-skeleton): 오프닝 컷씬 (15s) — PRD §2, §5
  //   - 야자 후 빈 학교 → 또 다른 나의 출현
  //   - 종료 시 navigate('/hub')
  return (
    <div className="opening-page">
      <h1>[Opening Cutscene]</h1>
      <p>TODO: 오프닝 컷씬 (15s)</p>
      <button type="button" onClick={() => navigate('/hub')}>다음 → /hub (placeholder)</button>
    </div>
  );
}
```

`src/routes/HubPage/HubPage.jsx`:
```jsx
import { useNavigate } from 'react-router-dom';
import './HubPage.css';

export default function HubPage() {
  const navigate = useNavigate();
  return (
    <div className="hub-page">
      <h1>[Hub]</h1>
      <button type="button" onClick={() => navigate('/stage/1')}>임시: 문 1 → /stage/1</button>
      <button type="button" onClick={() => navigate('/stage/2')}>임시: 문 2 → /stage/2</button>
      <button type="button" onClick={() => navigate('/stage/3')}>임시: 문 3 → /stage/3</button>
      <button type="button" onClick={() => navigate('/stage/4')}>임시: 문 4 → /stage/4</button>
    </div>
  );
}
```

`src/routes/StagePage/StagePage.jsx`:
```jsx
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import './StagePage.css';

const VALID_IDS = ['1', '2', '3', '4'];

export default function StagePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  if (!VALID_IDS.includes(id)) return <Navigate to="/hub" replace />;
  // TODO(post-skeleton): Stage ${id} 게임 로직 — PRD §4
  return (
    <div className="stage-page">
      <h1>[Stage {id}]</h1>
      <p>TODO: Stage {id} 게임 메커닉</p>
      <button type="button" onClick={() => navigate(id === '4' ? '/ending' : '/hub')}>
        다음 → {id === '4' ? '/ending' : '/hub'} (placeholder)
      </button>
    </div>
  );
}
```

`src/routes/EndingPage/EndingPage.jsx`:
```jsx
import { useNavigate } from 'react-router-dom';
import './EndingPage.css';

export default function EndingPage() {
  const navigate = useNavigate();
  // TODO(post-skeleton): 엔딩 컷씬 (10s) — PRD §5
  return (
    <div className="ending-page">
      <h1>[Ending]</h1>
      <p>TODO: 엔딩 컷씬</p>
      <button type="button" onClick={() => navigate('/ranking')}>랭킹 보기 → /ranking</button>
    </div>
  );
}
```

`src/routes/RankingPage/RankingPage.jsx`:
```jsx
import { useNavigate } from 'react-router-dom';
import './RankingPage.css';

export default function RankingPage() {
  const navigate = useNavigate();
  // TODO(post-skeleton): 랭킹 보드 — PRD §6 ("부스 일일 랭킹"), §11
  return (
    <div className="ranking-page">
      <h1>[Ranking Board]</h1>
      <p>TODO: 랭킹 보드</p>
      <button type="button" onClick={() => navigate('/')}>임시: 처음으로 → /</button>
    </div>
  );
}
```

- [ ] **Step 2: 각 페이지의 빈 .css 파일 생성**

각 페이지 폴더에 동일 이름 .css를 빈 파일로 생성:

```bash
touch src/routes/TitlePage/TitlePage.css \
      src/routes/OpeningPage/OpeningPage.css \
      src/routes/HubPage/HubPage.css \
      src/routes/StagePage/StagePage.css \
      src/routes/EndingPage/EndingPage.css \
      src/routes/RankingPage/RankingPage.css
```

- [ ] **Step 3: `src/routes/RouteTree.jsx` 작성**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import TitlePage from './TitlePage/TitlePage.jsx';
import OpeningPage from './OpeningPage/OpeningPage.jsx';
import HubPage from './HubPage/HubPage.jsx';
import StagePage from './StagePage/StagePage.jsx';
import EndingPage from './EndingPage/EndingPage.jsx';
import RankingPage from './RankingPage/RankingPage.jsx';

export default function RouteTree() {
  return (
    <Routes>
      <Route path="/"          element={<TitlePage />} />
      <Route path="/opening"   element={<OpeningPage />} />
      <Route path="/hub"       element={<HubPage />} />
      <Route path="/stage/:id" element={<StagePage />} />
      <Route path="/ending"    element={<EndingPage />} />
      <Route path="/ranking"   element={<RankingPage />} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 4: `src/App.jsx` 갱신 — RouteTree 마운트**

`src/App.jsx` 전체를 다음으로 교체:

```jsx
import RouteTree from './routes/RouteTree.jsx';
import './App.css';

export default function App() {
  return (
    <div className="app-stage">
      <RouteTree />
    </div>
  );
}
```

- [ ] **Step 5: 6 라우트 동작 검증**

```bash
npm run dev
```

브라우저에서 다음 순서로 클릭하며 확인:
- `/`(타이틀) 접속 → "임시: 시작 → /opening" 클릭 → `/opening` 진입
- "다음 → /hub" → `/hub` 진입
- "임시: 문 1 → /stage/1" → `/stage/1` 진입
- "다음 → /hub" → `/hub` 복귀
- "임시: 문 4 → /stage/4" → `/stage/4` → "다음 → /ending" → `/ending`
- "랭킹 보기 → /ranking" → `/ranking` → "임시: 처음으로 → /" → `/`
- 주소창에 `/unknown` 직접 입력 → `/`로 redirect
- 주소창에 `/stage/99` 직접 입력 → `/hub`로 redirect

모두 동작하면 Ctrl+C 종료.

---

## Task 9: TitlePage 실 동작 — 시작 + 랭킹 진입

**Files:**
- Modify: `src/routes/TitlePage/TitlePage.jsx`
- Modify: `src/routes/TitlePage/TitlePage.css`

- [ ] **Step 1: `src/routes/TitlePage/TitlePage.jsx` 갱신**

```jsx
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
import './TitlePage.css';

export default function TitlePage() {
  const navigate = useNavigate();
  const startGame = useGameStore((s) => s.startGame);

  const handleStart = () => {
    startGame();
    navigate('/opening');
  };

  const handleOpenRanking = () => {
    navigate('/ranking');
  };

  return (
    <div className="title-page">
      <h1 className="title-page__title">그린이는 나야, 둘이 될 수 없어</h1>
      <p className="title-page__story">
        야자 후 혼자 남은 학교에 또 다른 내가 나타났다.<br />
        가짜를 없애러 4개의 문을 연다.
      </p>
      <div className="title-page__actions">
        <button type="button" className="title-page__btn" onClick={handleStart}>
          ▶ 시작
        </button>
        <button type="button" className="title-page__btn" onClick={handleOpenRanking}>
          🏆 랭킹 보기
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `src/routes/TitlePage/TitlePage.css` 갱신**

```css
.title-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px;
  text-align: center;
}

.title-page__title {
  font-size: clamp(28px, 4vw, 56px);
  margin: 0;
  letter-spacing: 0.04em;
}

.title-page__story {
  font-size: 16px;
  line-height: 1.6;
  opacity: 0.8;
  margin: 0;
}

.title-page__actions {
  display: flex;
  gap: 16px;
  margin-top: 16px;
}

.title-page__btn {
  padding: 12px 24px;
  font-size: 16px;
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
}

.title-page__btn:hover {
  background: rgba(255, 255, 255, 0.08);
}
```

- [ ] **Step 3: 동작 검증**

```bash
npm run dev
```

브라우저에서 `/` 접속 → 게임 제목 + 스토리 + 두 버튼 표시. "시작" 클릭 시 `/opening` 진입(아직 BGM 없음). "랭킹 보기" 클릭 시 `/ranking` 진입. Ctrl+C 종료.

---

## Task 10: HubPage 실 동작 — 4문 PNG 버튼 + 클리어 상태 반영

**Files:**
- Modify: `src/routes/HubPage/HubPage.jsx`
- Modify: `src/routes/HubPage/HubPage.css`

- [ ] **Step 1: `src/routes/HubPage/HubPage.jsx` 갱신**

```jsx
import { useNavigate } from 'react-router-dom';
import { useGameStore, selectIsDoor4Unlocked } from '../../store.js';
import { ASSETS } from '../../assets.js';
import './HubPage.css';

export default function HubPage() {
  const navigate = useNavigate();
  const stageResults = useGameStore((s) => s.stageResults);
  const door4Unlocked = useGameStore(selectIsDoor4Unlocked);

  return (
    <div
      className="hub-page"
      style={{ backgroundImage: `url(${ASSETS.images.hubCorridor})` }}
    >
      {[1, 2, 3].map((n) => {
        const cleared = stageResults[n] !== null;
        return (
          <button
            key={n}
            type="button"
            className={`hub-page__door hub-page__door--${n}`}
            onClick={() => navigate(`/stage/${n}`)}
            aria-label={`문 ${n}${cleared ? ' (클리어)' : ''}`}
          >
            <img
              src={cleared ? ASSETS.images.doorClear : ASSETS.images.door}
              alt=""
            />
          </button>
        );
      })}

      <button
        type="button"
        className={`hub-page__door hub-page__door--4 ${door4Unlocked ? '' : 'is-locked'}`}
        onClick={() => navigate('/stage/4')}
        disabled={!door4Unlocked}
        aria-disabled={!door4Unlocked}
        aria-label={`문 4${door4Unlocked ? '' : ' (잠김)'}`}
      >
        <img src={ASSETS.images.door} alt="" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: `src/routes/HubPage/HubPage.css` 갱신**

문 좌표는 placeholder 단계 임시값(가로 4분할 균등 배치). 후속 이슈에서 디자인에 맞춰 조정.

```css
.hub-page {
  position: relative;
  width: 100%;
  height: 100%;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
}

.hub-page__door {
  position: absolute;
  bottom: 18%;
  width: 18%;
  aspect-ratio: 9 / 16;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
}

.hub-page__door img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.hub-page__door--1 { left: 6%;  }
.hub-page__door--2 { left: 28%; }
.hub-page__door--3 { left: 50%; }
.hub-page__door--4 { left: 72%; }

.hub-page__door:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 4px;
}

.hub-page__door.is-locked {
  cursor: not-allowed;
}

.hub-page__door.is-locked img {
  filter: brightness(0.35);
}
```

- [ ] **Step 3: 동작 검증**

```bash
npm run dev
```

브라우저에서 `/hub` 접속 → 복도 배경 + 문 4개 표시. 문 4번이 어둡게 처리되어 있고 클릭 안 됨. 문 1·2·3은 클릭 가능. (현재는 stage placeholder가 store를 갱신 안 하므로 클리어 상태 변화는 다음 태스크에서 검증.) Ctrl+C 종료.

---

## Task 11: StagePage placeholder + 모의 점수 입력 버튼

**Files:**
- Modify: `src/routes/StagePage/StagePage.jsx`
- Modify: `src/routes/StagePage/StagePage.css`

- [ ] **Step 1: `src/routes/StagePage/StagePage.jsx` 갱신**

```jsx
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
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

  // TODO(post-skeleton): Stage ${stageId} 게임 로직 구현
  //   - Stage 1 (괘종시계): 종소리 9회 + 정적 1초 + 10초째 ← 입력
  //   - Stage 2 (반응속도): 빨간 눈 트리거 + 페이크 2~3회
  //   - Stage 3 (캐치): 진짜/가짜 기억 받기·피하기, 받은 위치 정확도
  //   - Stage 4 (3분할): Stage 1·2·3 동시 진행 + 합산
  //   결과 기록은 recordResult(stageId, metric) 호출.
  //   재도전 시 clearStageResult(stageId) 호출 후 재진입.
  //   재도전 UI(언제 노출/횟수 제한)는 후속 결정.

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
      <p className="stage-page__note">TODO: Stage {stageId} 게임 메커닉</p>
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

- [ ] **Step 2: `src/routes/StagePage/StagePage.css` 갱신**

```css
.stage-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  text-align: center;
}

.stage-page__title { margin: 0; font-size: 32px; }
.stage-page__note { margin: 0; opacity: 0.7; }

.stage-page__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.stage-page__actions button {
  padding: 8px 16px;
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
}
```

- [ ] **Step 3: 동작 검증**

```bash
npm run dev
```

브라우저:
- `/` → "시작" → `/opening` → "다음" → `/hub`
- 문 1 → `/stage/1`. 모의 PERFECT 클릭 → `/hub` 복귀, 문 1이 `door_clear.png`로 변경 확인
- 문 2 → 모의 낮은 점수 → `/hub`, 문 2도 클리어 표시
- 문 3 → 모의 PERFECT → `/hub`, 문 4 활성화 확인
- 문 4 → 모의 PERFECT → `/ending` 진입 확인
- (재도전 검증) 다시 `/`로 돌아가서 시작 → `/stage/1` 모의 PERFECT → `/hub` → 문 1 → "결과 무효화" 클릭 → URL은 `/stage/1` 그대로 → `/hub` 직접 이동(주소창) → 문 1이 `door.png`(클리어 해제) 표시 확인

Ctrl+C 종료.

---

## Task 12: EndingPage placeholder + 총점 표시

**Files:**
- Modify: `src/routes/EndingPage/EndingPage.jsx`
- Modify: `src/routes/EndingPage/EndingPage.css`

- [ ] **Step 1: `src/routes/EndingPage/EndingPage.jsx` 갱신**

```jsx
import { useNavigate } from 'react-router-dom';
import { useGameStore, selectTotalScore } from '../../store.js';
import './EndingPage.css';

export default function EndingPage() {
  const navigate = useNavigate();
  const total = useGameStore(selectTotalScore);

  // TODO(post-skeleton): 엔딩 컷씬 (10s) — PRD §5
  //   - 성공/실패 분기 (PRD §7 엔딩 자산)
  //   - 컷씬 종료 후 자동 또는 수동으로 /ranking 이동
  return (
    <div className="ending-page">
      <h1 className="ending-page__title">[Ending]</h1>
      <p className="ending-page__note">TODO: 엔딩 컷씬</p>
      <p className="ending-page__score">최종 점수: {total}</p>
      <button type="button" onClick={() => navigate('/ranking')}>
        랭킹 보기 → /ranking
      </button>
    </div>
  );
}
```

- [ ] **Step 2: `src/routes/EndingPage/EndingPage.css` 갱신**

```css
.ending-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
}

.ending-page__title { margin: 0; font-size: 32px; }
.ending-page__note  { margin: 0; opacity: 0.7; }
.ending-page__score { margin: 12px 0 0; font-size: 24px; }

.ending-page button {
  margin-top: 16px;
  padding: 8px 16px;
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
}
```

- [ ] **Step 3: 동작 검증**

`npm run dev` → `/` 시작 → `/opening` → `/hub` → 문 4개 모의 PERFECT → `/ending` 진입 시 "최종 점수: 0" 표시 (tier 비어있어 점수 0이 정상). Ctrl+C.

---

## Task 13: RankingPage placeholder + resetGame 트리거

**Files:**
- Modify: `src/routes/RankingPage/RankingPage.jsx`
- Modify: `src/routes/RankingPage/RankingPage.css`

- [ ] **Step 1: `src/routes/RankingPage/RankingPage.jsx` 갱신**

```jsx
import { useNavigate } from 'react-router-dom';
import { useGameStore, selectTotalScore } from '../../store.js';
import './RankingPage.css';

export default function RankingPage() {
  const navigate = useNavigate();
  const resetGame = useGameStore((s) => s.resetGame);
  const total = useGameStore(selectTotalScore);

  // TODO(post-skeleton): 랭킹 보드 — PRD §6 ("부스 일일 랭킹"), §11
  //   - 닉네임 입력 모달 + 점수 등록
  //   - localStorage 기반 영속화
  //   - TOP 10 표시 + 본인 결과 하이라이트

  const handleBackToTitle = () => {
    resetGame();
    navigate('/');
  };

  return (
    <div className="ranking-page">
      <h1 className="ranking-page__title">[Ranking Board]</h1>
      <p className="ranking-page__note">TODO: 랭킹 보드 (닉네임 + TOP 10)</p>
      <p className="ranking-page__score">현재 점수: {total}</p>
      <button type="button" onClick={handleBackToTitle}>
        처음으로 → /  (resetGame)
      </button>
    </div>
  );
}
```

- [ ] **Step 2: `src/routes/RankingPage/RankingPage.css` 갱신**

```css
.ranking-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
}

.ranking-page__title { margin: 0; font-size: 32px; }
.ranking-page__note  { margin: 0; opacity: 0.7; }
.ranking-page__score { margin: 12px 0 0; font-size: 20px; }

.ranking-page button {
  margin-top: 16px;
  padding: 8px 16px;
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
}
```

- [ ] **Step 3: 리셋 동작 검증**

`npm run dev`:
- `/` → 시작 → 4문 클리어 → `/ending` → 랭킹 → "현재 점수: 0" (tier 비어있어 0)
- "처음으로" 클릭 → `/` 복귀
- 다시 시작 → `/hub`에서 모든 문이 다시 `door.png`(미클리어) 상태 표시 → 리셋 동작 확인

Ctrl+C.

---

## Task 14: HudOverlay — 좌하단 점수 / 우하단 진행도

**Files:**
- Create: `src/components/HudOverlay/HudOverlay.jsx`
- Create: `src/components/HudOverlay/HudOverlay.css`
- Modify: `src/App.jsx`

- [ ] **Step 1: `src/components/HudOverlay/HudOverlay.jsx` 작성**

```jsx
import { useLocation } from 'react-router-dom';
import { useGameStore, selectTotalScore, selectClearedCount } from '../../store.js';
import './HudOverlay.css';

const HIDDEN_ROUTES = new Set(['/', '/ranking']);

export default function HudOverlay() {
  const { pathname } = useLocation();
  const total = useGameStore(selectTotalScore);
  const cleared = useGameStore(selectClearedCount);

  if (HIDDEN_ROUTES.has(pathname)) return null;

  return (
    <div className="hud-overlay" aria-hidden="false">
      <div className="hud-overlay__score">SCORE {total}</div>
      <div className="hud-overlay__progress">{cleared} / 4</div>
    </div>
  );
}
```

- [ ] **Step 2: `src/components/HudOverlay/HudOverlay.css` 작성**

```css
.hud-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;
}

.hud-overlay__score,
.hud-overlay__progress {
  position: absolute;
  bottom: 16px;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}

.hud-overlay__score    { left: 24px; }
.hud-overlay__progress { right: 24px; }
```

- [ ] **Step 3: `src/App.jsx` 갱신 — HudOverlay 마운트**

```jsx
import RouteTree from './routes/RouteTree.jsx';
import HudOverlay from './components/HudOverlay/HudOverlay.jsx';
import './App.css';

export default function App() {
  return (
    <div className="app-stage">
      <RouteTree />
      <HudOverlay />
    </div>
  );
}
```

- [ ] **Step 4: HUD 동작 검증**

`npm run dev`:
- `/` 접속 → HUD 표시 안 됨 (HIDDEN)
- "시작" → `/opening` → 좌하 "SCORE 0", 우하 "0 / 4" 표시
- `/hub` → 표시 유지
- 문 1 → `/stage/1` → 모의 PERFECT → `/hub` 복귀 → "SCORE 0" + "1 / 4" 표시(tier 비어있어 점수 0이지만 진행도는 증가)
- `/ranking` 진입 → HUD 숨김
- 다시 `/`로 복귀 → HUD 숨김

Ctrl+C.

---

## Task 15: 라우트별 BGM 트랙 레지스트리

**Files:**
- Create: `src/audio/trackRegistry.js`

- [ ] **Step 1: 파일 작성**

```js
// src/audio/trackRegistry.js
import { ASSETS } from '../assets.js';

// 라우트 경로 → 트랙 ID
export const ROUTE_TO_TRACK = {
  '/':         'title',
  '/opening':  'opening',
  '/hub':      'hub',
  '/stage/1':  'stage1',
  '/stage/2':  'stage2',
  '/stage/3':  'stage3',
  '/stage/4':  'stage4',
  '/ending':   'ending',
  '/ranking':  'ranking',
};

// 트랙 ID → 실제 파일 경로
// 뼈대 단계: 모든 슬롯이 동일 파일을 fallback. 후속 이슈에서 라우트별 신규 파일 들어오면 본 맵만 갱신.
export const TRACK_TO_FILE = {
  title:    ASSETS.sounds.bgm,
  opening:  ASSETS.sounds.bgm,
  hub:      ASSETS.sounds.bgm,
  stage1:   ASSETS.sounds.bgm,
  stage2:   ASSETS.sounds.bgm,
  stage3:   ASSETS.sounds.bgm,
  stage4:   ASSETS.sounds.bgm,
  ending:   ASSETS.sounds.bgm,
  ranking:  ASSETS.sounds.bgm,
};

export const BGM_DEFAULTS = {
  volume: 0.7,
  loop: true,
};

// /stage/:id 같은 동적 경로 처리
export function trackIdForPath(pathname) {
  if (pathname.startsWith('/stage/')) {
    const id = pathname.split('/')[2];
    return ROUTE_TO_TRACK[`/stage/${id}`] ?? null;
  }
  return ROUTE_TO_TRACK[pathname] ?? null;
}
```

- [ ] **Step 2: 파일 존재 확인**

```bash
ls src/audio/trackRegistry.js
```

Expected: `src/audio/trackRegistry.js`

---

## Task 16: BgmController + App에 마운트

**Files:**
- Create: `src/audio/BgmController.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: `src/audio/BgmController.jsx` 작성**

```jsx
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useGameStore } from '../store.js';
import { trackIdForPath, TRACK_TO_FILE, BGM_DEFAULTS } from './trackRegistry.js';

// TODO(post-skeleton):
//   - 크로스페이드 전환 (현재는 hard cut)
//   - 음량/음소거 UI (현재는 BGM_DEFAULTS 상수 고정)
//   - 라우트별 신규 BGM 파일 추가 (TRACK_TO_FILE만 갱신)
//   - 효과음(SFX)은 별도 컨트롤러 — 본 컨트롤러는 BGM 전용

export default function BgmController() {
  const audioRef = useRef(null);
  const { pathname } = useLocation();
  const hasUserStarted = useGameStore((s) => s.hasUserStarted);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // ① 사용자 gesture 전 → 절대 재생 시도 안 함 (autoplay 정책 회피)
    if (!hasUserStarted) {
      audio.pause();
      audio.removeAttribute('src');
      return;
    }

    // ② 현재 라우트의 트랙 파일 결정
    const targetId = trackIdForPath(pathname);
    if (!targetId) return;
    const targetFile = TRACK_TO_FILE[targetId];

    // ③ 파일 URL 기준 동일성 검사 → 같은 파일이면 건드리지 않음
    //    (뼈대 단계: 모든 라우트가 동일 파일이므로 끊김 없이 유지)
    //    (정식 단계: 라우트마다 다른 파일이면 자동 전환)
    const targetSrc = new URL(targetFile, window.location.origin).href;
    if (audio.currentSrc === targetSrc) return;

    // ④ hard cut 교체
    audio.src = targetFile;
    audio.volume = BGM_DEFAULTS.volume;
    audio.loop = BGM_DEFAULTS.loop;
    audio.play().catch(() => {
      // 차단 시 silently fail — gesture 후 호출되므로 production에서는 차단 안 됨
    });
  }, [pathname, hasUserStarted]);

  return <audio ref={audioRef} preload="auto" />;
}
```

- [ ] **Step 2: `src/App.jsx` 갱신 — BgmController 마운트**

```jsx
import RouteTree from './routes/RouteTree.jsx';
import HudOverlay from './components/HudOverlay/HudOverlay.jsx';
import BgmController from './audio/BgmController.jsx';
import './App.css';

export default function App() {
  return (
    <div className="app-stage">
      <RouteTree />
      <HudOverlay />
      <BgmController />
    </div>
  );
}
```

- [ ] **Step 3: BGM 동작 검증**

`npm run dev`:
- `/` 접속 → 무음 (hasUserStarted=false 게이트)
- "시작" 클릭 → `/opening` 진입 동시에 BGM 재생 시작 (gesture 트리거 성공)
- `/opening` → `/hub` → `/stage/1` 이동 시 BGM 끊김 없음 (모두 동일 파일)
- 4문 모의 클리어 → `/ending` → `/ranking` 도 BGM 유지
- "처음으로" 클릭 → `/` 복귀 + BGM 정지 (resetGame이 hasUserStarted=false로 되돌림)
- 다시 "시작" 클릭 → BGM 재생 시작 → 다음 플레이 정상 진행

Ctrl+C.

---

## Task 17: 최종 통합 검증 + Phase C 커밋

**Files:** (커밋 대상)
- All under `src/`
- `index.html` (title 변경분)

- [ ] **Step 1: lint 통과 확인**

```bash
npm run lint
```

Expected: 무경고 무에러. 에러 발생 시 해당 파일에서 lint 룰에 맞춰 수정.

- [ ] **Step 2: 시나리오 #1 (정상 플레이 1회분) 수동 검증**

```bash
npm run dev
```

다음을 순서대로 확인하고 모두 통과해야 함:

1. `/` 접속 → 타이틀 표시, BGM 미재생, HUD 숨김
2. "시작" 클릭 → `/opening` 진입, BGM 재생 시작, HUD 표시 ("SCORE 0", "0 / 4")
3. "다음" 클릭 → `/hub`, BGM 끊김 없음
4. 문 1 클릭 → `/stage/1` → "모의 PERFECT" 클릭 → `/hub` 복귀, 문 1 `door_clear.png`로 변경, HUD "1 / 4"
5. 문 2 → 모의 PERFECT → `/hub`, "2 / 4"
6. 문 3 → 모의 PERFECT → `/hub`, "3 / 4", 문 4 활성화 확인
7. 문 4 → `/stage/4` → 모의 PERFECT → `/ending` 진입, "최종 점수: 0" 표시
8. "랭킹 보기" → `/ranking`, HUD 숨김
9. "처음으로" → `/`, BGM 정지, HUD 숨김
10. 다시 "시작" → 모든 문 미클리어 상태로 시작 → `/hub`에서 4문 모두 `door.png`, 문 4 비활성

- [ ] **Step 3: 시나리오 #2 (재도전 primitive) 수동 검증**

11. `/stage/1` → 모의 PERFECT → `/hub` 문 1 클리어 표시
12. 문 1 다시 클릭 → `/stage/1` → "결과 무효화" 클릭 (URL 그대로)
13. 주소창에 `/hub` 직접 입력 → 문 1이 `door.png`(클리어 해제) 표시
14. 문 1 → 모의 낮은 점수 → `/hub` → 문 1 클리어 (덮어쓰기 동작)

- [ ] **Step 4: 시나리오 #3 (라우트 직접 진입) 수동 검증**

15. 주소창 `/stage/99` 입력 → `/hub`로 redirect
16. 주소창 `/unknown` 입력 → `/`로 redirect

- [ ] **Step 5: 모든 시나리오 통과 시 dev 서버 종료**

Ctrl+C.

- [ ] **Step 6: 변경 파일 리스트 확인**

```bash
git status -s
```

Expected (대략):
- `M index.html`
- `?? src/`

- [ ] **Step 7: 빌드 동작 확인 (선택, but 권장)**

```bash
npm run build
```

Expected: 빌드 성공. dist/ 결과물 생성. 실패 시 에러 메시지 따라 수정.

- [ ] **Step 8: Phase C 커밋**

```bash
git add index.html src
git commit -m "feat: PRD v6 뼈대 — 라우터/BGM/점수 스토어 #20"
```

- [ ] **Step 9: 최종 git history 확인**

```bash
git log --oneline -10
```

Expected (위에서 아래로 최근→과거):
- `feat: PRD v6 뼈대 — 라우터/BGM/점수 스토어 #20`
- `chore: react-router-dom, zustand 의존성 추가 #20`
- `chore: 기존 src 전체 제거 — PRD v6 기반 재작성 준비 #20`
- `chore: public 자산을 public/assets/{images,sounds}로 마이그레이션 #20`
- `docs: PRD v6 개정 + 뼈대 이슈 추가 #20`
- `docs: PRD v6 뼈대 설계 문서 작성 ...`
- (기타 이전 커밋들)

---

## Definition of Done 체크리스트

- [ ] `src/` 신규 구조로 재구성 (spec §3.2 트리 일치)
- [ ] `npm run dev` 정상 부팅, 콘솔 에러 없음
- [ ] 6개 라우트(`/`, `/opening`, `/hub`, `/stage/:id`, `/ending`, `/ranking`) 모두 placeholder/실 화면 렌더
- [ ] 타이틀 "시작" 클릭 시 BGM 재생 + `/opening` 진입
- [ ] `/hub`에서 문 4개 PNG 버튼 표시, 1·2·3 클리어 후 4번 활성화
- [ ] HudOverlay가 게임 중 화면에서 점수·진행도 표시 (`/`, `/ranking` 자동 숨김)
- [ ] `/ranking` "처음으로" 시 store 리셋 + `/` 복귀, 다음 시작 가능
- [ ] eslint 무경고 무에러
- [ ] git history에 5개 커밋 분리 (Pre-flight 2개, Phase A, Phase B, Phase C)
