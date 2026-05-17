# Audio Control Unification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stage 2의 사운드 호출부가 useAudioStore(BGM/SFX 볼륨, 마스터 음소거)를 따르도록 만들어, 게임 전체에서 단일 사운드 컨트롤이 일관 적용되게 한다.

**Architecture:** `Stage2Placeholder.jsx`의 직접 `new Audio` + 하드코딩 볼륨 패턴을 다른 스테이지(1/3/4)와 동형으로 정렬한다. 짧은 fire-and-forget SFX는 `playSfx` 유틸로, 인스턴스 보관이 필요한 BGM과 점프스케어는 `useAudioVolume` 훅 + 기존 ref 패턴으로 전환한다. 외부 모듈(`useAudioStore`, `useAudioVolume`, `playSfx`, `BgmController`, `AudioControls`)은 변경하지 않는다.

**Tech Stack:** React 18, zustand(persist), Vite, Vitest, jsdom

**Spec:** `docs/superpowers/specs/2026-05-17-audio-control-unification-design.md`

---

## File Structure

- Modify: `src/stages/stage2/Stage2Placeholder.jsx` (유일한 수정 대상)
- 신규 파일 없음
- 테스트 신규 파일 없음 (스펙 §6에 따라 Stage 2 단위 테스트는 추가하지 않음)

---

## Task 1: BGM을 useAudioVolume에 연결

**Files:**
- Modify: `src/stages/stage2/Stage2Placeholder.jsx` (import 추가, BGM 재생부, 신규 동기화 effect)

- [ ] **Step 1: import 추가**

파일 상단 import 블록에 한 줄 추가한다.

```jsx
import { useAudioVolume } from '../../audio/useAudioVolume.js';
import { playSfx } from '../../audio/playSfx.js';
```

(playSfx도 Task 2, 3에서 곧 쓰이므로 같이 import 한다.)

- [ ] **Step 2: 컴포넌트 본문에서 볼륨 구독**

`useState`/`useRef` 선언들 근처(stateRef 선언 위)에 두 줄 추가한다.

```jsx
const bgmVolume = useAudioVolume('bgm');
const sfxVolume = useAudioVolume('sfx');
```

(sfxVolume는 Task 4에서 점프스케어에 사용한다.)

- [ ] **Step 3: BGM 재생부의 하드코딩 볼륨 교체**

현재 (L99-106 부근):

```jsx
if (phase === 'PLAY' && isRunning) {
  bgm.volume = 0.5; 
  bgm.currentTime = 86; 
  bgm.play().catch(() => {});
} else {
  bgm.pause();
}
```

다음으로 교체한다.

```jsx
if (phase === 'PLAY' && isRunning) {
  bgm.volume = bgmVolume * 0.5;
  bgm.currentTime = 86;
  bgm.play().catch(() => {});
} else {
  bgm.pause();
}
```

이 useEffect의 deps 배열에 `bgmVolume`을 추가한다 (현재 `[phase, isRunning]` → `[phase, isRunning, bgmVolume]`).

- [ ] **Step 4: BGM 볼륨 실시간 동기화 effect 추가**

위 useEffect 바로 아래에 신규 useEffect를 추가한다. 재생 중에 사용자가 슬라이더를 움직이거나 음소거를 토글하면 즉시 반영하기 위함이다.

```jsx
useEffect(() => {
  const bgm = audioRefs.current.bgm;
  if (bgm) bgm.volume = bgmVolume * 0.5;
}, [bgmVolume]);
```

- [ ] **Step 5: 수동 청각 검증**

```bash
npm run dev
```

브라우저에서:
1. hub에서 BGM 슬라이더를 50%로 → /stage/2 진입 → BGM이 들리되 평소보다 작은지 확인.
2. /stage/2 플레이 중 (다른 탭이나 콘솔을 통해) hub로 돌아가 BGM 슬라이더를 0%로 내린 뒤 다시 /stage/2로 들어가 — 무음 확인.
3. hub에서 마스터 음소거 ON → /stage/2 진입 → BGM 무음 확인.

- [ ] **Step 6: Commit**

```bash
git add src/stages/stage2/Stage2Placeholder.jsx
git commit -m "refactor(stage2): wire BGM volume to useAudioStore via useAudioVolume"
```

---

## Task 2: fake SFX를 playSfx로 교체

**Files:**
- Modify: `src/stages/stage2/Stage2Placeholder.jsx` (fake SFX 호출 1곳, ref 생성/정리)

- [ ] **Step 1: fake 호출부 교체**

현재 (L237 부근):

```jsx
playSound('fake', 0.8, 400);
```

다음으로 교체한다.

```jsx
playSfx(SOUNDS.FAKE, { scale: 0.8, durationMs: 400 });
```

`durationMs: 400`은 기존 동작(페이크 글리치 400ms 트림)을 보존하기 위해 반드시 유지한다.

- [ ] **Step 2: fake ref 생성 코드 제거**

현재 (L62):

```jsx
audioRefs.current.fake = new Audio(SOUNDS.FAKE);
```

이 한 줄을 삭제한다. (cleanup은 `Object.values(audioRefs.current).forEach` 패턴이라 자동 처리됨 — 코드 수정 불필요.)

