# 캐치 게임(미니게임 3) 설계 문서

> **이슈**: #10 — ⚙️ [기능추가][미니게임] 캐치 게임(3번) 구현
> **브랜치**: `20260503_#10_캐치_게임_3번_구현`
> **PRD 참조**: `docs/PRD.md` §2.3
> **작성일**: 2026-05-03

---

## 1. 개요

PRD §2.3에 정의된 3번 미니게임을 "장비 드롭 캐치" 컨셉으로 구현한다. 1·2번 미니게임의 RPG/장비 보상 톤(전설급 장비 획득, 신화급 무기 각성)을 이어받아, 그린이가 갑옷 장착 직전(미니게임 4 진입 전)에 필요한 장비를 모으는 서사적 다리 역할을 한다.

플레이어는 10초 동안 화면 위에서 떨어지는 장비(검·방패·포션)를 화면 중앙의 빨간 원(장비 거치대) 위치에서 → 키로 캐치한다.

---

## 2. 컨셉 및 시각

### 2.1 테마

- **컨셉**: 장비 드롭 — 하늘에서 떨어지는 장비를 받아내는 훈련
- **캐릭터**: 무방비 그린이 (아직 갑옷 미장착 단계)
- **공간**: 풀밭 위, 머리 위에 빛나는 거치대(빨간 원)

### 2.2 화면 레이아웃

```
┌──────────────────────────────────┐
│  [상단] 남은 시간 / 현재 점수      │
│                                  │
│      ⚔ (떨어지는 장비)            │
│       ↓                          │
│       ↓                          │
│       ↓                          │
│      ◯  ← 빨간 원(장비 거치대)    │
│                                  │
│      🦒  ← 무방비 그린이(sprite)  │
│  ─── 풀밭 ───────────────────    │
└──────────────────────────────────┘
       (배경: world.png)
```

### 2.3 시각 요소

| 요소 | 표현 방식 | 출처 |
|---|---|---|
| 배경 | `<img>` 또는 background-image | `/public/bg/world.png` |
| 그린이 | 스프라이트 시트 + steps() 애니메이션 | `/public/sprites/unified_5_walk_no_weapon.png` (8프레임, 0.8s loop) |
| 빨간 원(거치대) | CSS art (radial-gradient + box-shadow glow) | 자체 |
| 떨어지는 장비 | emoji ⚔ 🛡 🧪 + CSS 회전·낙하 애니메이션 | 자체 |
| 결과 패널 | CSS 모달 (1·2번 패턴 일관) | 자체 |

### 2.4 그린이 위치 계산

PRD §6.3 풀밭 발 위치 공식 적용:

- `STAGE_H = 600`일 때 그린이 `bottom = 600 × (1 - 651/887) - 8 ≈ 151px`
- `left`: 화면 가로 중앙 (`50% - 200px`)
- 빨간 원: 그린이 머리 위, 화면 가로 중앙, `top` 고정 (스테이지 상단에서 약 220px)

---

## 3. 게임 룰 (PRD §2.3 그대로)

| 항목 | 값 |
|---|---|
| 입력 키 | `→` (ArrowRight) |
| 게임 시간 | 10초 |
| 아이템 등장 횟수 | 6개 (5~7 범위 무작위) |
| 아이템 종류 | 검(⚔) / 방패(🛡) / 포션(🧪), 무작위 선택 |
| 등장 간격 | 1.4~1.7초 무작위 |
| 가로 위치 | 화면 가로 중앙 고정 (빨간 원 가로축 정렬) |
| 낙하 시간 | 약 1.5초 (위 → 빨간 원 도달) |
| 낙하 속도 | 단일 게임 1.0배 (4번 병렬 모드에서 1.5배 가중) |

### 3.1 점수 판정

