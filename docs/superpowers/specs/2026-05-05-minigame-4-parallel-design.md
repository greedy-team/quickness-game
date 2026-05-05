# 미니게임 4 "결전의 서막" — 병렬 진행 미니게임 설계

- **이슈**: #16 [기능추가][미니게임4] PRD §2.4 병렬 진행 미니게임 구현 (1+2+3번 동시 + 2배 보너스)
- **컨셉**: 결전의 서막 — *"갑옷을 두른 그린이, 모든 시련을 한 번에"*
- **위치**: `armor` 씬 직후, `boss_fight` 씬 직전
- **작성일**: 2026-05-05

---

## 1. 목적과 배경

이슈 #12 작업으로 scene routing은 완성되었으나 4번 미니게임은 placeholder 화면(제목 + "다음으로" 버튼)만 마련된 상태다. 갑옷을 장착한 그린이가 진행해야 할 클라이맥스 단계인데 실제 게임 로직이 없어 스토리상 빈 단계로 남아있다.

PRD §2.4 명세는 1·2·3번을 한 화면에서 동시 진행, 점수 2배, 캐치 속도 1.5배다. 1·2·3번이 "연습/시련"이라면 4번은 갑옷 입은 그린이가 모든 능력(시간 감각·반사신경·동체시력)을 동시에 발휘하는 **결전 직전의 종합 시험**이다.

---

## 2. 요구사항

### 기능 요구사항

- 좌·중·우 3분할 레이아웃에서 1·2·3번 미니게임을 동시 진행
  - 좌: 10초 맞추기 (← 키)
  - 중: 색상 반응 (↑ 키)
  - 우: 캐치 (→ 키, **속도 1.5배**)
- 게임 시간 10초로 통일된 마스터 타이머
- 3영역 점수 합산 → **× 2 보너스 적용**
- 결과 패널에 영역별 점수 + 합산 + 보너스 + 5단계 등급 표시
- App.jsx 라우터에서 `minigame_4` placeholder를 실제 컴포넌트로 교체
- onContinue → `boss_fight` 씬 전환

### 비기능 요구사항

- 1·2·3번 게임 컴포넌트의 게임 로직(점수/판정) 재사용 (코드 중복 금지)
- 5단계 등급 시스템 (레전더리/유니크/에픽/레어/일반) 그대로 사용
- Stage 1920×960 base + transform scale fit (다른 미니게임과 일관)
- gameStore.scene 기반 라우팅 패턴 유지 (외부 라우터 도입 금지)

### 비범위 (Out of Scope)

- 갑옷/검 스프라이트(`walk_weapon`) 시각 적용 — 별도 갑옷 이슈에서 처리되면 자연 연동
- 보스전 데미지 산출 로직 — 본 이슈는 점수 합산까지만 담당
- 1·2·3번 단독 진입 미니게임의 동작 변경 — embedded 모드 추가만, 기존 동작 유지

---

## 3. 아키텍처

### 3.1 새 컴포넌트

```
src/components/ParallelGame/
├── ParallelGame.jsx          # 마스터 오케스트레이터 (idle/running/result)
├── ParallelGame.css          # 3분할 레이아웃 + 결과 패널
└── parallelUtils.js          # getParallelGrade(totalBonus) + 등급 메타
```

### 3.2 기존 컴포넌트 확장 — `embedded` 모드

`TenSecondsGame`, `ColorReactionGame`, `CatchGame`에 다음 prop을 추가한다:

| Prop | Type | 기본값 | 설명 |
|---|---|---|---|
| `embedded` | boolean | `false` | true일 때 자체 idle/result 패널을 숨기고 자체 종료 타이머 비활성화 |
| `externalPhase` | `'idle' \| 'running' \| 'result'` | undefined | embedded일 때 외부에서 phase 주입 (마스터 타이머가 통제) |
| `speedMultiplier` (CatchGame 전용) | number | `1` | FALL_DURATION_MS와 planSpawnTimes 결과를 분할해 낙하 속도 가속 |

