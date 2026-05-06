# Stage 3 풀 구현 + Stage 4 3분할 뼈대 + Sub-Stage Contract 설계

- 작성일: 2026-05-06
- 대상 이슈: `.issues/20260506_기능추가_Stage3_캐치_풀구현_Stage4_3분할_뼈대.md` (#23)
- 브랜치: `20260506_#23_Stage_3_캐치_풀_구현_Stage_4_3분할_뼈대_sub_stage_통합_인터페이스_정의`
- 기준 PRD: `docs/PRD.md` (v6) §4 STAGE 3 / §4 STAGE 4 / §13 Tunable
- 선행 작업: PRD v6 뼈대 (#20)

## 1. 목적

PRD v6 뼈대(#20) 위에서:

1. Stage 3 (캐치) 메커닉을 풀 구현하면서
2. 같은 컴포넌트가 단독 모드(`/stage/3`)와 Stage 4의 한 칸(plug-in)에서 모두 동작하도록 sub-stage contract를 합의하고
3. Stage 4의 3분할 레이아웃·점수 집계·합체 연출 골격을 마련하여
4. 팀원이 후속 이슈로 만들 Stage 1·2가 즉시 plug-in 되도록 한다.

본 이슈가 끝나면 Stage 4 데모가 (Stage 1·2 placeholder + 실제 Stage 3 합쳐) end-to-end 동작해야 하며, 팀원은 Stage 1Game/Stage 2Game을 contract에 맞춰 만들면 1줄 import 교체만으로 통합된다.

## 2. 범위

### In-scope (이번 이슈)

- Stage 3 (캐치) 메커닉 풀 구현 — 양궁형 캐치 존, 6개 아이템 10초 낙하, 정확도별 차등 점수, fake 페널티, 인트로(Space 시작), per-item 결과 시각 피드백, 종료 후 normalize된 metric으로 `recordResult(3, ...)` 호출
- Sub-stage 통합 contract 정의 + 별도 가이드 문서(`docs/superpowers/sub-stage-contract.md`) 작성
- Stage 4 3분할 호스트 — 통합 인트로, isRunning 신호 전파, 3 sub-stage 마운트, 점수 집계(평균), 1초 합체 연출 골격
- Stage 1·Stage 2 placeholder sub-stage — Stage 4의 데모 동작 보장용 임시 컴포넌트 (팀원 작업 도착 전)
- StagePage 라우팅 갱신 — `/stage/3`은 실제 Stage3Game, `/stage/4`는 Stage4Host, `/stage/1`·`/stage/2`는 placeholder 사용
- 모든 숫자(아이템 수, 시간, 점수 tier, fake 페널티 등) `src/stages/stage3/stage3.config.js`에 외부화
- `STAGE_SCORE_TIERS[3]`, `STAGE_SCORE_TIERS[4]` 채움

### Out-of-scope (후속 이슈)

- Stage 1 (괘종시계) 실 구현 — 팀원 이슈
- Stage 2 (반응속도) 실 구현 — 팀원 이슈
- 합체 연출 비주얼 폴리싱 — 거울 균열, "진짜만 남음" 텍스트, 충격음, 1인칭 시점 흔들림 등
- 캐치 시 효과음 / fake 캐치 빨강 깜빡 사운드 / 시작 사운드 등 SFX
- Stage 4 결과 화면 별도 디자인 (현재는 단순 navigate('/ending'))
- 재도전 UI/UX 정책
- 운영자 ESC 키 / 강제 다음 플레이어 진입
- 시드 기반 결정 시퀀스 검증 도구
- bg_stage4_bathroom.png 등 미존재 배경 이미지

## 3. Sub-Stage Contract

### 3.1 컴포넌트 시그니처

```jsx
<StageNGame
  mode="standalone" | "split"
  isRunning={boolean}
  onResult={(metric: number) => void}
/>
```

### 3.2 모드별 책임 분담

| 책임 | standalone | split |
|---|---|---|
| 인트로 화면 (real/fake 미리보기 등) | sub-stage 본인 | 호스트(Stage4Host)가 통합 인트로로 일괄 |
| 시작 트리거 | sub-stage가 직접 `Space` listen | 호스트가 `isRunning=true`로 신호 |
| 게임 진행 (낙하·입력·점수) | sub-stage 본인 | sub-stage 본인 |
| 종료 처리 | `onResult(metric)` 호출 | `onResult(metric)` 호출 |
| 사이즈/레이아웃 | 풀스크린 | ~33% 폭, 스케일 다운 |

### 3.3 수명 주기 (state machine)

```
[mounted]
   ↓
[idle]       standalone: 본인 인트로 표시 + Space 대기
              split:      호스트 인트로 동안 조용히 마운트만
   ↓ (Space 입력 또는 isRunning=true)
[running]    게임 진행
   ↓ (자동 종료, 외부 강제 종료 없음)
[done]       standalone: 짧은 요약 / split: 즉시 onResult
   ↓
[unmount or stay idle]
```

### 3.4 metric 정규화 (모든 sub-stage 공통)

- `metric = 0.0` → 완벽 플레이
- `metric = 1.0` → 최악 (전부 미스/페널티)
- `0 ≤ metric ≤ 1` 범위 보장
- 호스트는 `STAGE_SCORE_TIERS[N]`로 stage 총점 매핑 (기존 `scoreFromMetric` 그대로 사용)

이 정규화 덕분에 Stage 1·2·3·4 모두 동일 scoring 파이프라인을 거친다.

### 3.5 키 충돌 방지 규칙

- Stage 1: `←` 만 listen
- Stage 2: `↑` 만 listen
- Stage 3: `→` 만 listen
- 호스트(Stage 4) / `Space`: 시작 트리거 (running 중에는 무시)
- 각 sub-stage는 자기 키 외 다른 키 무시 → 3분할에서 한 키보드로 동시 입력 가능

### 3.6 가이드 문서

`docs/superpowers/sub-stage-contract.md`로 별도 작성. 내용:

- 위 시그니처·모드별 책임·수명 주기 표
- "이렇게 만들면 plug-in OK" 체크리스트
- Stage 3가 contract 어떻게 따르는지 발췌 예시
- metric 0~1 정규화 가이드
- 키 충돌 방지 규칙

팀원 이슈(Stage 1, Stage 2) 발행 시 이 파일을 링크. contract 변경 시 이 한 파일만 수정.

## 4. Stage 3 (캐치) 메커닉

### 4.1 기본 메커니즘

- 화면 위에서 아이템(real/fake) 6개가 10초 동안 순차 낙하
- 캐릭터/캐처는 **이동 없음**
- 화면 중앙 고정 위치에 가로 띠 형태의 **양궁형 캐치 존** 배치
- 플레이어는 `→` 키를 정확한 타이밍에 눌러 존 안의 아이템을 캐치
- real 아이템: `→` 누르면 정확도별 점수 / 안 누르면 미스(0점)
- fake 아이템: `→` 누르면 페널티(점수 차감) / 안 누르면 정상 통과(0점, 정상)

### 4.2 양궁형 캐치 존 비주얼

화면 높이 25%의 가로 띠. 내부에 5단 색대:

| 영역 | 두께 (존 내 비율) | 색 | per-item 점수 |
|---|---|---|---|
| 중심선 ±5% (PERFECT 골든) | 매우 얇음 | 골든 | 100 |
| ±15% (GREAT) | | 빨강 | 80 |
| ±30% (GOOD) | | 옐로 | 60 |
| ±50% (OK) | | 옅은 옐로 | 40 |
| 캐치 존 안 나머지 (BARE) | | 옅은 회색 | 20 |
| 존 밖 / 미입력 | — | — | 0 |

색대 두께는 `accuracyTiers[i].maxOffset` 값에서 그대로 CSS로 매핑 (튜닝 시 비주얼 자동 동기화).

### 4.3 정확도 측정

- 각 아이템의 "캐치 존 중심선 통과 시각" = `t_center` 계산
- 플레이어가 `→` 누른 시각 = `t_press`
- `offset = (t_press - t_center) / (캐치 존 통과 시간 절반)` → -1.0 ~ 1.0 범위
- `|offset|`을 `accuracyTiers`에 매핑하여 per-item 점수 산출

### 4.4 인트로 화면

타이머 시작 전 표시 (시간 제한 없음, 유저 페이스):

```
┌────────────────────────────┐
│   ⚠️ 기억의 조각이 떨어진다   │
│                              │
│   ✅ 진짜 기억 — 받기 (→)    │
│   [real_1] [real_2] [real_3] │
│                              │
│   ❌ 가짜 기억 — 피하기      │
│   [fake_1] [fake_2] [fake_3] │
│                              │
│   ▶ 준비되면 [Space] 누르기   │
└────────────────────────────┘
```

real/fake 미리보기는 실제 에셋 썸네일 사용. `Space` 누름 시 인트로 페이드 아웃 + 낙하 시작.

### 4.5 시각 피드백

- 캐치 시: 색대 색깔 펄스 (PERFECT=골든, GREAT=빨강, GOOD=옐로, OK=옅은 옐로, BARE=회색) + 짧은 텍스트 ("PERFECT!" 등) 0.4초 표시 후 페이드
- fake 캐치 시: 화면 빨강 빛 깜빡 + "INCORRECT" 텍스트
- 미스 (real 통과): 별도 강조 없이 그대로 통과 (부담 ↓)

### 4.6 아이템 스폰 패턴

- **수량**: 6개 (config 외부화)
- **비율**: real : fake = 4 : 2 (또는 3 : 2, config)
- **간격**: 평균 1.67초, ±0.3초 가변 (살짝 겹침 OK)
- **결정 시퀀스**: 시드 기반 (config에 시드 또는 매 플레이 timestamp 사용 — 디버깅 시 시드 고정 가능)
- **연속 같은 타입 회피**: real/real/real/real 같은 단조 패턴 방지
- **수평 위치**: 중앙 ±20% 내 랜덤 (지루함 감소, 정확도는 수직 위치 기반이므로 무영향)
- **이미지 사이클**: real_1·real_2·real_3 / fake_1·fake_2·fake_3 무작위 차출

### 4.7 Stage-level metric 산출

```
per-item points = Σ (real이면 tier 점수, fake에 누름이면 fakePenalty)
maxPossible    = realCount × 100  // 모든 real을 PERFECT 캐치
clampedRatio   = clamp(perItemPoints / maxPossible, 0, 1)
metric         = 1 - clampedRatio   // 0=완벽, 1=최악

recordResult(3, metric) 호출 → STAGE_SCORE_TIERS[3]가 stage 총점으로 매핑
```

### 4.8 Tunable 외부화 (`src/stages/stage3/stage3.config.js`)

```js
export const STAGE3_CONFIG = {
  durationSec: 10,
  itemCount: 6,
  realCount: 4,                // fakeCount = itemCount - realCount
  fallDurationSec: 2.0,
  catchZoneRatio: 0.25,        // 화면 높이 대비
  spawnIntervalJitterSec: 0.3,
  horizontalRandomRatio: 0.2,
  seed: null,                  // null = 매 플레이 timestamp 사용
  accuracyTiers: [
    { maxOffset: 0.05, points: 100 },
    { maxOffset: 0.15, points: 80  },
    { maxOffset: 0.30, points: 60  },
    { maxOffset: 0.50, points: 40  },
    { maxOffset: 1.00, points: 20  },
  ],
  fakePenalty: -50,
  missScore: 0,
};
```

`STAGE_SCORE_TIERS[3]` (`src/scoring.js`):
```js
3: [
  { maxAbsError: 0.10, points: 300 },   // 거의 완벽
  { maxAbsError: 0.25, points: 240 },
  { maxAbsError: 0.45, points: 180 },
  { maxAbsError: 0.70, points: 120 },
  { maxAbsError: 1.00, points: 60  },
],
```

비주얼(존 두께) ↔ 점수 로직 ↔ 비율 ↔ 시간 모두 같은 객체에서 파생되어 어긋날 일 없음.

## 5. Stage 4 3분할 호스트 (뼈대)

### 5.1 레이아웃

```
인트로 단계:
┌─────────────────────────────────────────────┐
│         최종 시련 — 거울방                     │
│  ⚠️ 3개 시련을 동시에 통과하라                 │
│  ┌──────┬──────┬──────┐                     │
│  │Stage1│Stage2│Stage3│  ← 미리보기            │
│  │ ←    │ ↑    │ →    │                     │
│  │타이밍│반응  │캐치  │                       │
│  └──────┴──────┴──────┘                     │
│  ▶ 준비되면 [Space] 누르기                    │
└─────────────────────────────────────────────┘

진행 단계:
┌─────────────────────────────────────────────┐
│  ┌──────┬──────┬──────┐                     │
│  │Stage1│Stage2│Stage3│  ← 동시 진행           │
│  │split │split │split │                     │
│  │ ←    │ ↑    │ →    │                     │
│  └──────┴──────┴──────┘                     │
│  배경: bg_stage4_bathroom.png (없으면 fallback)  │
└─────────────────────────────────────────────┘
```

### 5.2 컴포넌트 구성

```jsx
<Stage4Host>
  ├─ <Stage4Intro/>                통합 인트로 + Space 대기
  ├─ <Stage4Split>                  3분할 컨테이너
  │    ├─ <Stage1Game mode="split" isRunning={isRunning} onResult={onSubResult(1)} />
  │    ├─ <Stage2Game mode="split" isRunning={isRunning} onResult={onSubResult(2)} />
  │    └─ <Stage3Game mode="split" isRunning={isRunning} onResult={onSubResult(3)} />
  └─ <Stage4MergeOverlay/>          1초 합체 연출 골격
</Stage4Host>
```

### 5.3 State machine

```
[mounted]
   ↓
[intro]      통합 인트로, Space 대기, 3 sub-stage idle 마운트
   ↓ (Space)
[running]    isRunning=true 전파, 3 sub-stage 동시 진행
   ↓ (3개 onResult 모두 도착)
[merging]    1초 합체 연출 (3 panes → 1로 fade/scale)
   ↓
[done]       호스트가 onResult(stage4Metric) 호출 (StagePage가 받아서 recordResult + navigate)
```

### 5.4 점수 집계 (평균)

```js
const [results, setResults] = useState({ 1: null, 2: null, 3: null });

const handleSubResult = (subId) => (metric) =>
  setResults((prev) => ({ ...prev, [subId]: metric }));

useEffect(() => {
  if (results[1] !== null && results[2] !== null && results[3] !== null) {
    const avg = (results[1] + results[2] + results[3]) / 3;
    setStage4Metric(avg);
    setPhase('merging');
  }
}, [results]);

// merging 진입 1초 후
useEffect(() => {
  if (phase === 'merging') {
    const id = setTimeout(() => {
      props.onResult(stage4Metric);   // StagePage가 recordResult(4, ...) + navigate('/ending')
    }, 1000);
    return () => clearTimeout(id);
  }
}, [phase, stage4Metric]);
```

`STAGE_SCORE_TIERS[4]` (`src/scoring.js`):
```js
4: [
  { maxAbsError: 0.10, points: 400 },
  { maxAbsError: 0.25, points: 320 },
  { maxAbsError: 0.45, points: 240 },
  { maxAbsError: 0.70, points: 160 },
  { maxAbsError: 1.00, points: 80  },
],
```

### 5.5 합체 연출 골격 (이번 이슈 범위)

- **목표**: 메커니즘만 검증, 비주얼 디테일은 후속 폴리싱
- **구현**: 1초간 3 panes 동시 fade-out + scale-down + 중앙으로 모이는 단순 CSS transition
- **타이밍**: 3개 onResult 도착 시각부터 정확히 1초 후 done 전이
- **TODO 주석**: 거울 균열 SVG/이미지, 합체 충격음, "[진짜만 남음]" 텍스트 오버레이 등 후속 마커

### 5.6 Stage 1·2 placeholder sub-stage

팀원 작업 도착 전, Stage 4 데모 동작 보장:

```jsx
// src/stages/stage1/Stage1Placeholder.jsx
<Stage1Placeholder mode="split" isRunning={isRunning} onResult={onResult} />
```

동작:
- `mode="split"` 전용 — standalone 모드는 미지원 (이번 이슈 범위 밖)
- `isRunning` watch
- `isRunning=true`되면 N초 카운트다운 표시 + 가짜 진행바
- N초 후 `onResult(0.5)` 호출 (중간 점수)
- 시각: "팀원 작업 대기 중 — Stage 1 (←)" 텍스트 + 진행바
- 팀원이 실제 `Stage1Game.jsx`를 contract에 맞춰 만들면 Stage4Host의 import 1줄 교체로 끝

`Stage2Placeholder`도 동일 패턴 (텍스트만 "Stage 2 (↑)").

### 5.7 StagePage 갱신 (`/stage/:id` 라우팅)

```jsx
// 기존 mock 점수 버튼들 제거. id별로 적절한 게임 컴포넌트 마운트:

if (id === '3') {
  return <Stage3Game mode="standalone" onResult={(m) => {
    recordResult(3, m);
    navigate('/hub');
  }} />;
}

if (id === '4') {
  return <Stage4Host onResult={(m) => {
    recordResult(4, m);
    navigate('/ending');
  }} />;
}

// id === '1' or '2': 팀원 작업 전, mock 버튼 placeholder 그대로 유지
//   또는 Stage{N}Placeholder를 standalone 모드로 마운트해도 OK
```

### 5.8 배경 이미지

- Stage 4 호스트 배경: `bg_stage4_bathroom.png`
- 현재 main에 미존재 → CSS fallback (검은 배경 + 약간의 블루 그라데이션) + TODO 주석
- 별도 이슈에서 배경 이미지 추가 시 1줄 수정으로 활성화

## 6. 폴더 구조 (이번 이슈 완료 시점)

```
src/
├── store.js                              # 기존, 변경 없음
├── scoring.js                            # STAGE_SCORE_TIERS[3], [4] 채움
├── assets.js                             # memory_real/fake 6개 추가, stage4 배경 슬롯
├── audio/                                # 기존
├── components/HudOverlay/                # 기존
├── stages/                               # 신규 디렉터리
│   ├── stage1/
│   │   ├── Stage1Placeholder.jsx         # 임시, 팀원 작업 시 교체
│   │   └── Stage1Placeholder.css
│   ├── stage2/
│   │   ├── Stage2Placeholder.jsx
│   │   └── Stage2Placeholder.css
│   ├── stage3/
│   │   ├── Stage3Game.jsx                # entry, mode·isRunning·onResult props
│   │   ├── Stage3Game.css
│   │   ├── Stage3Intro.jsx               # standalone 인트로 (real/fake 미리보기)
│   │   ├── Stage3Field.jsx               # 낙하 영역 + 캐치 존 (split·standalone 공통)
│   │   ├── CatchZone.jsx                 # 양궁 5단 색대
│   │   ├── FallingItem.jsx               # 개별 아이템 컴포넌트
│   │   ├── ResultPopup.jsx               # PERFECT!/GREAT!/... 잠시 표시
│   │   └── stage3.config.js              # 모든 tunable
│   └── stage4/
│       ├── Stage4Host.jsx                # 인트로·3분할·집계·합체 진입점
│       ├── Stage4Host.css
│       ├── Stage4Intro.jsx               # 통합 인트로
│       ├── Stage4Split.jsx               # 3분할 컨테이너 + sub-stage 마운트
│       └── Stage4MergeOverlay.jsx        # 1초 합체 연출 골격
└── routes/StagePage/                     # 기존, 라우팅 갱신
    ├── StagePage.jsx                     # mock 버튼 제거 후 id별 게임 컴포넌트 마운트
    └── StagePage.css
```

## 7. 데이터 흐름

### 7.1 Standalone 모드 (`/stage/3`)

```
StagePage(id='3')
   ↓ mode="standalone", onResult
<Stage3Game>
   ↓ Space 누름 → idle → running
[10초 낙하 + → 입력 처리]
   ↓ 종료
onResult(metric)
   ↓
StagePage가 recordResult(3, metric) + navigate('/hub')
   ↓
HUD 점수·진행도 자동 갱신, 허브 문 3 클리어 표시
```

### 7.2 Split 모드 (`/stage/4`)

```
StagePage(id='4')
   ↓ onResult
<Stage4Host>
   ├─ Stage4Intro 표시 + Space 대기
   ↓ Space 누름 → isRunning=true 전파
   ├─ <Stage1Placeholder>  → onResult(metric1)
   ├─ <Stage2Placeholder>  → onResult(metric2)
   └─ <Stage3Game split>   → onResult(metric3)
   ↓ 3개 다 받음
   stage4Metric = (m1+m2+m3)/3
   ↓ 1초 합체 연출
   onResult(stage4Metric)
   ↓
StagePage가 recordResult(4, stage4Metric) + navigate('/ending')
```

## 8. 검증 시나리오

### 시나리오 #1: Stage 3 단독 정상 플레이

```
1) /hub → 문 3 클릭 → /stage/3
2) Stage3Intro 표시 — real/fake 미리보기 + Space 안내
3) Space 누름 → 인트로 페이드 아웃, 10초 낙하 시작
4) 6개 아이템 순차 낙하
5) 각 캐치/미스/fake 누름에 시각 피드백
6) 마지막 아이템 통과 후 짧은 요약
7) onResult → recordResult(3, metric) → /hub
8) 허브: 문 3이 door_clear.png로 표시
9) HUD 점수 갱신
```

### 시나리오 #2: Stage 4 데모 (Stage 1·2는 placeholder)

```
1) /hub에서 문 4 클릭 → /stage/4 (1·2·3 클리어 후 활성)
2) Stage4Intro 표시 — 3 미리보기 + Space 안내
3) Space 누름 → 3 sub-stage 동시 시작
4) 좌/중 placeholder: 카운트다운 + 가짜 진행바
5) 우 Stage3Game: 실제 낙하 시퀀스 진행
6) 좌/중 placeholder: N초 후 onResult(0.5)
7) 우 Stage3Game: 10초 후 onResult(실제 metric)
8) 모두 도착 → 1초 합체 연출
9) onResult → recordResult(4, avg) → /ending
10) 엔딩 화면 총점 표시
```

### 시나리오 #3: 시간 제한 없는 인트로

```
1) Stage3 또는 Stage4 인트로 화면에서 Space 누르지 않음
2) 화면 그대로 유지, 자동 진행 없음
3) Space 누르면 그때 시작
```

### 시나리오 #4: fake 누름 페널티

```
1) Stage3 진행 중 fake 아이템이 캐치 존 진입
2) 플레이어 → 누름
3) 빨강 빛 깜빡 + INCORRECT 텍스트
4) 내부 점수: -50 적용
5) 종료 후 metric 산출 시 페널티 반영
```

### 시나리오 #5: contract 검증

```
1) Stage3Game이 standalone 모드에서 풀 동작 (인트로 본인 표시, Space 본인 listen)
2) Stage3Game이 split 모드에서 호스트 신호로 시작
3) Stage1/2 Placeholder가 같은 contract로 동작 → 추후 실제 게임이 1줄 import 교체로 통합
```

## 9. 위험 요소

| 위험 | 영향 | 대응 |
|---|---|---|
| 양궁 색대 두께가 화면 크기에 따라 부정확 | 정확도 측정 어긋남 | 비율 기반 좌표 + ResizeObserver, 측정은 시각이 아닌 시간으로 (`t_press` vs `t_center`) |
| 낙하 애니메이션이 각 브라우저별 jitter | 시간 측정 부정확 | `requestAnimationFrame` + `performance.now()` 사용, 실측 시각 기반 |
| Stage 4 placeholder가 실제 게임과 동작 차이 큼 | 통합 시 surprise | placeholder도 contract(props·onResult metric 0~1) 100% 준수, 실 게임은 contract 그대로 따라 만들면 끝 |
| `bg_stage4_bathroom.png` 미존재 | 시각 빠짐 | CSS fallback + TODO 주석, 별도 이슈에서 추가 |
| 시드 기반 시퀀스가 단조로움 | 부스 반복 플레이어 지루 | 시드 = `null`이면 매 플레이 timestamp 사용 (config 옵션) |
| 인트로 시간 무제한 → 부스 회전율 ↓ | 운영 효율 ↓ | 운영자 ESC 키 후속 이슈 (현재는 신뢰) |

## 10. 완료 정의

- [ ] `src/stages/stage3/` 트리 완성, 풀 메커닉 동작
- [ ] `src/stages/stage4/Stage4Host.jsx` + 부속 컴포넌트 완성
- [ ] `src/stages/stage1/Stage1Placeholder.jsx`, `src/stages/stage2/Stage2Placeholder.jsx` 작성
- [ ] `StagePage.jsx`에서 mock 점수 버튼 제거, id별 게임 컴포넌트 마운트
- [ ] `STAGE_SCORE_TIERS[3]`, `STAGE_SCORE_TIERS[4]` 채워짐
- [ ] `assets.js`에 memory_real/fake 6개 + stage4 배경 슬롯(미존재 fallback) 등록
- [ ] `docs/superpowers/sub-stage-contract.md` 가이드 문서 작성
- [ ] `npm run dev`로 Stage 3 단독 시나리오 + Stage 4 split 시나리오 모두 수동 검증 통과
- [ ] `npm run build` 통과
- [ ] git history Phase별 커밋 분리 (config·contract·Stage3·Stage4·StagePage 갱신)

## 11. 후속 이슈 분리

본 이슈 완료 후 발행:

- Stage 1 (괘종시계) 메커닉 — 팀원 담당, sub-stage contract 따라 작성
- Stage 2 (반응속도) 메커닉 — 팀원 담당, sub-stage contract 따라 작성
- Stage 4 합체 연출 비주얼 폴리싱 — 거울 균열·"진짜만 남음" 텍스트·충격음·1인칭 흔들림
- 캐치/입력/합체 SFX 추가 — `audio/` 모듈 확장
- bg_stage4_bathroom.png 등 미존재 배경 이미지 추가
- 운영자 ESC 키 / 강제 다음 플레이어 진입 정책
- 재도전 UI/UX 정책
