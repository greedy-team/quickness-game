# PRD v6 뼈대 설계 — 라우터 · BGM · 점수 스토어

- 작성일: 2026-05-06
- 대상 이슈: `.issues/20260506_기능추가_PRD_v4_뼈대_초기화면_라우터_BGM.md`
- 브랜치: `20260506_#20_PRD_v4_기반_초기_화면_라우터_BGM_점수_스토어_뼈대_구축`
- 기준 PRD: `docs/PRD.md` (v6)

## 1. 목적

PRD가 v6로 전면 개편되어 게임 컨셉(1인칭 학교 호러, 허브 + 4개 문, 다단계 점수)이 크게 달라졌다. 본 이슈는 **새 컨셉 위에서 다른 팀원이 각 스테이지 게임 로직을 바로 붙일 수 있는 뼈대(scaffold)**를 만드는 것이 목표다. 게임 메커닉, 컷씬, 비주얼 연출은 본 이슈 범위에 포함되지 않는다.

뼈대가 보장해야 할 것:
- 6개 라우트가 화면 전환 가능한 상태로 마운트된다
- 사용자 gesture 후 BGM이 끊김 없이 재생된다
- 스테이지 결과를 기록하면 HUD 점수와 허브 문 상태가 즉시 반영된다
- 랭킹에서 "처음으로" 트리거 시 모든 상태가 초기화된다

## 2. 범위

### In-scope (이번 이슈)
- `src/` 전체 폐기 후 신규 구조로 재구성
- React Router 평탄 URL 라우팅 (6 라우트 + 404)
- Zustand 단일 스토어 (점수·진행·시작 게이트)
- 라우트별 BGM 컨트롤러 + 트랙 레지스트리
- 점수 모듈 시그니처 + 빈 tier 테이블 placeholder
- HUD 오버레이 (점수·진행도)
- 허브 4문 PNG 버튼 (실 동작)
- 타이틀 "시작 / 랭킹 보기" 버튼 (실 동작)
- 그 외 페이지는 placeholder + 다음 라우트 진입 임시 버튼
- Stage placeholder의 모의 점수 입력 버튼 (PERFECT / 낮은 점수 시뮬)

### Out-of-scope (후속 이슈)
- Stage 1·2·3·4 실제 게임 메커닉 (TODO 주석으로만 표시)
- 오프닝(15s) / 엔딩(10s) 컷씬 연출
- 1인칭 시점, 손전등 흔들림
- 자막 영역 UI
- 음량 / 음소거 UI
- 크로스페이드 BGM 전환
- 점수 tier 실 수치
- 단위테스트(vitest 도입)
- 랭킹 데이터 영속화 (localStorage 등)
- 닉네임 입력 모달
- 재도전 UI/UX (store primitive만 포함)
- `.env` 정리

## 3. 아키텍처 개요

### 3.1 의존성 변화

```
+ react-router-dom@^7
+ zustand@^5
```

기존 React 19 + Vite 8 환경 위에 위 두 라이브러리만 추가. 단위테스트 도구(vitest 등)는 후속 이슈로 분리.

### 3.2 폴더 구조 (이번 이슈 완료 시점)

```
src/
├── main.jsx
├── App.jsx
├── App.css
├── reset.css
├── store.js                      # zustand store + selectors
├── scoring.js                    # tier 테이블 + scoreFromMetric
├── assets.js                     # 이미지·사운드 경로 상수
├── audio/
│   ├── BgmController.jsx
│   └── trackRegistry.js
├── components/
│   └── HudOverlay/
│       ├── HudOverlay.jsx
│       └── HudOverlay.css
└── routes/
    ├── RouteTree.jsx
    ├── TitlePage/
    │   ├── TitlePage.jsx
    │   └── TitlePage.css
    ├── OpeningPage/   (jsx + css)
    ├── HubPage/       (jsx + css)
    ├── StagePage/     (jsx + css)
    ├── EndingPage/    (jsx + css)
    └── RankingPage/   (jsx + css)
```

**컨벤션:** 컴포넌트는 폴더 단위(.jsx + .css 짝). 데이터/순수함수 단일 파일은 `src/` 루트.

### 3.3 데이터 흐름

```
[Stage 컴포넌트 (TODO)] ── recordResult(id, metric) ──▶ [store.js]
                                                            │
                  ┌─────────────────────────────────────────┼─────────────────┐
                  ▼                                         ▼                 ▼
            [HudOverlay]                              [HubPage]         [RankingPage]
            (totalScore,                       (isStageCleared,         (totalScore)
             clearedCount)                      isDoor4Unlocked)

[useLocation()] ──▶ [BgmController] ──▶ [trackRegistry] ──▶ <audio src=...>
```

