# Stage 4 종료 후 점수 기반 성공/실패 엔딩 분기 설계

- 작성일: 2026-05-07
- 대상 이슈: `.issues/20260507_기능추가_엔딩_컷씬_점수분기_구현.md` (#26)
- 브랜치: `20260507_#26_Stage_4_종료_후_점수_기반_성공_실패_엔딩_분기_구현`
- 기준 PRD: `docs/PRD.md` (v6) §5 진행 플로우 / §6 점수 시스템 / §7 엔딩 자산
- 선행 작업: Stage 4 합체 연출 골격 (#23)

## 1. 목적

Stage 4 합체 연출이 끝난 직후 비어 있던 `EndingPage`를 채워, 누적 점수에 따라 두 가지 결말을 갈라 보여준다.

- 성공 — `greenie_alive.png` (진짜 그린이가 귀신을 떨치고 도망친 모습)
- 실패 — `greenie_silhouette.png` (귀신이 된 그린이)

이로써 PRD §5 플로우의 마지막 빈 칸(`[엔딩 10초]`)을 메우고, 점수에 부스 운영상 의미 있는 보상(=결말 분기)을 부여해 재도전 동기를 만든다.

## 2. 범위

### In-scope (이번 이슈)

- 누적 점수 → 성공/실패 2-way 분기 셀렉터 / 헬퍼 추가
- `EndingPage` 실 구현 — 분기 결과에 따라 이미지 + 자막 1줄 렌더, 페이드인, 자동 전환 타이머
- 컷오프·자동 전환 지연·자막 카피의 외부 config화
- `assets.js`에 `greenie_alive.png`, `greenie_silhouette.png` 등록
- BGM/SFX 슬롯 자리 마련 — `TRACK_TO_FILE['ending']`은 그대로 `null` 유지, SFX 키도 `null` placeholder로 등록
- PRD §7 엔딩 자산 표 갱신 (`cutscene_ending_true/bad.png` → 신규 두 자산)

### Out-of-scope (후속 이슈)

- 엔딩 BGM 음원 / 등장 SFX(귀신 등장음, 탈출 효과음) 실 음원 — 본 이슈에서는 슬롯/키만 마련하고 `null`
- 컷씬 모션 강화 — 카메라 흔들림, 글리치, 거울 균열 등
- S/A/B/F 등급 컷오프의 정식 결정 — 엔딩 분기는 단일 컷오프 한 줄로 한정
- 재도전 / 운영자 ESC / 강제 다음 플레이어 정책
- 랭킹 화면 디자인

## 3. 분기 결정 로직

### 3.1 단일 컷오프 (binary)

엔딩 자체는 두 갈래만 존재하므로 등급 시스템(S/A/B/F)이 아직 미정인 상황에서도 독립적으로 작동하는 단일 컷오프를 둔다. 추후 등급이 확정되면 컷오프를 등급 경계와 정합시키되, 분기 코드 변경은 불필요.

```
totalScore >= ENDING_SUCCESS_CUTOFF  →  outcome = 'alive'
totalScore <  ENDING_SUCCESS_CUTOFF  →  outcome = 'silhouette'
```

### 3.2 1차 컷오프 값

- Stage 3 max points: 300, Stage 4 max points: 400 → 4 stage 합산 max는 Stage 1·2 미정으로 잠정.
- PRD §6은 "구간 추후 확정"을 명시하므로, 1차 안은 보수적으로 설정 후 부스 플레이테스트로 조정.
- 1차 안: `ENDING_SUCCESS_CUTOFF = 600` (가변, config로 외부화)
- 등급 컷이 정해지면 등급 S/A 경계 점수와 일치하도록 갱신.

### 3.3 헬퍼 위치

`src/scoring.js`에 함수 1개 추가 (등급 시스템 / 분기 모두 같은 파일에서 관리):

```js
export const ENDING_SUCCESS_CUTOFF = 600; // tunable

export function endingOutcomeFromTotal(totalScore) {
  return totalScore >= ENDING_SUCCESS_CUTOFF ? 'alive' : 'silhouette';
}
```

`store.js`에 셀렉터 추가:

```js
export const selectEndingOutcome = (s) =>
  endingOutcomeFromTotal(selectTotalScore(s));
```

## 4. 엔딩 자산 등록

### 4.1 `src/assets.js` 갱신

```js
images: {
  // ...기존
  endingAlive:      '/assets/images/greenie_alive.png',
  endingSilhouette: '/assets/images/greenie_silhouette.png',
},
sounds: {
  bgm:      '/assets/sounds/bgm.mp3',
  openDoor: '/assets/sounds/open_door_sound.mp3',
  // 엔딩 SFX 슬롯 — 본 이슈에서는 음원 미존재. 후속 이슈에서 파일 추가 시 경로 갱신.
  // images.endingAlive / endingSilhouette 와 이름이 겹치지 않도록 'Sfx' 접미사 사용.
  endingAliveSfx:      null,
  endingSilhouetteSfx: null,
},
```

### 4.2 BGM 라우팅

`TRACK_TO_FILE['ending']`은 현재 `null`. 본 이슈에서도 `null` 유지 — 엔딩 BGM은 음원 추가 시 후속 이슈로.

```js
ending: null, // 후속 이슈에서 ending_bgm.mp3 추가 시 ASSETS.sounds.endingBgm 등으로 갱신
```

### 4.3 PRD §7 갱신

확정 에셋 표에 다음 두 행 추가, "생성 필요" 섹션의 `cutscene_ending_true.png` / `cutscene_ending_bad.png` 행은 "대체됨 — `greenie_alive` / `greenie_silhouette` 사용" 메모로 갱신.

| 파일명 | 용도 |
| --- | --- |
| `greenie_alive.png` | 엔딩 — 성공 (귀신을 떨친 진짜 그린이) |
| `greenie_silhouette.png` | 엔딩 — 실패 (귀신이 된 그린이) |

## 5. EndingPage 구현

### 5.1 컴포넌트 구조

```
EndingPage
 ├─ background           단색(검정) + 가벼운 비네팅
 ├─ EndingCutscene       outcome에 따라 이미지/자막/SFX 키 결정
 │    ├─ <img>           greenie_alive.png 또는 greenie_silhouette.png
 │    ├─ caption         한국어 1줄 (페이드인)
 │    └─ score           누적 점수 표시 (작게)
 └─ AutoAdvanceTimer     N초 후 /ranking, 키 입력 시 즉시 전환
```

### 5.2 state machine

```
[entered]                 마운트 직후
   ↓ (자동)
[reveal]                  이미지 + 자막 페이드인 (≈ 1.0s)
   ↓ (지속 노출)
[hold]                    가만히 노출 (≈ 8.0s)
   ↓ (타이머 만료 또는 키 입력)
[leaving]                 짧은 페이드아웃 (≈ 0.5s)
   ↓
navigate('/ranking')
```

총 노출 시간: PRD §5 "엔딩 10초"에 맞춰 reveal 1s + hold 8s + leave 0.5s ≈ 약 9.5s. 가변(config).

### 5.3 자막 카피 (1차안)

| outcome | 자막 |
| --- | --- |
| `alive` | "또 다른 나를 떨쳐냈다." |
| `silhouette` | "또 다른 내가 되어버렸다." |

부스 가독성: 큰 글씨, 한국어, 흰색/연회색 (PRD §10 자막 가이드 준용). 추후 카피 조정 가능 — 텍스트는 config 한 곳에 둠.

### 5.4 키 입력으로 즉시 전환

- `Space` 또는 `Enter` 입력 시 즉시 `leaving` 진입.
- `running` 외 키는 무시.
- 키 충돌 방지 — Stage들과 다른 라우트이므로 충돌 우려 없음.

### 5.5 SFX 슬롯 (현재는 무음)

`EndingCutscene`은 outcome에 따라 SFX 키를 결정하지만, 음원 경로가 `null`이면 재생을 시도하지 않는다 (그냥 skip). 후속 이슈에서 음원이 추가되면 본 컴포넌트는 변경 없이 자동 활성화.

```js
const sfxKey = outcome === 'alive' ? 'endingAliveSfx' : 'endingSilhouetteSfx';
const sfxSrc = ASSETS.sounds[sfxKey]; // null이면 재생 skip

useEffect(() => {
  if (!sfxSrc) return;            // 음원 없을 때 안전 skip
  const audio = new Audio(sfxSrc);
  audio.volume = 0.8;
  audio.play().catch(() => {});   // 자동재생 실패 silent
  return () => audio.pause();
}, [sfxSrc]);
```

이 패턴은 BGM 라우팅과 일관 — `null = 무음, 경로 = 재생`.

### 5.6 Tunable 외부화

`src/routes/EndingPage/ending.config.js` (또는 `EndingPage` 인접):

```js
export const ENDING_CONFIG = {
  revealMs:   1000,
  holdMs:     8000,
  leaveMs:     500,
  captions: {
    alive:      '또 다른 나를 떨쳐냈다.',
    silhouette: '또 다른 내가 되어버렸다.',
  },
};
```

## 6. 폴더 구조 (이번 이슈 완료 시점)

```
src/
├── assets.js                              # endingAlive/Silhouette 이미지 + sounds null 슬롯
├── scoring.js                             # ENDING_SUCCESS_CUTOFF, endingOutcomeFromTotal
├── store.js                               # selectEndingOutcome 추가
├── audio/trackRegistry.js                 # 변경 없음 (ending: null 유지)
└── routes/EndingPage/
    ├── EndingPage.jsx                     # 실 구현 — outcome 분기, 자동 전환, 키 입력
    ├── EndingPage.css                     # 페이드인 / 비네팅
    ├── EndingCutscene.jsx                 # 이미지 + 자막 + SFX 슬롯
    └── ending.config.js                   # 타이밍·자막 카피·outcome→자산 매핑
```

PRD §7 "확정 에셋" 표 갱신은 `docs/PRD.md`에서 직접 편집.

## 7. 데이터 흐름

```
Stage4Host onResult(stage4Metric)
   ↓
StagePage  recordResult(4, stage4Metric) + navigate('/ending')
   ↓
EndingPage 마운트
   ↓
selectTotalScore + endingOutcomeFromTotal
   ↓
outcome ∈ {'alive', 'silhouette'}
   ↓
EndingCutscene 렌더 — 이미지 + 자막 + SFX 슬롯(null이면 skip)
   ↓
N초 타이머 또는 Space/Enter
   ↓
navigate('/ranking')
```

## 8. 검증 시나리오

### 시나리오 #1: 성공 엔딩 (높은 점수)

```
1) 4 stage 모두 PERFECT 가까운 metric → totalScore ≥ ENDING_SUCCESS_CUTOFF
2) Stage 4 done → /ending 진입
3) greenie_alive.png + "또 다른 나를 떨쳐냈다." 페이드인
4) 누적 점수 표시
5) 약 9.5s 후 자동으로 /ranking
6) /ranking에서 같은 totalScore 노출
```

### 시나리오 #2: 실패 엔딩 (낮은 점수)

```
1) 4 stage 합산이 cutoff 미만
2) Stage 4 done → /ending 진입
3) greenie_silhouette.png + "또 다른 내가 되어버렸다." 페이드인
4) 누적 점수 표시
5) 자동 전환
```

### 시나리오 #3: 키 입력으로 즉시 전환

```
1) /ending 진입, 페이드인 진행 중 Space 누름
2) 즉시 leaving phase 진입 → 짧은 페이드아웃 → /ranking
3) 부스 운영자가 빠르게 다음 플레이어로 넘길 때 사용
```

### 시나리오 #4: SFX 음원 없을 때 안전 동작

```
1) ASSETS.sounds.endingAliveSfx === null
2) EndingCutscene이 sfxSrc === null로 판단 → audio 인스턴스 미생성
3) 시각만 정상 노출, 콘솔 에러 / 깨진 재생 없음
4) 후속 이슈에서 endingAliveSfx 경로 채워지면 자동 재생 활성
```

### 시나리오 #5: 컷오프 경계

```
1) totalScore === ENDING_SUCCESS_CUTOFF (정확히 경계)
2) >= 이므로 'alive' 분기로 진입 (정의 명시: ≥ → alive)
3) 1점 더 낮으면 'silhouette'
```

### 시나리오 #6: resetGame 후 재플레이

```
1) /ranking에서 타이틀로 복귀 → resetGame 호출 (기존 store 정책)
2) stageResults 모두 null → totalScore = 0 → outcome = 'silhouette' (재플레이 시작 시점에는 무관)
3) 새 플레이 진행 후 /ending 진입 시 새 totalScore로 분기 결정 — 직전 결과 잔존 없음
```

## 9. 위험 요소

| 위험 | 영향 | 대응 |
|---|---|---|
| 컷오프 1차 값(600)이 너무 후하거나 너무 박함 | 부스 운영 시 결말이 한쪽으로 쏠림 | config 외부화 — 플레이테스트 후 한 줄 조정. Stage 1·2 점수 tier 확정 시 재산정 |
| 자동재생 정책으로 SFX 미재생 | 음원 추가 후에도 재생 실패 가능 | 본 이슈에서는 SFX `null`이라 영향 없음. 후속 이슈에서 BGM 정책(`hasUserStarted` 등) 준용 |
| 이미지 로딩 지연으로 페이드인 어긋남 | 컷씬 첫 인상 부정적 | Stage 4가 약 30s 진행되는 동안 브라우저 캐시 워밍 시간이 충분하므로 본 이슈에서 별도 preload 파이프라인은 도입하지 않음. 실제 지연이 관찰되면 후속 이슈에서 `<link rel="preload">` 추가로 대응 |
| 부스 회전율 — 9.5s가 길다고 판단될 수 있음 | 시간당 처리 인원 ↓ | config에서 holdMs 줄이면 즉시 단축. 운영자 키 입력으로 단축 가능 |
| outcome 결정 시점에 stageResults가 미완료 | 결과가 0점으로 잡힘 | StagePage가 `recordResult(4, ...)` 후 `navigate('/ending')` 하므로 진입 시점에는 모두 채워져 있음 — 회귀 테스트로 확인 |

## 10. 완료 정의

- [ ] `src/scoring.js`에 `ENDING_SUCCESS_CUTOFF`, `endingOutcomeFromTotal` 추가
- [ ] `src/store.js`에 `selectEndingOutcome` selector 추가
- [ ] `src/assets.js`에 `endingAlive`, `endingSilhouette` 이미지 추가 + sounds에 같은 이름 `null` 슬롯
- [ ] `src/routes/EndingPage/EndingPage.jsx` 실 구현 (outcome 분기 + 자동 전환 + 키 입력)
- [ ] `EndingCutscene.jsx`, `ending.config.js` 작성
- [ ] `EndingPage.css` 페이드인 / 비네팅 스타일
- [ ] `docs/PRD.md` §7 확정 에셋 표 갱신, 생성 필요 섹션의 `cutscene_ending_*.png` 항목 메모 변경
- [ ] `npm run dev`로 시나리오 #1~#6 수동 검증 통과
- [ ] `npm run build` 통과
- [ ] git history Phase별 커밋 분리 (scoring·assets·EndingPage 본체·docs 갱신)

## 11. 후속 이슈 분리

본 이슈 완료 후 발행:

- 엔딩 BGM / SFX 음원 추가 — `ending_alive.mp3`, `ending_silhouette.mp3`, `ending_bgm.mp3` 등 도입 후 `assets.js`(`endingAliveSfx`/`endingSilhouetteSfx`) / `trackRegistry.js`(`ending`)에서 `null` → 경로 교체만 하면 활성
- 등급 시스템 (S/A/B/F) 정식 도입 — `ENDING_SUCCESS_CUTOFF`을 등급 경계와 정합
- 엔딩 모션 폴리싱 — 카메라 흔들림, 글리치, 거울 균열, 스케일 펄스
- 운영자 ESC / 강제 다음 플레이어 정책 — 부스 회전율 보강