- [ ] **Step 3: 빌드 / lint 확인**

```bash
npm run lint
```

기대: `no-unused-vars` 등 신규 경고 0개. (fake 참조가 다른 곳에 더 있으면 이 단계에서 드러난다.)

- [ ] **Step 4: 수동 청각 검증**

```bash
npm run dev
```

1. /stage/2 진입 → 게임 시작 → 페이크 글리치 효과음이 평소처럼 짧게 들리는지 확인.
2. hub에서 SFX 슬라이더 20%로 → /stage/2 → 페이크 글리치가 작게 들리는지 확인.
3. hub에서 마스터 음소거 ON → /stage/2 → 페이크 글리치 무음 확인.

- [ ] **Step 5: Commit**

```bash
git add src/stages/stage2/Stage2Placeholder.jsx
git commit -m "refactor(stage2): replace fake SFX with playSfx (store-aware)"
```

---

## Task 3: shutter SFX를 playSfx로 교체

**Files:**
- Modify: `src/stages/stage2/Stage2Placeholder.jsx` (shutter 호출 1곳, ref 생성)

- [ ] **Step 1: shutter 호출부 교체**

현재 (L179 부근):

```jsx
playSound('shutter', 1.0, 500);
```

다음으로 교체한다.

```jsx
playSfx(SOUNDS.SHUTTER, { scale: 1.0, durationMs: 500 });
```

- [ ] **Step 2: shutter ref 생성 코드 제거**

현재 (L65):

```jsx
audioRefs.current.shutter = new Audio(SOUNDS.SHUTTER);
```

이 한 줄을 삭제한다.

- [ ] **Step 3: 빌드 / lint 확인**

```bash
npm run lint
```

기대: 신규 경고 0개.

- [ ] **Step 4: 수동 청각 검증**

```bash
npm run dev
```

1. /stage/2 진입 → 게임 시작 → 점프스케어가 떴을 때 ↑ 키 → 셔터 소리가 평소처럼 들리는지 확인.
2. hub에서 SFX 슬라이더 30%로 → /stage/2 → ↑ 키 → 셔터 소리가 작게 들리는지 확인.
3. hub에서 마스터 음소거 ON → /stage/2 → ↑ 키 → 셔터 무음 확인.

- [ ] **Step 5: Commit**

```bash
git add src/stages/stage2/Stage2Placeholder.jsx
git commit -m "refactor(stage2): replace shutter SFX with playSfx (store-aware)"
```

---

## Task 4: 점프스케어(real/realClone)를 sfxVolume에 연결

**Files:**
- Modify: `src/stages/stage2/Stage2Placeholder.jsx` (점프스케어 재생부의 볼륨 대입 2곳)

- [ ] **Step 1: real 볼륨 교체**

현재 (L260-265 부근):

```jsx
const realAudio = audioRefs.current.real;
const realClone = audioRefs.current.realClone;
if (realAudio) {
  realAudio.currentTime = 0.5; 
  realAudio.volume = 1.0;
  realAudio.play().catch(() => {});
}
```

다음으로 교체한다 (`realAudio.volume = 1.0` → `sfxVolume * 1.0`).

```jsx
const realAudio = audioRefs.current.real;
const realClone = audioRefs.current.realClone;
if (realAudio) {
  realAudio.currentTime = 0.5;
  realAudio.volume = sfxVolume * 1.0;
  realAudio.play().catch(() => {});
}
```

- [ ] **Step 2: realClone 볼륨 교체**

현재 (이어지는 L266-270 부근):

```jsx
if (realClone) {
  realClone.currentTime = 0.5;
  realClone.volume = 1.0;
  realClone.play().catch(() => {});
}
```

다음으로 교체한다.

```jsx
if (realClone) {
  realClone.currentTime = 0.5;
  realClone.volume = sfxVolume * 1.0;
  realClone.play().catch(() => {});
}
```

- [ ] **Step 3: deps 배열 갱신**

이 useEffect(현재 `[phase, handleFinish, playSound]`)의 deps 배열에서 의존성을 정리한다. Task 5에서 `playSound`가 사라질 예정이므로 Task 5 이후에 deps 배열은 최종적으로 `[phase, handleFinish, sfxVolume]`이 된다. 본 태스크에서는 우선 `sfxVolume`을 추가만 한다.

현재:

```jsx
}, [phase, handleFinish, playSound]);
```

본 태스크 후:

```jsx
}, [phase, handleFinish, playSound, sfxVolume]);
```

(playSound 제거는 Task 5에서.)

- [ ] **Step 4: 수동 청각 검증**

```bash
npm run dev
```

1. /stage/2 진입 → 게임 시작 → 점프스케어 출현 → 평소처럼 큰 소리(2-인스턴스 동시) 확인.
2. hub에서 SFX 슬라이더 30%로 → /stage/2 → 점프스케어 소리가 작은 강도로 들리는지 확인.
3. hub에서 마스터 음소거 ON → /stage/2 → 점프스케어 무음 확인.

- [ ] **Step 5: Commit**