핵심 원칙:
- `BgmController`, `HudOverlay`는 `<App>` 내 `<Routes>` 밖에 1회 마운트 (라우트 전환에 영향 없음)
- `store.js`가 단일 진실 공급원. 문 클리어·총점·door4 활성 모두 `stageResults`에서 파생
- `scoring.js`는 store에 의존하지 않는 순수함수 모듈

## 4. 라우팅

### 4.1 라우트 테이블

| URL | 컴포넌트 | 이번 이슈 동작 |
|---|---|---|
| `/` | `TitlePage` | 시작·랭킹 보기 버튼 (실 동작) |
| `/opening` | `OpeningPage` | placeholder + "다음" → `/hub` |
| `/hub` | `HubPage` | 배경 + 4문 PNG 버튼 (실 동작), 4문 클리어 시 `[엔딩으로]` 버튼 노출 |
| `/stage/:id` | `StagePage` | placeholder + 모의 점수 버튼들 |
| `/ending` | `EndingPage` | placeholder + 총점 표시 + "랭킹 보기" |
| `/ranking` | `RankingPage` | placeholder + "처음으로" |
| `*` | `<Navigate to="/" />` | 알 수 없는 경로는 타이틀로 |

### 4.2 라우터 부트스트랩

```jsx
// main.jsx
import { BrowserRouter } from 'react-router-dom';
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

```jsx
// App.jsx
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

`BrowserRouter` 채택 이유: 깔끔한 평탄 URL, Vite dev 서버 + 부스 환경 제약 없음. 정적 호스팅 필요 시 `HashRouter`로 1줄 교체 가능.

### 4.3 StagePage 파라미터 처리

```jsx
const VALID_IDS = ['1', '2', '3', '4'];

export default function StagePage() {
  const { id } = useParams();
  if (!VALID_IDS.includes(id)) return <Navigate to="/hub" replace />;
  // TODO(post-skeleton): Stage ${id} 게임 로직 구현
  return <StagePlaceholder stageId={Number(id)} />;
}
```

### 4.4 내비게이션 가드

부스 환경은 키보드 입력만 가능하고 URL 직접 조작 경로가 없다. 따라서 가드는 최소화:
- `StagePage`: `id ∈ {1,2,3,4}` 검증만
- `HubPage`: 문 4번을 `disabled` 속성 + CSS로 차단 (URL 가드 아닌 UI 차단)

### 4.5 Stage 4 → 엔딩 전환

Stage 4 placeholder의 모의 종료 버튼이 `/hub`가 아닌 `/ending`으로 직접 navigate. PRD §5 플로우(`최종전 → 엔딩`)와 정확히 일치하며 자연스러운 흐름.

## 5. 상태 관리 (`store.js`)

### 5.1 Store 스키마

```js
const initialState = {
  stageResults: {
    1: null,   //  null | { metric: number, score: number }
    2: null,
    3: null,
    4: null,
  },
  hasUserStarted: false,
};
```

### 5.2 Actions

```js
startGame()                    // hasUserStarted = true
recordResult(stageId, metric)  // scoreFromMetric() 호출 후 stageResults[id] 갱신 (덮어쓰기)
clearStageResult(stageId)      // stageResults[id] = null (재도전 primitive)
resetGame()                    // 전체 initialState로 복귀
```

`recordResult`는 같은 stage에 호출되면 덮어쓰기. 재도전 UI/UX(언제 노출/횟수 제한 등)는 후속 이슈.

### 5.3 Selectors (같은 파일 export)

```js
export const selectTotalScore       = (s) => /* sum of stageResults[i]?.score */
export const selectIsStageCleared   = (n) => (s) => s.stageResults[n] !== null
export const selectIsDoor4Unlocked  = (s) => [1,2,3].every(n => s.stageResults[n] !== null)
export const selectClearedCount     = (s) => /* count of non-null */
```

순수함수로 분리 → store mocking 없이 단위테스트 가능 + Zustand selector 비교 최적화 자동 적용.

### 5.4 Devtools

```js
import { devtools } from 'zustand/middleware';
export const useGameStore = create(devtools((set) => ({ /* ... */ }), { name: 'gameStore' }));
```

다른 팀원이 후속 작업 중 dispatch 흐름을 Redux DevTools로 추적할 수 있도록 포함. production에서 자동 비활성화.

## 6. BGM 컨트롤러

### 6.1 트랙 레지스트리 (3단 분리)

라우트 → 트랙 ID → 파일 경로의 3단 분리. 후속 이슈에서 라우트별 신규 BGM이 들어와도 `TRACK_TO_FILE`만 갱신.

