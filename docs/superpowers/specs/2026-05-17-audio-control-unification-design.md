# Audio Control Unification — Design Spec

- 작성일: 2026-05-17
- 대상 영역: `src/audio/`, `src/stages/stage2/Stage2Placeholder.jsx`, `src/components/AudioControls/`
- 관련 이슈: 게임 전체 사운드 조작 (Stage 2 사운드가 마스터 컨트롤과 독립적으로 재생되는 문제)

---

## 1. 배경 / 문제

게임은 `useAudioStore` (zustand persist) 를 단일 진실 공급원으로 하여 BGM/SFX 볼륨과 마스터 음소거를 관리한다. 대부분의 사운드 호출부는 `useAudioVolume(category)` 훅 또는 `playSfx(src, options)` 유틸을 통해 이 스토어를 구독한다.

그러나 `src/stages/stage2/Stage2Placeholder.jsx` 는 이 스토어를 우회한다:

- 컴포넌트가 `new Audio(src)` 인스턴스를 직접 5개 생성 (BGM, fake, real, realClone, shutter)
- 모든 호출부에서 `audio.volume = 0.5 / 0.8 / 1.0` 와 같이 값이 하드코딩
- `useAudioStore` 의 `bgmVolume`, `sfxVolume`, `isMuted` 어느 것도 읽지 않음

결과: 사용자가 hub 등에서 마스터 음소거를 켜거나 BGM/SFX 슬라이더를 내려도 Stage 2 의 모든 사운드는 영향을 받지 않는다.

다른 스테이지(1, 3, 4) 와 `DialogueBox` 는 `useAudioVolume` 훅을 통해 정상 동기화되고 있다.

## 2. 목표 / 비목표

### 목표

- Stage 2 의 모든 사운드(BGM, fake SFX, real/realClone 점프스케어, shutter SFX) 가 `useAudioStore` 의 현재 값을 따른다.
- 마스터 음소거가 Stage 2 에서도 즉시 적용된다.
- 볼륨 슬라이더 변경이 Stage 2 재생 중인 BGM 에도 실시간 반영된다 (Stage 1/3/4 와 동일한 패턴).
- 기존 청각적 의도(트랙 간 상대 음량비, 점프스케어 2-인스턴스 동시 재생, shutter 500ms 트림, BGM 86 초 지점 시작) 는 보존한다.

### 비목표

- `useAudioStore` 구조 변경 (이미 BGM/SFX/Mute 가 분리되어 있고 persist 됨).
- `BgmController` 또는 `TRACK_TO_FILE` 변경. Stage 2 BGM 은 다른 스테이지와 동일하게 컴포넌트 내부에서 자체 관리한다.
- Stage 1, 3, 4 의 사운드 코드 수정.
- `AudioControls` 의 노출 라우트 변경. 현재 `/stage/*` 가드는 의도된 동작으로 유지한다 (스테이지 진입 전/후에 hub/title/ranking/ending 에서 조절하면 충분).
- 새로운 통합 오디오 매니저 모듈 도입.

## 3. 의도 충족 논리

사용자 요구는 "게임 전체 사운드 조작 가능". `AudioControls` 가 스테이지에서 보이지 않더라도, 다음 조건이 충족되면 사용자 의도는 만족된다:

1. 스토어의 볼륨·음소거 값이 persist 로 라우트 이동 후에도 살아남는다 (현재 충족).
2. 모든 사운드 재생 코드가 호출 시점에 스토어 값을 읽는다 (Stage 2 만 미충족 → 본 변경의 대상).

따라서 본 변경은 (2) 만 교정한다.

## 4. 변경 사항

### 4.1 `Stage2Placeholder.jsx` 리팩터

`audioRefs.current` 와 `playSound` 콜백을 다음 정책으로 재구성한다.

#### BGM (영구 재생, 일시정지 필요)

- `audioRefs.current.bgm = new Audio(SOUNDS.BGM)` 는 유지. BGM 은 `pause()` / `currentTime` 조작 / loop 가 필요하므로 인스턴스 보관이 필요하다.
- 컴포넌트에서 `const bgmVolume = useAudioVolume('bgm')` 훅을 구독한다.
- BGM 재생 시점에서 `bgm.volume = bgmVolume * 0.5` 로 적용. 현재 하드코딩된 `0.5` 는 트랙 미세조정 scale 로 의미를 보존한다 (Stage 1 의 BGM 처리와 동일한 패턴).
- 별도의 `useEffect` 로 `bgmVolume` 변경 시 재생 중인 BGM 의 `volume` 을 실시간 갱신한다 (Stage 1/3/4 의 BgmController 동기화 패턴과 동형).

#### Fake SFX (fire-and-forget, 짧음)

- `audioRefs.current.fake` 인스턴스 보관을 제거하고 `playSfx(SOUNDS.FAKE, { scale: 0.8, durationMs: 400 })` 로 전환한다.
- 기존 `playSound('fake', 0.8, 400)` 의 400ms 트림은 보존한다 (페이크 글리치 짧게 끊는 의도).
- fire-and-forget 이므로 인스턴스를 보관할 이유가 없다.

#### Shutter SFX (fire-and-forget, 500ms 트림)

