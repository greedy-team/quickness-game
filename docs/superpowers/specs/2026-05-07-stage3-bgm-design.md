# Stage 3 BGM Integration — Design Spec

- **Date:** 2026-05-07 (revised: phase-gated)
- **Issue:** `.issues/20260507_기능추가_Stage3_Stage4_엔딩_브금_추가.md` (본 스펙은 그중 Stage 3 부분만 다룸)
- **Scope:** Stage 3의 실제 게임 플레이 phase 동안에만 `bgm_stage_3.mp3` 재생
- **Out of scope:** Stage 4 BGM, 엔딩 BGM, 페이드 전환, 음량/음소거 UI, Stage 4 split 모드 BGM

---

## 1. 목표

Stage 3 standalone 모드에서 사용자가 Space로 게임을 시작한 순간(`phase === 'running'`)부터 게임이 끝나는 순간(`phase === 'done'`)까지만 `bgm_stage_3.mp3`를 재생한다. 인트로(Space 대기) 화면과 결과 직후는 무음.

## 2. 배경 / 현재 상태

- 글로벌 BGM 재생기는 라우트 기반: `src/assets.js` → `trackRegistry.js`(`ROUTE_TO_TRACK`, `TRACK_TO_FILE`) → `BgmController.jsx`.
- `stage3` 트랙 ID는 등록되어 있으나 `TRACK_TO_FILE.stage3 = null`로 두어 BgmController는 `/stage/3`에서 무음을 유지한다.
- 음원 파일은 `public/assets/sounds/bgm_stage_3.mp3`로 추가됨 (649 KB).
- Stage 3 컴포넌트는 `idle` → `running` → `done` 3단계 phase를 가지며, Stage 4 split 모드에서도 한 분할로 재사용된다.

## 3. 결정 사항

### 3.1 재생 범위 — phase 기반 (running phase만)

`/stage/3` 라우트 진입만으로 BGM이 재생되지 않는다. 사용자가 인트로에서 Space를 눌러 `phase === 'running'`이 된 순간 BGM이 시작되고, 게임 종료(`phase === 'done'`)와 동시에 정지한다.

**근거:**
- "실제 게임할 때만"이라는 요구를 직접 충족.
- 인트로/결과 화면의 적막이 "게임 시작" 신호를 명확하게 만든다.
- 결과 직후 무음 → `navigate('/hub')` → hub BGM 복귀 흐름이 깔끔.

### 3.2 Standalone 모드 한정

Stage 4 split 모드(`/stage/4` 안의 한 분할로 Stage 3가 들어가는 경우)에서는 BGM을 재생하지 않는다.

**근거:**
- Split 모드는 3개 미니게임이 병렬로 진행됨 → 다른 분할이 자체 BGM을 가지면 충돌.
- 본 이슈 범위는 Stage 3 단독 플레이 한정.

### 3.3 글로벌 BGM 컨벤션 유지

`TRACK_TO_FILE.stage3`는 `null`로 둔다. BgmController는 `/stage/3`에서 무음을 유지한다. Stage 3 BGM은 `Stage3Game` 컴포넌트가 자체적으로 소유한 `<audio>` 엘리먼트로 직접 제어한다.

**근거:**
- 라우트 기반 BgmController와 phase 기반 로컬 BGM이 동시에 같은 트랙을 재생하는 충돌을 방지.
- 글로벌 컨벤션은 그대로 유지하면서, 스테이지별 정밀 제어가 필요한 경우 로컬 audio로 보강하는 패턴을 정착.

### 3.4 자산 키 네이밍 — `bgmStage3`

`assets.js`의 키는 `bgmStage3` (트랙 ID `stage3`와 1:1 대응). Stage3Game에서 `ASSETS.sounds.bgmStage3`로 참조.

### 3.5 재생 파라미터 — `BGM_DEFAULTS` 그대로

- `volume: 0.7`
- `loop: true`
- `BGM_DEFAULTS` 상수를 그대로 import해서 적용 → 글로벌 BGM과 음량 일치.

## 4. 변경 사항

### 4.1 `src/assets.js`

`sounds`에 `bgmStage3` 키를 추가한다 (이미 적용됨).

```js
sounds: {
  bgm:       '/assets/sounds/bgm.mp3',
  bgmStage3: '/assets/sounds/bgm_stage_3.mp3',
  openDoor:  '/assets/sounds/open_door_sound.mp3',
  endingAliveSfx:      null,
  endingSilhouetteSfx: null,
}
```

