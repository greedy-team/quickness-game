# PRD §1.2 사용자 플로우 구현 — Scene Routing + Vite 데모 정리 (#12)

### 📌 작업 개요

App.jsx에 Vite 초기 스캐폴딩(카운터/로고/SNS 링크)과 미니게임 3개가 한 페이지에 세로로 나열되어 있던 구조를 정리하고, PRD §1.2 사용자 플로우(인트로 → MG1 → MG2 → MG3 → 갑옷 → MG4 → 보스 → 엔딩)에 맞춰 한 번에 하나의 씬만 렌더하는 scene routing 도입. 그린이 캐릭터가 직접 월드맵을 걸어 체크포인트(미니게임)에 진입하는 방식으로 PRD 의도를 살림.

### 🎯 구현 목표

- 9개 씬 enum + Context 기반 전역 store (scene/worldStage/totalScore/hasArmor/bossHP)
- 한 번에 하나의 씬만 렌더하는 라우터
- 그린이 좌우 이동 + 체크포인트 진입 시스템
- 기존 미니게임 컴포넌트 최소 변경(props 추가 방식)
- Vite 데모 마크업/자산 완전 제거
- 화면 반응형 (viewport-fit) + 미니게임 화면 확장
- 등급 시스템 5단계 통일 (레전더리/유니크/에픽/레어/일반)

### ✅ 구현 내용

#### Scene routing 토대 (전역 store + Hero + 키보드 훅)
- **파일**: `src/store/gameStore.jsx`, `src/constants/sprites.js`, `src/components/Hero.{jsx,css}`, `src/hooks/useKeyboardMovement.js`
- **변경 내용**: React Context + useReducer로 전역 상태 관리. 5개 액션(`GO_TO_SCENE`, `SET_WORLD_STAGE`, `ADD_SCORE`, `EQUIP_ARMOR`, `RESET`). Hero 컴포넌트(스프라이트 시트 8프레임 0.8s 애니메이션). 키보드 입력 훅(RAF 루프 + arrow 키 preventDefault).
- **이유**: 작은 게임에 zustand 같은 외부 라이브러리 도입은 오버킬. Context+useReducer로 deps 추가 0개. 후속 모든 씬/미니게임이 useGame() 훅으로 상태 접근.

#### Vite 데모 제거 + 새 게임 stage CSS 재구성
- **파일**: `src/App.css`, `src/index.css`, `public/icons.svg`, `src/assets/{react,vite}.svg`, `src/assets/hero.png` (삭제)
- **변경 내용**: 카운터/Vite 로고/SNS 링크/Documentation 섹션 등 스캐폴딩 마크업 + 관련 CSS 클래스(`.hero`, `.ticks`, `#center`, `#next-steps`, `.counter` 등) 모두 제거. 자산 4개 삭제. App.css는 `.app-stage` 1920×960 + `transform: scale(min(100vw/1924, 100vh/964))`로 viewport-fit 반응형. index.css는 game-friendly reset만 보존 + 공통 `.score-rules` / `.tier-*` 색상 클래스 추가.
- **이유**: 이슈 본문 "Vite 초기 스캐폴딩(카운터, hero 이미지, Vite/React/Discord/X.com/Bluesky 링크)" 정리 요청 충족. CSS 번들 약 32kB → 0.5kB까지 감소(미니게임 import 제외 시점 기준).

#### 9개 씬 라우터 + scene 컴포넌트 + 다중 체크포인트
- **파일**: `src/main.jsx`, `src/App.jsx` (전면 재작성), `src/scenes/IntroScene.{jsx,css}`, `src/scenes/PlaceholderScene.{jsx,css}`, `src/scenes/EndingScene.jsx`, `src/scenes/WorldScene.{jsx,css}`
- **변경 내용**:
  - 씬 enum: `intro` / `world` (worldStage 0~5) / `minigame_1~3` / `armor` / `minigame_4` / `boss_fight` / `ending`
  - 라우터 흐름: intro → world(0) → mg1 → world(1) → mg2 → world(2) → mg3 → armor → world(4) → mg4 → world(5) → boss_fight → ending → reset
  - **다중 체크포인트 시스템**: 한 화면에 여러 체크포인트 동시 표시
    - 화면 1 (worldStage 0~2): MG1·MG2·MG3 체크포인트 (centerX 540/1080/1620)
    - 화면 2 (worldStage 4~5): MG4·보스 체크포인트 (centerX 480/1440)
    - 활성/완료(✓)/잠김 상태별 시각 구분 (펄스 애니메이션, 회색, 어두운 색)
  - **그린이 이동**: 200px/s, 좌우 키, 좌(-120)/우(1820) clamp, dt cap (50ms)으로 tab inactive 텔레포트 방지
  - **클리어 후 위치 유지**: getInitialHeroX(worldStage)로 직전 체크포인트 위치에서 재시작
  - 갑옷 진입 시 `EQUIP_ARMOR` 자동 dispatch (App.jsx useEffect)