**embedded 모드 동작**:
- 자체 idle/result 패널 렌더링 생략 (running phase의 게임 stage UI만 렌더)
- `externalPhase === 'running'`이 들어오면 자동 시작 (mount 직후 또는 phase 변화 시점)
- 자체 종료 트리거 비활성화 — 게임 종료는 오직 `externalPhase === 'result'` 수신으로만 발생:
  - `TenSecondsGame`: 자체 종료 트리거는 ← 키 한정. 마스터가 'result' 전파하면 그 시점의 finalTime/score를 확정 (← 안 눌렀으면 score=0)
  - `ColorReactionGame`: 자체 10초 카운트다운(`gameIntervalRef`) 비활성화. 마스터 'result' 시점에 cleanup
  - `CatchGame`: `endTimeoutRef` 비활성화. 마스터 'result' 시점에 cleanup. `cleanupTimeoutsRef` (아이템 자동 제거 timeout)는 유지 — 시각 정리용
- `externalPhase === 'result'` 수신 시 컴포넌트는 자체 cleanup 함수를 호출하고 미보고 score를 확정 (1회 한정 onComplete)
- 자체 keydown listener는 그대로 유지 (←/↑/→ 키가 다르므로 충돌 없음, Enter/Space는 embedded일 때 무시)
- `onComplete(score)`은 기존대로 1회 호출 (`completedRef` 가드)

### 3.3 데이터 흐름

```
ParallelGame (마스터)
├─ phase: 'idle' → Space/Enter → 'running' → 10초 후 'result'
├─ scoreLeft / scoreCenter / scoreRight (각 영역 onComplete로 수집)
├─ totalRaw = clamp(L+C+R, ≥0)
├─ totalBonus = totalRaw × 2
├─ grade = getParallelGrade(totalBonus)
└─ Renders:
   ├─ Phase 'idle': 통합 안내 패널
   ├─ Phase 'running': 3분할 grid
   │   ├─ Left:   <TenSecondsGame embedded externalPhase="running" onComplete={setScoreLeft} />
   │   ├─ Center: <ColorReactionGame embedded externalPhase="running" onComplete={setScoreCenter} />
   │   └─ Right:  <CatchGame embedded externalPhase="running" speedMultiplier={1.5} onComplete={setScoreRight} />
   └─ Phase 'result': 통합 결과 패널
```

### 3.4 라우터 연결

```jsx
// App.jsx
{state.scene === 'minigame_4' && (
  <ParallelGame
    onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
    onContinue={() => {
      dispatch({ type: 'SET_WORLD_STAGE', payload: 5 });
      dispatch({ type: 'GO_TO_SCENE', payload: 'boss_fight' });
    }}
  />
)}
```

---

## 4. 타이밍과 키보드

### 4.1 마스터 타이머

- `ParallelGame`은 phase 'running' 진입 시점에 `startMs = performance.now()` 기록
- `requestAnimationFrame` 루프로 `elapsedMs` 갱신 → 상단 HUD에 "남은 시간 X.Xs" 표시
- `elapsedMs >= 10000`이 되면 phase 'result'로 전환
- 각 영역의 자체 종료는 `externalPhase="result"` 전파로만 트리거됨 (자체 endTimeout 비활성화)

### 4.2 키보드 입력 분리

- 각 게임 컴포넌트의 기존 `window keydown` listener 그대로 유지
- ←, ↑, → 키 코드가 달라 자연스럽게 분리됨 (동시 입력 시 각 영역 독립 처리)
- `ParallelGame`은 별도 listener:
  - Phase 'idle' + Space/Enter → phase 'running'으로 전환
  - Phase 'result' + Space/Enter → `onContinue()` 호출

### 4.3 진입 키 잔류 방지

- 4번 씬 진입은 World에서 발생하므로 idle 패널 시작 키(Space/Enter)는 잔류 위험 없음
- 기존 `CatchGame`의 `rightKeyArmedRef` 패턴은 그대로 유지 (혹시 모를 케이스 대비)

---

## 5. 게임별 동작 디테일

### 5.1 1번 — 10초 맞추기 (좌)