- `audioRefs.current.shutter` 인스턴스 보관을 제거하고 `playSfx(SOUNDS.SHUTTER, { scale: 1.0, durationMs: 500 })` 로 전환한다.

#### Real / RealClone 점프스케어 (시작 시점 트림 + 외부에서 중단 필요)

- 점프스케어는 `currentTime = 0.5` 로 트림 시작하고, 셔터 입력/실패 처리 시점에 외부에서 `pause()` + `currentTime = 0` 으로 강제 종료해야 한다 (현재 `handleFinish`, `handleShutter` 에서 수행).
- 따라서 `playSfx` 의 fire-and-forget 모델로는 부족. `audioRefs.current.real`, `realClone` 인스턴스 보관은 유지.
- 컴포넌트에서 `const sfxVolume = useAudioVolume('sfx')` 훅을 구독한다.
- 재생 시점에서 `realAudio.volume = sfxVolume * 1.0`, `realClone.volume = sfxVolume * 1.0` 로 적용. 2-인스턴스 동시 재생으로 임팩트를 키우는 기존 동작은 그대로 둔다.

#### 정리 / cleanup

- 언마운트 시 BGM, real, realClone 의 `pause()` + `src = ''` 정리는 유지한다.
- `jumpscareAudioTimeoutRef` 처리는 변경 없음.

### 4.2 그 외 모듈

- `useAudioStore`, `useAudioVolume`, `playSfx`, `BgmController`, `trackRegistry`, `AudioControls` — **변경 없음**.
- Stage 1, 3, 4, `DialogueBox`, `HubPage`, `EndingCutscene` — **변경 없음**.

## 5. 청각적 결과 (수치 예시)

사용자가 hub 에서 BGM 50%, SFX 80%, 마스터 음소거 해제 상태로 설정 후 Stage 2 진입 시:

| 트랙 | 산출식 | 결과 |
| --- | --- | --- |
| BGM | `0.5 (bgmVolume) × 0.5 (scale)` | `0.25` |
| Fake SFX | `0.8 (sfxVolume) × 0.8 (scale)` | `0.64` |
| Shutter SFX | `0.8 × 1.0` | `0.80` |
| Real / RealClone | `0.8 × 1.0` 각각 | `0.80` × 2 동시 |

마스터 음소거 ON 시: 모든 트랙 0 (훅이 `isMuted ? 0` 을 반환).

## 6. 회귀 가드

### 코드 레벨 (PR 셀프 체크)

- `Stage2Placeholder.jsx` 안에서 `new Audio(` 사용은 BGM, real, realClone 세 곳만 남는다 (fake, shutter 는 `playSfx` 로 대체됨).
- `Stage2Placeholder.jsx` 안에서 하드코딩된 숫자 리터럴 `audio.volume = 0.5 / 0.8 / 1.0` 패턴이 없어야 한다. 모든 `*.volume` 대입은 `bgmVolume` 또는 `sfxVolume` 을 곱한 형태여야 한다.

### 수동 QA (브라우저)

1. hub 에서 마스터 음소거 ON → /stage/2 진입 → 시작 → BGM/fake/real/realClone/shutter 가 모두 무음인지 확인.
2. hub 에서 BGM 50%, SFX 80% → /stage/2 진입 → 플레이 → 위 표의 수치에 부합하는 청각 확인.
3. /stage/2 플레이 중 라우트 이탈 (예: 뒤로가기) → 다음 라우트에서 Stage 2 의 BGM/점프스케어가 끊겼는지 (cleanup 확인).
4. Stage 1, 3, 4 회귀 청각 점검 (변경 없으나 안전 차원).

### 자동 테스트

- 기존 `useAudioStore.test.js`, `useAudioVolume.test.jsx`, `playSfx.test.js` 는 변경하지 않는다.
- Stage 2 전용 단위 테스트는 추가하지 않는다 — `new Audio` + `setTimeout` + 키 입력 + DOM 효과의 결합으로 jsdom 환경에서 비용 대비 효용이 낮다. 위의 코드 레벨 가드와 수동 QA 로 대체한다.

## 7. 리스크

- **점프스케어 임팩트 약화 가능성**: SFX 슬라이더가 낮은 값으로 설정되어 있으면 점프스케어 음량이 약해질 수 있다. 이것은 사용자 의도(전체 사운드 조작) 와 부합하므로 의도된 결과로 본다.
- **BGM 86 초 지점 시작**: 이 동작은 기존과 동일하게 유지된다. 본 변경의 영향을 받지 않는다.
- **AudioControls 미노출 라우트**: 사용자가 hub 를 거치지 않고 게임을 시작하는 동선은 현재 없다 (title → hub → stage 라우팅). 향후 동선이 바뀌면 노출 정책 재검토가 필요할 수 있다.

## 8. 비범위 (Out of scope)

- 모든 `new Audio` 호출을 통합 매니저로 묶는 리팩터.
- 스테이지 라우트에서 `AudioControls` 노출.
- 사운드 단축키 (예: M = 음소거).
- 크로스페이드 BGM 전환 (`BgmController` 의 기존 TODO).
- BGM 의 라우트 기반 자동 관리로 Stage 1/2/3/4 BGM 을 흡수.