- **이유**: 이슈 본문 "한 번에 하나의 씬만 보여주는 scene routing" + "각 미니게임 종료 시 점수 누적 후 다음 씬으로 자동 전환" 충족. 다중 체크포인트는 사용자 추가 요청 (간격 두고 선형 진행).

#### 미니게임 scene 통합 + 등급 5단계 + 화면 확장
- **파일**: `src/components/TenSecondsGame/{TenSecondsGame.jsx, gameUtils.js, TenSecondsGame.css}`, `src/components/ColorReactionGame/{ColorReactionGame.jsx, reactionUtils.js, ColorReactionGame.css}`, `src/components/CatchGame/{CatchGame.jsx, catchUtils.js, CatchGame.css}`
- **변경 내용**:
  - **Props 추가**: `autoStart` (현재 미사용, default false), `onComplete(score)`, `onContinue()` — 게임 종료 시 점수 누적 후 다음 씬으로 자동 전환되도록 콜백
  - **점수 함수 추가**: PRD §2.1/§2.2 기반 + 5단계 통일된 boundary (각 미니게임 utils.js의 `getScore()`)
  - **등급 시스템 5단계 통일**:
    | 등급 | 별 | 색상 | 점수 |
    |---|---|---|---|
    | 레전더리 | ⭐⭐⭐⭐⭐ | 금 (#ffd700) | +100 |
    | 유니크 | ⭐⭐⭐⭐ | 마젠타 (#ff007f) | +80 |
    | 에픽 | ⭐⭐⭐ | 보라 (#a78bfa) | +60 |
    | 레어 | ⭐⭐ | 파랑 (#60a5fa) | +40 |
    | 일반 | ⭐ | 연두 (#86efac) | +20 |
  - **각 미니게임 boundary** (점수 ↔ 등급 1:1 매칭):
    - MG1: ±0.05 / ±0.1 / ±0.2 / ±0.4 / 그 외 (초)
    - MG2: ≤150 / ≤250 / ≤400 / ≤600 / 그 외 (ms) + early -20 / timeout 0
    - MG3 누적: ≥230 / ≥180 / ≥130 / ≥80 / <80 (5개 spawn 만점 250)
  - **idle 패널에 판정 기준 표 추가**: 게임 시작 전 사용자가 어떤 정확도가 어떤 등급/점수인지 미리 인지 (시각: 등급 색상 + 별 + 조건 + 점수)
  - **입력 키 정리**: 체크포인트 진입 = Space (모든 미니게임), 게임 시작 = 미니게임 키 (MG1:←, MG2:↑, MG3:→), "다음으로" = Enter 또는 Space (화살표 제거)
  - **화면 확장 (transform: scale)**: ColorReactionGame/CatchGame은 base 1200×600 + `transform: translate(-50%, -50%) scale(1.6)` + absolute centering으로 1920×960 stage에 letterbox 없이 fit. CatchGame의 `STAGE_HEIGHT_PX = 600` 게임 좌표 시스템 보존(난이도/타이밍 무영향). TenSecondsGame은 `width: 100% / height: 100%` (flex layout).
  - **CatchGame 판정 정렬 fix**:
    - 이모지 div의 top edge ↔ 빨간 원 center 비교 → 시각 center ↔ center로 보정 (`ITEM_VISUAL_HEIGHT_PX = 50`의 절반 추가)
    - PERFECT 영역 ±25 → ±30 (시각 48px = 빨간 원 반지름)
    - NEAR 영역 ±50 → ±60 (시각 96px = 빨간 원 직경)
- **이유**: 이슈 본문 "1번/2번/3번 게임 컴포넌트의 자체 시작/재시작 사이클을 씬 라우터와 정합성 유지하는 형태로 조정". 등급 통일은 사용자 요청(idle 표시와 결과 패널의 톤 일관성).

### 🔧 주요 변경사항 상세

#### 입력 키 매핑 (최종)

| 단계 | 진입 (World) | 게임 시작 (idle) | 게임 액션 (running) |
|---|---|---|---|
| MG1 (10초) | Space | ← | ← (정지) |
| MG2 (색상반응) | Space | ↑ | ↑ (반응) |
| MG3 (캐치) | Space | → | → (캐치) |
| MG4 / 보스 (placeholder) | Space | (Enter / Space) | — |
| Placeholder 씬 | — | Enter / Space (다음으로) | — |
| Ending | — | R / Enter (Reset) | — |

**특이사항**:
- 같은 키를 두 번 누르는 패턴 (체크포인트 진입 → 미니게임 시작): idle 패널이 인터럽터 역할 — 사용자가 설명을 읽는 시간 동안 자연스럽게 키를 떼게 되어 잔류 입력 문제 자연 해결
- World 체크포인트 진입 거리: 그린이 가로중심과 체크포인트 중심 ±110px 이내일 때만 활성

#### 화면 반응형

- App-stage base: 1920×960 (FHD 기준)
- `transform: scale(min(calc(100vw/1924), calc(100vh/964)))` + `transform-origin: center`
- 뷰포트에 비율 유지하며 자동 fit (FHD ~1.0배, 4K ~2.0배, 노트북 ~0.75배)
- 비율 차이는 letterbox로 자연 처리 (body overflow:hidden)

#### 게임 로직 보존 원칙

CatchGame의 `STAGE_HEIGHT_PX = 600`, `RED_CIRCLE_TOP_RATIO = 0.7`, `FALL_DURATION_MS = 2000` 등 게임 좌표 상수는 모두 보존. `transform: scale`은 **시각만** 확대하므로 떨어지는 아이템 위치/타이밍/난이도가 그대로 유지됨.

### 📦 의존성 변경

- 없음 (zustand 등 추가 라이브러리 없이 React Context로 처리)

### 🧪 테스트 및 검증

- `npm run build` 통과 (41 modules, 0 warnings)
- 풀 플레이 시나리오 수동 QA:
  1. intro → Space → world(0) → 그린이 좌측 등장
  2. → 키로 MG1 체크포인트 도착 → Space → MG1 idle 패널 (판정표 + ← 키 시작 안내)
  3. ← 키로 시작 → 10초 후 ← 키로 정지 → 결과 패널 (등급+점수+오차)
  4. Enter/Space → world(1) → MG1은 ✓ 처리, 그린이 MG1 위치에서 재시작
  5. MG2/MG3 동일 흐름
  6. world(3) → armor placeholder → world(4) → MG4 placeholder → boss_fight → ending
  7. ending에서 R 또는 Enter → intro 복귀, totalScore 0 리셋
- 모든 씬에서 페이지 스크롤 발생 안 함 (arrow 키 preventDefault)
- viewport 크기 변경 시 stage 자동 비례 fit

### 📌 참고사항

- **lint 미실행**: 프로젝트 ESLint 환경에 `import-x` 플러그인 누락 (기존 환경 이슈, 본 작업과 무관). build로 검증 대체.
- **MG4·갑옷 연출·보스전·엔딩 등급**은 별도 이슈에서 구현 예정 (현재 placeholder 4개로 자리만 마련, 이슈 본문에 명시된 분리 정책)
- **Commit 정리**: 작업 중 39개 commit이 생성되었으나 5개 기능 그룹으로 압축
  1. `docs: scene routing + 미니게임 화면 확장 spec/plan 추가`
  2. `feat: scene routing 토대 (gameStore + Hero 컴포넌트 + useKeyboardMovement 훅)`
  3. `chore: Vite 데모 자산/마크업 제거 + 새 게임 stage CSS (1920x960 viewport-fit + .score-rules)`
  4. `feat: 9개 씬 라우터 + scene 컴포넌트 (Intro/World/Placeholder/Ending) + 다중 체크포인트 시스템`
  5. `feat: 미니게임 scene 통합 + 등급 시스템 5단계 통일 + transform scale fit + 판정 정렬`
- **회복**: backup branch `backup-39-commits` 보존 (원본 39개 commits)
- **설계 문서**: `docs/superpowers/specs/2026-05-04-scene-routing-design.md` + `docs/superpowers/specs/2026-05-04-minigame-stage-expand-design.md` (총 2개 spec + 2개 plan)