```js
// audio/trackRegistry.js
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

export const TRACK_TO_FILE = {
  // 뼈대 단계: 모든 슬롯이 동일 파일을 fallback
  title: ASSETS.sounds.bgm,
  opening: ASSETS.sounds.bgm,
  hub: ASSETS.sounds.bgm,
  stage1: ASSETS.sounds.bgm,
  stage2: ASSETS.sounds.bgm,
  stage3: ASSETS.sounds.bgm,
  stage4: ASSETS.sounds.bgm,
  ending: ASSETS.sounds.bgm,
  ranking: ASSETS.sounds.bgm,
};

export const BGM_DEFAULTS = { volume: 0.7, loop: true };

export function trackIdForPath(pathname) {
  if (pathname.startsWith('/stage/')) {
    const id = pathname.split('/')[2];
    return ROUTE_TO_TRACK[`/stage/${id}`] ?? null;
  }
  return ROUTE_TO_TRACK[pathname] ?? null;
}
```

### 6.2 컨트롤러 핵심 로직

```jsx
// audio/BgmController.jsx
export default function BgmController() {
  const audioRef = useRef(null);
  const { pathname } = useLocation();
  const hasUserStarted = useGameStore((s) => s.hasUserStarted);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // ① gesture 전 → 절대 재생 시도 안 함 (autoplay 정책 회피)
    if (!hasUserStarted) {
      audio.pause();
      audio.removeAttribute('src');
      return;
    }

    // ② 트랙 결정
    const targetId = trackIdForPath(pathname);
    if (!targetId) return;
    const targetFile = TRACK_TO_FILE[targetId];

    // ③ 파일 URL 기준 동일성 검사 (뼈대 단계 끊김 없음, 정식 단계 자동 전환)
    const targetSrc = new URL(targetFile, window.location.origin).href;
    if (audio.currentSrc === targetSrc) return;

    // ④ hard cut 교체
    audio.src = targetFile;
    audio.volume = BGM_DEFAULTS.volume;
    audio.loop = BGM_DEFAULTS.loop;
    audio.play().catch(() => {});
  }, [pathname, hasUserStarted]);

  return <audio ref={audioRef} preload="auto" />;
}
```

### 6.3 핵심 결정

- **파일 URL 기준 비교** — 뼈대 단계에서 모든 라우트가 같은 파일을 가리켜 라우트 전환 시 끊김 없음. 후속 이슈에서 라우트별 다른 파일로 교체되면 자동 전환.
- **`hasUserStarted` 게이트** — 타이틀 화면(`/`) 무음. "시작" 버튼 클릭(브라우저 gesture 인식) 시점에 `startGame()` + `navigate('/opening')` 동시 호출, 같은 React batch에서 effect가 정식 재생 시작.
- **`<audio>` 비가시** — `controls` 속성 미지정.

## 7. 점수 모듈 (`scoring.js`)

### 7.1 시그니처 고정 + 빈 tier placeholder

```js
// scoring.js

// PRD §13 Tunable. 후속 이슈에서 채움.
// 형식: 1: [{ maxAbsError: number, points: number }, ...]   (오름차순 정렬)
export const STAGE_SCORE_TIERS = {
  1: [],
  2: [],
  3: [],
  4: [],
};

export function scoreFromMetric(stageId, metric) {
  const tiers = STAGE_SCORE_TIERS[stageId];
  if (!tiers || tiers.length === 0) return 0;
  if (typeof metric !== 'number' || Number.isNaN(metric)) return 0;
  const absError = Math.abs(metric);
  const tier = tiers.find((t) => absError <= t.maxAbsError);
  return tier?.points ?? 0;
}
```

뼈대가 보장하는 것:
- 자료형 고정 (`{ metric, score }`)
- tier 형식 고정 (`{ maxAbsError, points }[]`)
- `scoreFromMetric(stageId, metric) → number` 시그니처
- tier 비어 있어도 안전하게 0점 처리 (recordResult가 동작 가능)

실제 tier 수치, 메트릭 의미(타이밍 오차 vs 반응시간 vs 위치 거리)는 후속 이슈에서 결정.

## 8. UI 슬롯

### 8.1 HudOverlay

```jsx
// components/HudOverlay/HudOverlay.jsx
const HIDDEN_ROUTES = ['/', '/ranking'];

export default function HudOverlay() {
  const { pathname } = useLocation();
  const total = useGameStore(selectTotalScore);
  const cleared = useGameStore(selectClearedCount);

  if (HIDDEN_ROUTES.includes(pathname)) return null;

  return (
    <div className="hud-overlay">
      <div className="hud-score">SCORE {total}</div>
      <div className="hud-progress">{cleared} / 4</div>
    </div>
  );
}
```