```bash
git add src/stages/stage2/Stage2Placeholder.jsx
git commit -m "refactor(stage2): wire jumpscare volume to sfxVolume from store"
```

---

## Task 5: 사용 종료된 playSound 콜백 / deps 정리

**Files:**
- Modify: `src/stages/stage2/Stage2Placeholder.jsx` (playSound 정의 + deps 2곳)

- [ ] **Step 1: playSound 콜백 정의 제거**

현재 (L77-93):

```jsx
const playSound = useCallback((type, volume = 1.0, durationMs = null) => {
  const audio = audioRefs.current[type];
  if (audio) {
    audio.currentTime = 0; 
    audio.volume = volume;
    audio.play().catch(() => {}); 

    if (durationMs) {
      setTimeout(() => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      }, durationMs);
    }
  }
}, []);
```

이 블록 전체를 삭제한다 (Task 2, 3에서 모든 호출부가 `playSfx`로 이전됨).

- [ ] **Step 2: handleShutter deps 정리**

현재 (L210 부근):

```jsx
}, [handleFinish, playSound]);
```

다음으로 교체한다.

```jsx
}, [handleFinish]);
```

- [ ] **Step 3: 게임 진행 useEffect deps 정리**

현재 (L291 부근, Task 4 적용 후):

```jsx
}, [phase, handleFinish, playSound, sfxVolume]);
```

다음으로 교체한다.

```jsx
}, [phase, handleFinish, sfxVolume]);
```

- [ ] **Step 4: lint 확인**

```bash
npm run lint
```

기대: `no-unused-vars` 등 신규 경고 0개, react-hooks/exhaustive-deps 경고 0개.

- [ ] **Step 5: 풀 회귀 청각 검증**

```bash
npm run dev
```

전체 시나리오를 한 번에 흐름으로 확인:
1. title → hub (BGM 들림) → SFX 슬라이더 70%, BGM 슬라이더 50% 설정.
2. /stage/2 진입 → 게임 시작 → BGM 작게 들림 → 페이크 글리치 짧고 적당히 들림 → 점프스케어 적당한 강도 → ↑ 키로 셔터 적당히 들림 → 결과 모달.
3. hub로 복귀 → 마스터 음소거 ON → /stage/2 → BGM/페이크/점프스케어/셔터 모두 무음.
4. 마스터 음소거 OFF → /stage/2 진행 중간에 라우트 이탈 (예: 브라우저 뒤로) → 다음 라우트로 가서 Stage 2 BGM/점프스케어가 끊겼는지 확인 (cleanup 회귀).
5. Stage 1, 3, 4 회귀 청각 점검 (변경 없음 — 안전 차원).

- [ ] **Step 6: Commit**

```bash
git add src/stages/stage2/Stage2Placeholder.jsx
git commit -m "refactor(stage2): remove obsolete playSound callback and tidy deps"
```

---

## Task 6: 회귀 가드 grep 점검

**Files:**
- Read-only: `src/stages/stage2/Stage2Placeholder.jsx`

- [ ] **Step 1: new Audio 호출 카운트 점검**

```bash
grep -n "new Audio(" src/stages/stage2/Stage2Placeholder.jsx
```

기대 출력: 정확히 3줄 (bgm, real, realClone). fake와 shutter는 없어야 한다.

```
60:    audioRefs.current.bgm = new Audio(SOUNDS.BGM);
62:    audioRefs.current.real = new Audio(SOUNDS.REAL);
63:    audioRefs.current.realClone = new Audio(SOUNDS.REAL);
```

(줄 번호는 위의 삭제 작업으로 인해 위로 당겨졌으므로 실제와 다를 수 있음 — 중요한 것은 3줄 카운트와 키 이름.)

- [ ] **Step 2: 하드코딩 볼륨 부재 점검**

```bash
grep -nE "\.volume = (0\.|1\.0|1$)" src/stages/stage2/Stage2Placeholder.jsx
```

기대 출력: 0줄. 모든 `*.volume =` 대입은 `bgmVolume` 또는 `sfxVolume` 변수를 포함해야 한다.

확인용 보조 grep:

```bash
grep -nE "\.volume = " src/stages/stage2/Stage2Placeholder.jsx
```

기대 출력: 모두 `bgmVolume * ...` 또는 `sfxVolume * ...` 형태.

- [ ] **Step 3: playSound 참조 부재 점검**

```bash
grep -n "playSound" src/stages/stage2/Stage2Placeholder.jsx
```

기대 출력: 0줄.

- [ ] **Step 4: 기존 단위 테스트 통과 확인**

```bash
npm test -- --run
```

기대: 모든 테스트 통과 (`useAudioStore`, `useAudioVolume`, `playSfx`, 스코어링 등 — 본 변경에 영향받지 않음).

- [ ] **Step 5: 빌드 검증**

```bash
npm run build
```

기대: 빌드 성공, 신규 경고 0개.

- [ ] **Step 6: Commit (필요 시)**

본 태스크는 read-only이므로 변경 사항 없으면 커밋 불필요. grep 결과가 기대와 어긋나면 Task 1-5로 되돌아가 수정 후 다시 검증.