### 4.2 `src/audio/trackRegistry.js`

변경 없음. `stage3: null` 유지 (BgmController는 `/stage/3`에서 무음).

### 4.3 `src/stages/stage3/Stage3Game.jsx`

`<audio>` 엘리먼트와 phase/mode 기반 재생 effect 추가.

```jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { ASSETS } from '../../assets.js';
import { BGM_DEFAULTS } from '../../audio/trackRegistry.js';
// ...

const audioRef = useRef(null);

useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;

  if (mode === 'standalone' && phase === 'running') {
    audio.volume = BGM_DEFAULTS.volume;
    audio.loop = BGM_DEFAULTS.loop;
    audio.play().catch(() => {});
  } else {
    audio.pause();
    audio.currentTime = 0;
  }
}, [mode, phase]);

// JSX에서 standalone 모드일 때만 audio 엘리먼트 마운트
{mode === 'standalone' && (
  <audio ref={audioRef} src={ASSETS.sounds.bgmStage3} preload="auto" />
)}
```

## 5. 동작 흐름

1. `/hub`에서 hub BGM 재생 중
2. 사용자가 Stage 3 도어 클릭 → `/stage/3` 진입
3. `BgmController`가 `trackIdForPath('/stage/3')` → `'stage3'` → `TRACK_TO_FILE.stage3 = null` 확인 → 기존 hub BGM 정지
4. Stage3Game 마운트 → phase = `'idle'` → 인트로 화면 표시, audio는 마운트되지만 `pause` 상태
5. 사용자 Space 입력 → phase = `'running'` → useEffect 발화 → `audio.play()` → stage3 BGM 시작
6. 게임 진행, BGM 루프 재생
7. 게임 종료 → handleFieldDone → phase = `'done'` → useEffect 발화 → `audio.pause()` + `currentTime = 0`
8. `onResult` → `recordResult(3, metric)` → `navigate('/hub')` → 라우트 변경
9. Stage3Game 언마운트 (audio도 함께 사라짐), BgmController가 hub BGM 다시 시작

## 6. 테스트 시나리오

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | `/hub` → `/stage/3` 진입 (인트로 화면) | hub BGM 정지, 무음 (stage3 BGM 미재생) |
| 2 | 인트로에서 Space 누름 (phase: idle → running) | stage3 BGM 재생 시작 |
| 3 | 게임 플레이 도중 | stage3 BGM 루프 재생 지속 |
| 4 | 게임 종료 (phase: running → done) | stage3 BGM 즉시 정지 (currentTime = 0) |
| 5 | 자동 `/hub` 복귀 | hub BGM 재생 복귀 |
| 6 | 페이지 새로고침 후 `/stage/3` 직접 진입 | 인트로 무음 (autoplay 정책) |
| 7 | 새로고침 후 Space 입력 | gesture 발생 → stage3 BGM 재생 시작 |
| 8 | `/stage/4` 진행 중 Stage 3 분할 표시 | 무음 (mode === 'split' 가드) |
| 9 | `/stage/1`, `/stage/2` 진입 | 무음 (해당 트랙 여전히 `null`) |

## 7. 위험 / 비대상

### 위험
- **첫 진입 시 audio.play() 차단 가능성:** Space 입력은 사용자 gesture라 차단되지 않음. `play().catch(() => {})`로 안전 처리.
- **글로벌 BgmController와의 이중 재생 위험:** `TRACK_TO_FILE.stage3 = null`로 BgmController 측은 항상 무음 → 충돌 없음.
- **Stage3Game 언마운트 시 정지:** React가 audio 엘리먼트를 DOM에서 제거하면 자동으로 재생 중단. 명시적 cleanup 불필요.

### 비대상 (별도 이슈)
- Stage 4, 엔딩 BGM 추가
- 페이드 인/아웃
- 음량/음소거 UI
- Split 모드에서 Stage 3 BGM 재생 (의도적 제외)

## 8. 완료 기준

- `assets.js`에 `bgmStage3` 키 등록
- `trackRegistry.js`의 `stage3` 슬롯이 `null` 유지
- `Stage3Game.jsx`에 phase/mode 기반 audio 제어 추가
- 9개 테스트 시나리오 모두 수동 확인 통과
- 기존 hub BGM 동작 회귀 없음