PRD §10: 좌하단 점수 / 우하단 진행도. CSS는 absolute 위치 지정만.
자막 영역은 후속 이슈에서 컷씬 구현 시 추가 (현 시점 추측 회피).

### 8.2 HubPage 문 PNG 버튼

```jsx
export default function HubPage() {
  const navigate = useNavigate();
  const stageResults = useGameStore((s) => s.stageResults);
  const door4Unlocked = useGameStore(selectIsDoor4Unlocked);

  return (
    <div className="hub" style={{ backgroundImage: `url(${ASSETS.images.hubCorridor})` }}>
      {[1, 2, 3].map((n) => (
        <button key={n} className={`hub-door door-${n}`} onClick={() => navigate(`/stage/${n}`)}>
          <img
            src={stageResults[n] ? ASSETS.images.doorClear : ASSETS.images.door}
            alt={`문 ${n}`}
          />
        </button>
      ))}
      <button
        className={`hub-door door-4 ${door4Unlocked ? '' : 'is-locked'}`}
        onClick={() => navigate('/stage/4')}
        disabled={!door4Unlocked}
        aria-disabled={!door4Unlocked}
      >
        <img src={ASSETS.images.door} alt="문 4" />
      </button>

      {/* 4문 모두 클리어 시 이번 이슈에서는 별도 트리거 불필요:
          Stage 4 placeholder가 /ending으로 직접 navigate. */}
    </div>
  );
}
```

- 진짜 `<button>` + 내부 `<img>` (키보드 포커스/Enter 동작, 부스 키보드 환경 필수)
- 클리어 상태에 따라 `door.png` ↔ `door_clear.png` 교체
- 문 4번 잠금: `disabled` + CSS `is-locked` 클래스로 어둡게 (PRD §3 충족)
- 문 좌표는 placeholder 단계에서 대략, 후속 이슈에서 디자인 맞춰 조정

### 8.3 Placeholder 페이지 공통 패턴

각 placeholder는 동일 형식이어야 다른 팀원이 작업 시작점을 즉시 파악 가능:

```jsx
export default function OpeningPage() {
  const navigate = useNavigate();
  // TODO(post-skeleton): 오프닝 컷씬 (15s) — PRD §2, §5
  //   - 야자 후 빈 학교 → 또 다른 나의 출현
  //   - 종료 시 navigate('/hub')

  return (
    <div className="opening-page">
      <h1 className="placeholder-title">[Opening Cutscene]</h1>
      <p className="placeholder-note">TODO: 오프닝 컷씬 (15s)</p>
      <button type="button" onClick={() => navigate('/hub')}>
        다음 → /hub (placeholder)
      </button>
    </div>
  );
}
```

공통 형식: `[Page Name]` 제목, `TODO:` 짧은 설명, 다음 라우트로 가는 임시 버튼, 상단 주석에 후속 작업 항목.

### 8.4 페이지별 placeholder 동작 표

| 페이지 | placeholder 본체 | 임시 동작 버튼 |
|---|---|---|
| `TitlePage` | 게임 제목 + 시작/랭킹 버튼 (실 동작) | `시작 → startGame() + /opening` / `랭킹 → /ranking` |
| `OpeningPage` | "[Opening Cutscene]" + TODO | `다음 → /hub` |
| `HubPage` | 배경 + 4문 PNG 버튼 (실 동작) | 각 문 → `/stage/N`, 4번은 unlock 전 disabled |
| `StagePage` | "[Stage N]" + TODO + 모의 점수 버튼 | `recordResult(N, 0.05) → /hub` (PERFECT 모의), `recordResult(N, 0.4) → /hub` (낮은 점수 모의). N=4일 때 `→ /ending` |
| `EndingPage` | "[Ending]" + 총점 표시 + TODO | `랭킹 보기 → /ranking` |
| `RankingPage` | "[Ranking Board]" + TODO | `처음으로 → resetGame() + /` |

## 9. 에셋 (`assets.js`)