| 조건 | 점수 |
|---|---|
| 정확(빨간 원 중심 ±10px) | 50 |
| 근접(±20px) | 20 |
| 빨간 원 밖에서 → 입력 | 0 |
| 놓침(아이템이 화면 밖으로) | 0 |

판정 기준은 → 키 입력 시점에서 활성화된(아직 화면에 떠 있는) 가장 가까운 아이템과 빨간 원 중심 사이의 세로 거리.

### 3.2 등급 시스템 (1·2번 패턴 준수)

총점 기반:

| 등급 | 총점 | 색상 | 별 |
|---|---|---|---|
| LEGENDARY | 280+ | #ffd700 | 5 |
| RARE | 200+ | #a78bfa | 4 |
| COMMON | 120+ | #86efac | 3 |
| FAIL | 40+ | #fb923c | 1 |
| DEAD | < 40 | #f87171 | 0 |

(만점 = 6개 × 50점 = 300점)

---

## 4. 컴포넌트 구조

```
src/components/CatchGame/
├── CatchGame.jsx          # 메인 컴포넌트, phase state machine
├── CatchGame.css          # 스테이지/배경/sprite/아이템/패널 스타일
├── catchUtils.js          # 등급 판정 (getCatchResult), 점수 산출 로직
└── FallingItem.jsx        # 떨어지는 아이템 단일 컴포넌트(emoji + 애니메이션)
```

### 4.1 CatchGame.jsx 책임

- phase state machine: `idle` → `running` → `result`
- 10초 타이머 (1·2번 패턴: `performance.now()` + RAF 또는 setInterval)
- 아이템 spawn 스케줄 (등장 시각 배열을 시작 시점에 미리 계산)
- 활성 아이템 배열 관리 (id, type, 시작 시각, spawnAt, 낙하 진행도)
- → 키 입력 시 가장 가까운 활성 아이템과 빨간 원의 세로 거리 → 점수 산출 → 아이템 제거
- 모든 아이템이 처리되거나 10초 종료 시 `result` 전환
- 결과 패널 표시 (총점, 정확/근접/실패/놓침 카운트, 등급, 별점, 다시하기/처음으로)

### 4.2 catchUtils.js 책임

```js
// 시그니처만 명시 (구현은 단계 2)
export const TARGET_DISTANCE_PERFECT = 10;  // px
export const TARGET_DISTANCE_NEAR = 20;     // px
export const ITEM_TYPES = ['sword', 'shield', 'potion'];
export const ITEM_EMOJI = { sword: '⚔', shield: '🛡', potion: '🧪' };

export function judgeHit(distancePx) { /* 50/20/0 */ }
export function getCatchResult(totalScore) { /* 등급/색/별 */ }
export function planSpawnTimes(durationMs, count, minGap, maxGap) { /* 등장 시각 배열 */ }
```

### 4.3 FallingItem.jsx 책임

- props: `type`, `startMs`, `fallDurationMs`, `speedMultiplier`
- CSS 변수로 낙하 거리/시간 전달 → keyframes 애니메이션
- emoji 회전(spin) 효과 (선택)

---

## 5. 데이터 흐름

```
[시작 버튼/Space]
   ↓
spawnSchedule = planSpawnTimes(10000, 6, 1400, 1700)
gameStartMs = performance.now()
phase = 'running'
   ↓
RAF 루프 (또는 useEffect interval):
  - 현재 t = now - gameStartMs
  - 새 아이템 spawn (spawnSchedule 소진하면서)
  - 화면 밖으로 나간 아이템 정리 + miss 카운트 증가
   ↓
[→ 키 입력]
  - 활성 아이템 중 빨간 원과 가장 가까운 세로 거리 계산
  - judgeHit(distance) → 점수 누적
  - 해당 아이템 제거 + perfect/near/fail 카운트 증가
   ↓
[10초 경과 OR 모든 아이템 소진]
  phase = 'result'
  result = getCatchResult(totalScore)
   ↓
결과 패널 표시
```

---