- mount + `externalPhase="running"` → `startGame()` 자동 호출
- ← 키 누르면 finalTime 기록 → `onComplete(getScore(diff))` 즉시 호출
- 사용자가 ← 안 누르고 마스터 10초 끝남 → `onComplete` 미호출 → ParallelGame이 phase 'result' 시점에 `scoreLeft = 0` 적용
- 영역 안에서는 타이머 디지트와 elapsed time만 표시

### 5.2 2번 — 색상 반응 (중)

- mount + `externalPhase="running"` → `startGame()` 호출
- ⚠️ 기존 대기 시간 4-10초는 마스터 10초 안에 react 윈도우가 안 생길 수 있음
  - **embedded 모드 한정**: 대기 시간을 **2-6초 랜덤**으로 단축 (반응 윈도우 4-8초 보장)
- 일찍 ↑ 누름 → `-20점`
- 시간 초과 → `0점`
- 정상 react → `getScore(reactionTime)` (100/80/60/40/20)

### 5.3 3번 — 캐치 (우)

- mount + `externalPhase="running"` + `speedMultiplier=1.5` → `startGame()` 호출
- `FALL_DURATION_MS_EFFECTIVE = FALL_DURATION_MS / 1.5` (낙하 가속)
- `planSpawnTimes(...)` 호출 시 `fallMs` 인자에 effective 값을 전달해 6개 spawn이 10초 내에 빨간 원 도달하도록 보장 (랜덤 gap에 따라 실제 5~6개 spawn)
- `FallingItem`에 `speedMultiplier` prop을 그대로 전달 (기존 컴포넌트가 이미 `animationDuration` 분할 지원)
- → 키 입력의 거리 판정은 `FALL_DURATION_MS_EFFECTIVE`로 계산해야 정확

---

## 6. 점수와 등급

### 6.1 점수 합산

- 영역별 score는 `ParallelGame`의 로컬 state로 누적
- Phase 'result' 진입 시점에:
  - 미보고 영역(예: 1번 ← 안 누름)은 `0` 강제 적용
  - `totalRaw = Math.max(0, scoreLeft + scoreCenter + scoreRight)` (음수 클램프)
  - `totalBonus = totalRaw × 2`
  - `onComplete(totalBonus)` 호출 → gameStore에 가산
  - `getParallelGrade(totalBonus)`로 등급 산정

### 6.2 5단계 등급 임계치

각 영역 max 점수: 1번 100 + 2번 100 + 3번 300 (`SPAWN_COUNT=6` × 50) = **합산 max 500** → **× 2 보너스 max 1000**

| 등급 | 색상 | 별 | 임계치 (max 1000) | % |
|---|---|---|---|---|
| 🌟 레전더리 | `#ffd700` (gold) | ⭐⭐⭐⭐⭐ | ≥ 900 | ≥ 90% |
| 💎 유니크 | `#ff007f` (pink) | ⭐⭐⭐⭐ | ≥ 750 | ≥ 75% |
| 🔮 에픽 | `#a78bfa` (purple) | ⭐⭐⭐ | ≥ 550 | ≥ 55% |
| ⚔️ 레어 | `#60a5fa` (blue) | ⭐⭐ | ≥ 300 | ≥ 30% |
| 🛡️ 일반 | `#86efac` (green) | ⭐ | < 300 | < 30% |

> 색상 토큰은 다른 미니게임의 `tier-*` 클래스와 통일 (gameUtils/reactionUtils/catchUtils의 `getResult` 색상과 일치).

### 6.3 `parallelUtils.js` 시그니처

```js
export const PARALLEL_MAX_SCORE = 1000;
export const PARALLEL_GRADES = [
  { grade: 'LEGENDARY', threshold: 900, stars: 5, color: '#ffd700', title: '🌟 결전의 영웅', desc: '갑옷 입은 그린이의 모든 능력이 폭발했다.' },
  { grade: 'UNIQUE',    threshold: 750, stars: 4, color: '#ff007f', title: '💎 갑옷의 수호자', desc: '훌륭한 종합 시험. 보스 앞에서도 흔들리지 않으리라.' },
  { grade: 'EPIC',      threshold: 550, stars: 3, color: '#a78bfa', title: '🔮 결전의 전사', desc: '준비는 충분하다. 보스를 향해 나아가자.' },
  { grade: 'RARE',      threshold: 300, stars: 2, color: '#60a5fa', title: '⚔️ 시련의 통과자', desc: '아슬아슬하게 시련을 통과했다.' },
  { grade: 'COMMON',    threshold: 0,   stars: 1, color: '#86efac', title: '🛡️ 새내기 전사', desc: '아직 부족하지만 보스를 향한 첫 발은 뗐다.' },
];

export function getParallelGrade(totalBonus) {
  const score = Math.max(0, totalBonus);
  return PARALLEL_GRADES.find(g => score >= g.threshold);
}
```