```js
// src/assets.js
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

`public/assets/{images,sounds}/`에 이미 정리됨. Vite는 `public/` 하위 파일을 절대경로 그대로 서빙.

## 10. 마이그레이션 시퀀스

### Phase A — 기존 코드 제거
1. `git rm -r src/`
2. 커밋: `chore: 기존 src 전체 제거 — PRD v6 기반 재작성 준비`

별도 커밋으로 분리하는 이유: 후속 작업 중 v4 구현이 참조 필요한 시점이 생기면 이 시점으로 정확히 git checkout 가능.

### Phase B — 의존성 추가
3. `npm i react-router-dom@^7 zustand@^5`
4. 커밋: `chore: react-router, zustand 의존성 추가`

### Phase C — 뼈대 생성
5. `src/` 신규 구조로 전체 작성 (섹션 3.2 트리)
6. `index.html` `<title>` 갱신: `그린이는 나야, 둘이 될 수 없어`
7. 동작 확인 (섹션 11 시나리오)
8. 커밋: `feat: PRD v6 뼈대 — 라우터/BGM/점수 스토어 #20`

## 11. 검증 시나리오

### 시나리오 #1: 정상 플레이 1회분
```
1) /  진입               → 타이틀, BGM 미재생
2) [시작] 클릭           → /opening, BGM 재생 시작
3) /opening [다음]       → /hub, BGM 끊김 없음
4) /hub door 1 클릭      → /stage/1
5) /stage/1 [모의 PERFECT] → recordResult(1, 0.05), /hub 복귀
                            HUD 갱신 + door 1이 door_clear.png로
6) door 2, 3 동일         → cleared 3개, door 4 활성화
7) door 4 클릭           → /stage/4 → [모의 PERFECT] → /ending
8) /ending [랭킹 보기]    → /ranking
9) /ranking [처음으로]    → resetGame() + /, BGM 정지
```

### 시나리오 #2: 재도전 primitive
```
1) /stage/1 [모의 PERFECT] 후 /hub
2) door 1 다시 클릭 → /stage/1 [모의 낮은 점수]
3) HUD 점수 갱신 (덮어쓰기 동작 확인)
4) clearStageResult(1) 호출 시 stageResults[1] = null,
   door 1이 door.png로 복귀 (액션은 store API만 검증)
```

### 시나리오 #3: 라우트 직접 진입
```
1) URL /stage/99 → /hub redirect
2) URL /unknown  → /  redirect
```

### 시나리오 #4: BGM 라우트 전환
```
1) /opening → /hub → /stage/1 이동 시 BGM 끊김 없음
   (모든 라우트가 동일 파일 fallback)
2) (후속 이슈에서) /stage/1만 다른 파일 매핑 시 진입 시 hard cut
```

## 12. 완료 정의 (Definition of Done)

- [ ] `src/` 신규 구조 (섹션 3.2 트리 일치)
- [ ] `npm run dev` 정상 부팅, 콘솔 에러 없음
- [ ] 6개 라우트 모두 placeholder 화면 렌더
- [ ] 타이틀 "시작" 클릭 시 BGM 재생 + `/opening` 진입
- [ ] `/hub`에서 문 4개 PNG 버튼 표시, 1·2·3 클리어 후 4번 활성화
- [ ] HudOverlay가 게임 중 화면에서 점수·진행도 표시
- [ ] `/ranking` "처음으로" 시 store 리셋 + `/` 복귀, 다음 시작 가능
- [ ] eslint 무경고 무에러
- [ ] git history Phase A/B/C 커밋 분리

## 13. 위험 요소

| 위험 | 영향 | 대응 |
|---|---|---|
| `index.html`의 main entry 경로 | 빌드 실패 | `<script type="module" src="/src/main.jsx">` Vite 표준 유지 |
| `.env`/`version.yml` | 사용 안 됨 | 손대지 않음 |
| 기존 코드를 import하던 도구 | eslint만 영향 | 새 코드는 eslint 통과 필수 |
| autoplay 정책 차단 | 첫 BGM 미재생 | `hasUserStarted` 게이트로 gesture 후에만 호출 → 차단 안 됨 |
| 라우트 직접 진입(부스 외 환경) | 가드 약함 | StagePage `id` 검증만, 그 외는 허용 (부스 키보드 환경 전제) |

## 14. 후속 이슈 분리

본 뼈대 위에 팀원이 만들 후속 이슈 후보:
- Stage 1 (괘종시계) 메커닉 + 임계값 tier 채움 + 사운드
- Stage 2 (반응속도) 메커닉 + 임계값 tier 채움 + 사운드
- Stage 3 (캐치) 메커닉 + 임계값 tier 채움 + 사운드
- Stage 4 (3분할) 메커닉 + 합산 점수 + 합체 연출
- 오프닝 / 엔딩 컷씬
- 1인칭 시점 + 손전등 흔들림
- 자막 영역 UI
- 음량 / 음소거 UI + 크로스페이드 BGM 전환
- 랭킹 데이터 영속화 + 닉네임 입력
- 재도전 UI/UX 정책 결정