## 6. 키 입력

- `→` (ArrowRight): 캐치 시도 (running 중에만 동작)
- `Space`: 시작 (idle/result 상태에서)
- `e.preventDefault()` 호출 (페이지 스크롤 방지)
- 1·2번과 동일한 `useEffect` + `addEventListener("keydown")` 패턴
- 컴포넌트 unmount 시 cleanup

---

## 7. 4번 병렬 게임과의 인터페이스

이번 이슈(#10) 범위는 **단일 캐치 게임만**. 다만 4번에서 재사용할 수 있도록 다음 구조를 미리 만들어둔다:

- `catchUtils.js`의 `judgeHit`, `ITEM_TYPES`, `ITEM_EMOJI`, `planSpawnTimes`는 4번에서 import 가능
- `FallingItem.jsx`도 4번에서 그대로 재사용 가능 (props로 `speedMultiplier=1.5` 전달)
- `CatchGame.jsx` 자체는 4번에서 재사용하지 않음 (4번은 idle/result 사이클 없는 미니화 버전을 자체 구현)

---

## 8. 구현 범위

### In Scope (이슈 #10)

- 단일 캐치 미니게임 구현 (CatchGame 컴포넌트 + utils + CSS + FallingItem)
- App.jsx에 섹션으로 연결
- 1·2번 일관 디자인 (idle/running/result phase, 결과 패널, 등급/별점)
- 무방비 그린이 sprite 적용
- world.png 배경 적용
- 키보드 입력 → 키 + Space, preventDefault
- 컴포넌트 unmount 시 RAF/timer cleanup

### Out of Scope (다음 이슈)

- 병렬 진행 게임(4번) — 별도 이슈
- 전역 점수 store (보스전 도입 시)
- 갑옷 장착 연출 씬 — 별도 이슈
- 사운드/배경음
- localStorage 점수 저장

---

## 9. 검증 기준

- [ ] Space로 시작, idle → running 전환
- [ ] 10초 동안 6개 내외 장비가 화면 위에서 떨어짐 (검/방패/포션 무작위)
- [ ] → 키 입력 시 빨간 원과의 거리에 따라 50/20/0점 부여
- [ ] 빨간 원 밖에서 → 입력은 0점
- [ ] 화면 밖으로 나간 아이템은 자동으로 놓침 처리
- [ ] 10초 후 결과 패널 표시 (총점, 정확/근접/실패/놓침 카운트, 등급, 별점)
- [ ] 다시하기로 재플레이 가능
- [ ] 컴포넌트 unmount 시 RAF/setInterval/setTimeout이 모두 정리됨 (메모리 누수 없음)
- [ ] 화살표 키로 페이지가 스크롤되지 않음
- [ ] 그린이 sprite가 흐릿하지 않게 렌더링 (`image-rendering: pixelated`)
- [ ] 빌드 통과 (`npm run build`), lint 통과 (`npm run lint`)

---

## 10. 위험 / 미해결 사항

- **빨간 원-아이템 거리 판정 시점**: → 키 입력 순간의 아이템 위치를 어떻게 알아낼 것인지. RAF 루프에서 매 프레임 위치를 state/ref에 저장하거나, 아이템의 spawnAt + 경과 시간 기반으로 즉석 계산. → **즉석 계산 방식 채택** (state 갱신 비용 절약, 60fps 부담 없음)
- **emoji 픽셀 톤 일치**: emoji는 OS별 렌더링이 다름. 우선 emoji로 가되, 1·2번 톤과 어긋나면 차후 SVG 또는 CSS art로 교체 가능 (이슈 #10 범위 외)
- **world.png 비율 vs 1번 풀밭 CSS art**: 1번은 자체 풀밭 CSS art, 캐치 게임은 world.png. 시각 톤이 살짝 다를 수 있으나 PRD가 명시한 자산이므로 도입. 통일은 후속 디자인 패스에서.