---

## 7. UI 레이아웃

### 7.1 Stage (1920×960 base)

```
┌─────────────────────────────────────────────────┐
│  [상단 HUD: 결전의 서막  |  남은 시간 7.3s]     │  ← 80px
├──────────────┬──────────────┬───────────────────┤
│              │              │                   │
│   [1번]      │   [2번]      │     [3번]         │
│  10초맞추기  │  색상반응     │     캐치          │  ← 880px
│   (←)        │   (↑)        │     (→ × 1.5x)   │
│              │              │                   │
└──────────────┴──────────────┴───────────────────┘
   width: 33.3%   33.3%          33.3%
```

- CSS Grid 3-column (`grid-template-columns: 1fr 1fr 1fr`)
- 각 영역의 game stage는 transform scale로 자기 영역에 맞게 축소 (overflow hidden)
- 상단 HUD는 `position: absolute; top: 0;`로 영역 위에 띄움

### 7.2 Idle 패널

- 전체 화면 단일 패널, 어두운 배경 위에 카드
- 제목: **"⚔️ 결전의 서막"**
- 부제: *"갑옷을 두른 그린이, 모든 시련을 한 번에"*
- 3개 영역 게임 미니카드 (좌·중·우):
  - 좌: ⏱ 10초 맞추기 / ← 키
  - 중: 🗿 침묵의 석상 / ↑ 키
  - 우: ⚔️ 장비 캐치 / → 키 (속도 1.5×)
- 보너스 안내: **"3영역 합산 점수 × 2배 보너스"**
- 등급표 (5단계, max 900 기준) — 기존 `.score-rules` + `tier-*` 클래스 재사용
- 시작 버튼: "▶ 결전 시작 (Space / Enter)"

### 7.3 Result 패널

```
   [등급 배지: 레전더리 🌟]
   "결전의 영웅"
   ⭐⭐⭐⭐⭐

   ┌─────────────────────────┐
   │ 좌 (10초 맞추기)   +80  │
   │ 중 (색상 반응)     +60  │
   │ 우 (캐치)         +220  │
   ├─────────────────────────┤
   │ 합산              +360  │
   │ × 2 보너스        +720  │
   ├─────────────────────────┤
   │ 최종 점수         +720  │  ← highlight
   └─────────────────────────┘

   [다음으로 (Enter / Space)]
```

- 기존 미니게임 result 패널 스타일 재사용 (`.result-panel`, `tier-*` 색상 토큰)
- `StarRating` 컴포넌트 재사용 (`TenSecondsGame/StarRating.jsx`)

---

## 8. 에러 / 엣지 케이스

| 케이스 | 처리 |
|---|---|
| 1번 ← 안 누름 | scoreLeft 미보고 → 'result' 시점에 `0` 적용 |
| 2번 일찍 ↑ 누름 | 기존 로직: `-20`점. `totalRaw` 합산 시 `Math.max(0, ...)`로 클램프 |
| 2번 시간 초과 | 0점. embedded 대기 2-6초 단축으로 react 윈도우 보장 |
| 3번 캐치 일부 놓침 | 기존 로직: 놓친 아이템 0점 |
| onComplete 중복 호출 | 각 컴포넌트의 `completedRef` 가드로 1회만 호출 (기존 패턴 유지) |
| 마스터 타이머 vs 자체 종료 충돌 | embedded 모드에서 자체 endTimeout/timer 비활성화. 종료는 `externalPhase`로만 트리거 |
| 진입 키 잔류 | idle → Space/Enter 시작이라 ←/↑/→ 잔류 무관. CatchGame `rightKeyArmedRef` 패턴 유지 |
| 점수 음수 (2번 -20) | `Math.max(0, totalBonus)`로 클램프 후 등급 산정 |

