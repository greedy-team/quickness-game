# 캐치 게임(미니게임 3) — 신전 테마 리워크 설계 문서

> **이슈**: #10 — ⚙️ [기능추가][미니게임] 캐치 게임(3번) 구현
> **브랜치**: `20260503_#10_캐치_게임_3번_구현` (rework 커밋 추가, 머지 보류)
> **이전 스펙**: `docs/superpowers/specs/2026-05-03-catch-game-design.md` (v1, world.png + sprite 그린이 사용)
> **PRD 참조**: `docs/PRD.md` §2.3
> **작성일**: 2026-05-04

---

## 0. 리워크 사유

v1 구현은 다음 두 가지를 잘못 가정했다:

1. **`/bg/world.png`를 미니게임 배경으로 사용** — world.png는 PRD §6.2가 캐릭터 발 위치 계산용으로 명시한 통합 배경(인트로/보스전 등 큰 흐름용)이고, 미니게임은 1번(숲)·2번(던전)처럼 자체 CSS art 테마를 갖는 것이 프로젝트 패턴.
2. **그린이 sprite (400×220) 도입** — 단일 게임 모드에서는 OK이지만, 4번 병렬 진행 모드에서 좌·중·우 3분할 시 stage 폭이 ~400px로 줄어 sprite가 무대를 가득 채워 비주얼이 깨짐.

이번 리워크는 위 두 가지를 자체 CSS art "신전·제단" 테마로 교체하고, 캐릭터를 제거하여 1/3 width 호환을 확보한다.

---

## 1. 개요

PRD §2.3 캐치 미니게임을 "신이 내려주는 장비를 받는다" 라는 신전·제단 컨셉으로 재구성한다. 캐릭터(그린이)는 무대에 등장하지 않으며, 빛줄기와 함께 떨어지는 장비를 중앙 제단(빨간 원)에서 → 키로 받는다.

게임 룰·점수·키 입력·결과 패널·등급 시스템은 v1과 동일. 시각/레이아웃만 교체.

---

## 2. 컨셉 및 시각

### 2.1 테마

- **컨셉**: 🏛️ 신전·제단 — 신이 그린이에게 장비를 내려주는 신성한 의식
- **캐릭터**: 무대에 등장하지 않음 (서사적으로는 "그린이가 제단 앞에 무릎 꿇고 있다"는 암묵)
- **공간**: 어두운 신전 실내, 좌우 석조 기둥, 중앙 제단

### 2.2 화면 레이아웃

```
┌──────────────────────────────────┐
│  HUD: 남은시간 │ 점수              │
│                                  │
│      ✨ 빛줄기 (위→아래 그라데이션) │
│      ⚔  ↓ 떨어지는 장비            │
│  ║       ║                       │
│  ║       ║                       │
│  ║   ◯   ║   빨간 원(제단)         │
│  ║       ║                       │
│  ║━━━━━━━║   stone platform     │
│   좌기둥   우기둥                  │
└──────────────────────────────────┘
배경: radial-gradient (어두운 보라/네이비)
```

### 2.3 시각 요소 (전부 CSS art, 외부 자산 0개)