---

## 9. 테스트 전략

### 9.1 등급 함수 검증 (인라인 console.assert)

테스트 인프라(vitest/jest)가 미도입 상태이므로 별도 인프라 도입 없이 `parallelUtils.js` 하단에 자체 self-test를 두거나, 개발 콘솔에서 다음 임계치를 수동 검증:

- `getParallelGrade(1000).grade === 'LEGENDARY'`
- `getParallelGrade(900).grade === 'LEGENDARY'`
- `getParallelGrade(899).grade === 'UNIQUE'`
- `getParallelGrade(750).grade === 'UNIQUE'`
- `getParallelGrade(549).grade === 'RARE'`
- `getParallelGrade(300).grade === 'RARE'`
- `getParallelGrade(299).grade === 'COMMON'`
- `getParallelGrade(0).grade === 'COMMON'`
- `getParallelGrade(-100).grade === 'COMMON'` (음수 클램프)

> 후속 이슈로 vitest 인프라 도입 시 정식 단위 테스트로 이관.

### 9.2 수동 / 통합 테스트 (브라우저)

Vite dev 서버에서 `state.scene = 'minigame_4'` 진입 후 6개 시나리오:

1. **만점 근접**: 모든 영역 최고 등급 → 합산 ≈ 500 ×2 = 1000 → 레전더리
2. **1번 미입력**: 0+100+300=400 ×2 = 800 → 유니크
3. **2번 일찍 누름**: 100-20+300=380 ×2 = 760 (음수 클램프 적용 확인) → 유니크
4. **모두 0점**: 0 → 일반
5. **동시 키 입력**: ←↑→ 동시 누르기 → 각 영역 분리 처리 정상
6. **씬 전환**: result 패널에서 Enter → boss_fight 씬 정상 전환

### 9.3 키 입력 충돌 테스트

- ← 키만 눌렀을 때 1번만 반응 (2·3번 영역 무관)
- 마스터 타이머 동작 중 Space 누름 → idle/result에서만 처리되므로 영향 없음

---

## 10. 작업 순서

1. **기존 컴포넌트에 `embedded` prop 추가** (3개 병렬 가능)
   - `TenSecondsGame`: `embedded`, `externalPhase` prop 추가, embedded일 때 자체 패널 숨김 + 자체 종료 비활성화
   - `ColorReactionGame`: 동일 + 대기 시간 2-6초 단축 (embedded 한정)
   - `CatchGame`: 동일 + `speedMultiplier` prop 추가 (FALL_DURATION_MS, planSpawnTimes 비례)
2. **`parallelUtils.js` 작성** — `getParallelGrade(score)` + 등급 메타데이터
3. **`ParallelGame.jsx` 작성** — 마스터 phase 관리, 점수 수집, 결과 산정, 마스터 타이머
4. **`ParallelGame.css` 작성** — 3분할 grid, idle/result 패널, HUD
5. **App.jsx 라우터 교체** — `minigame_4` placeholder → `<ParallelGame />`
6. **수동 테스트 6개 시나리오 검증**
7. **유닛 테스트 추가** (`parallelUtils.test.js`) — 기존 테스트 인프라 사용

---

## 11. 영향 받지 않는 영역

- `gameStore`: `ADD_SCORE`, `GO_TO_SCENE`, `SET_WORLD_STAGE` 액션 그대로 사용
- World scene과 다른 미니게임의 단독 진입 모드 (embedded=false 유지 시 기존 동작)
- 5단계 등급 시스템 색상/스타일 토큰 (기존 CSS 재사용)
- PlaceholderScene, IntroScene, EndingScene

---

## 12. 참고

- 이슈 #16: `.issues/20260505_기능추가_미니게임4_병렬_진행_구현.md`
- 이슈 #12 (선행): scene routing + 5단계 등급 시스템
- 관련 스펙: `docs/superpowers/specs/2026-05-04-scene-routing-design.md`, `2026-05-04-minigame-stage-expand-design.md`