| 요소 | 표현 방식 |
|---|---|
| 배경 | radial-gradient (#1a0f2e → #0a0a1f), 약한 noise (선택) |
| 좌·우 기둥 | 2개 div, gradient (stone gray), 윗부분 capital(직사각 + 그림자), 아래 base. 가로 위치 5%/95%, 세로 stage 전체 높이 |
| 빛줄기 | 위에서 내려오는 conic-gradient (gold → 투명, 좁은 각도), opacity 펄스 (1.4s ease-in-out) |
| 제단(빨간 원) | 빨간 원 (기존 디자인 유지: radial-gradient + glow + 펄스 애니메이션) |
| stone platform | 제단 아래 stone 사각형 + 그림자 (제단을 받치는 단상 표현) |
| 떨어지는 장비 | emoji ⚔🛡🧪 (기존 FallingItem 그대로) |

### 2.4 위치 (모두 비율 기반 — 1/3 width 호환)

- **stage**: `width: min(1200px, 100%); height: 600px;` (단일 모드 기준)
- **좌 기둥**: `left: 5%; width: 8%; height: 100%;`
- **우 기둥**: `right: 5%; width: 8%; height: 100%;`
- **빛줄기**: `left: 50%; top: 0; width: 30%; height: 70%; transform: translateX(-50%);`
- **빨간 원**: `left: 50%; top: 70%; transform: translate(-50%, -50%);`
- **stone platform**: 빨간 원 바로 아래, `top: 75%; width: 20%;`
- **HUD**: 기존과 동일 (top: 16px, 가로 중앙)

CSS variable로 stage height를 노출 (`--catch-stage-height`)하여 떨어지는 아이템 애니메이션이 정확히 매칭되게 함.

---

## 3. 게임 룰 (v1과 동일)

| 항목 | 값 |
|---|---|
| 입력 키 | `→` (ArrowRight) |
| 게임 시간 | 10초 |
| 아이템 등장 횟수 | 6개 (5~7 무작위) |
| 아이템 종류 | 검(⚔) / 방패(🛡) / 포션(🧪) |
| 등장 간격 | 1.4~1.7초 무작위 |
| 가로 위치 | 화면 가로 중앙 고정 |
| 낙하 시간 | 2초 |
| 낙하 속도 | 단일 1.0배 (4번에서 1.5배) |

점수: 정확(±10px) 50, 근접(±20px) 20, 외(>20px) 0. 사거리(60px) 밖 입력은 fail 카운트만.

등급: LEGENDARY(280+) / RARE(200+) / COMMON(120+) / FAIL(40+) / DEAD(<40).

---

## 4. 컴포넌트 구조 (v1과 동일)

```
src/components/CatchGame/
├── catchUtils.js          # 상수 + 순수 함수 (ratio 기반 위치로 일부 갱신)
├── FallingItem.jsx        # 변경 없음
├── CatchGame.jsx          # 무대 div 구조 변경 (sprite 제거, 신전 요소 추가)
└── CatchGame.css          # 무대/캐릭터 블록 제거, 신전 블록 추가
```

### 4.1 catchUtils.js 변경 사항

- `RED_CIRCLE_TOP_PX = 420` → `RED_CIRCLE_TOP_RATIO = 0.7` (stage height에 대한 비율)
- `getItemY` 시그니처 동일, 호출처(CatchGame.jsx)에서 `RED_CIRCLE_TOP_RATIO * stageHeight`로 절대값 계산
- 기타 상수/함수 (judgeHit, getCatchResult, planSpawnTimes, pickRandomType) 변경 없음

### 4.2 CatchGame.jsx 변경 사항

기존 `<div className="catch-greenie" />`와 `<div className="catch-bg" />`를 다음 구조로 교체:

```
<div className="catch-stage">
  <div className="catch-bg" aria-hidden />               # 신전 어두운 배경
  <div className="catch-light-beam" aria-hidden />       # 빛줄기
  <div className="catch-pillar catch-pillar-left" aria-hidden />
  <div className="catch-pillar catch-pillar-right" aria-hidden />
  <div className="catch-altar-platform" aria-hidden />   # stone platform
  <div className="catch-circle" aria-hidden />           # 제단(빨간 원, 위치만 ratio로 변경)

  ... FallingItem 렌더 동일 ...
  ... UI overlay 동일 (idle/running/result) ...
</div>
```

idle 패널 텍스트는 일부 표현 갱신 (그린이 표현 → 신전 표현):
- 부제: 그대로 "흐름을 읽고 잡아내라!"
- 본문: "신이 내려주는 장비를 거치대(제단) 위치에서 → 키로 잡아라!"

### 4.3 CatchGame.css 변경 사항

제거:
- `.catch-bg` (world.png 사용 부분)
- `.catch-greenie` 및 `@keyframes catch-greenie-walk`

추가:
- `.catch-bg` (재정의: radial-gradient 어두운 보라/네이비 배경)
- `.catch-pillar` 공통 + `.catch-pillar-left` / `.catch-pillar-right`
- `.catch-light-beam` + `@keyframes catch-light-pulse`
- `.catch-altar-platform`

`.catch-circle` 위치 갱신: `top: 70%` (ratio 기반)으로 변경, 펄스 애니메이션은 그대로.

`.catch-falling-item`의 `@keyframes catch-fall` 변경 없음 (stage height CSS var 사용 그대로).

---

## 5. 데이터 흐름 (v1과 동일)

phase machine, 게임 루프, 입력 처리, 결과 패널 — 모두 v1과 동일.

유일한 차이: 키 입력 핸들러가 `RED_CIRCLE_TOP_PX` 대신 `RED_CIRCLE_TOP_RATIO * STAGE_HEIGHT_PX`를 사용 (혹은 함수에 stage height를 inject).

---

## 6. 키 입력 (v1과 동일)

`→` 캐치, `Space` 시작/재시작, `e.preventDefault()`, useEffect cleanup.

---

## 7. 4번 병렬 게임과의 인터페이스 (강화)

이번 리워크의 핵심 동기. 4번에서 좌·중·우 3분할 시 각 미니게임 stage가 ~400px width로 들어가도 시각이 깨지지 않아야 함:

- 모든 위치가 `%` 또는 ratio 기반 → stage가 줄어도 자동 비율 유지
- 외부 자산 0개 → 가벼움, 캐싱 부담 없음
- 캐릭터 sprite 없음 → 좁은 폭에서 무대를 가득 채우는 문제 해소
- catchUtils + FallingItem + 신전 CSS는 4번 병렬 모드에서 그대로 import 가능

4번 측에서 stage 폭을 조절하는 방법:
- `<CatchGame stageWidth={400} />` props 도입은 **이번 리워크 범위 외** (4번 작업 시 결정)
- 이번 task는 단일 모드 stage가 비율 기반으로 동작하도록만 보장

---

## 8. 구현 범위 (Rework)

### In Scope

- catchUtils.js: `RED_CIRCLE_TOP_PX` → `RED_CIRCLE_TOP_RATIO`로 변환, 호출처 갱신
- CatchGame.jsx: 신전 요소 div 추가, sprite 그린이 div 제거, idle 패널 본문 텍스트 갱신
- CatchGame.css: world.png 배경 제거, sprite 그린이 제거, 신전 요소(배경 그라데이션·기둥 2개·빛줄기·stone platform) 추가, 빨간 원 위치 ratio 적용
- 빌드 통과 + 시각 회귀 없는지 확인

### Out of Scope

- 4번 병렬 게임 (#11에서)
- 그린이 캐릭터를 stage에 다시 도입 (의도적 제외)
- 별먼지, 음향, 추가 폴리시
- catchUtils의 함수 시그니처 변경 (단순 상수 교체만)

---

## 9. 검증 기준

- [ ] world.png 배경 제거됨, 어두운 신전 톤 배경 표시
- [ ] 좌·우 기둥 보임 (gradient stone, capital + base)
- [ ] 위에서 빛줄기 내려오며 부드럽게 펄스
- [ ] 빨간 원이 stage 70% 지점에 펄스하며 표시 (위치 변경 OK)
- [ ] stone platform이 빨간 원 아래 표시
- [ ] 그린이 sprite는 더 이상 보이지 않음
- [ ] 캐치 판정이 새 빨간 원 위치(70%)에서 정상 동작
- [ ] 게임 시작/캐치/결과/재시작 사이클 정상 (회귀 없음)
- [ ] 등급/별점/통계 결과 패널 정상
- [ ] `npm run build` 통과
- [ ] 다른 게임(1·2번) 회귀 없음
- [ ] stage를 강제로 좁혀도(예: dev tools로 width 400px로 줄여서) 시각이 적당히 유지되는지 (1/3 width 호환 확인)

---

## 10. 위험 / 미해결 사항

- **시각 톤 일관성**: 1번(밝은 숲)·2번(어두운 던전) 톤이 서로 다른 만큼, 3번 신전(어두운 보라/네이비 + 금빛 빛줄기)도 자체 톤을 갖는다. 4번 병렬 시 3개 톤이 한 화면에 모이면 시각적으로 정신 없을 수 있으나, 각 컬럼이 명확히 구분되도록 디자인 의도된 결과.
- **빨간 원 위치 변경 (420px → 70%)**: stage height 600 기준 70% = 420 (동일). ratio로 바꿔도 단일 모드에서는 시각/판정 동일. 4번에서 stage 높이가 다르면 자동 비율 유지.
- **CSS art만으로 신전 분위기 표현 한계**: 좌우 기둥 + 빛줄기 정도로 미니멀하게 가되, 시각적으로 "신전이다" 라는 느낌이 약하면 후속 폴리시 (작은 별먼지, 바닥 빛 반사 등) 별도 이슈 가능.

---

## 11. 변경 영향 정리 (PR 본문 참고용)

- 새 자산 추가: 0개
- 제거되는 코드:
  - CatchGame.css의 `.catch-bg` (world.png), `.catch-greenie`, `@keyframes catch-greenie-walk` 블록
- 추가되는 코드:
  - CatchGame.css에 신전 요소 (배경 gradient, 기둥, 빛줄기, platform) 블록
  - CatchGame.jsx에 신전 요소 div 4개
- 동작 차이: 시각만 변경, 게임 로직/점수/키 동일
- 4번 병렬 게임(#11) 작업 시 base 무대로 그대로 활용 가능
