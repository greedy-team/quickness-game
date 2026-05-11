# 사운드 컨트롤 UI 디자인

- **작성일:** 2026-05-11
- **관련 이슈:** `.issues/20260511_기능추가_점수_사운드_컨트롤_UI.md` 중 사운드 컨트롤 부분
- **범위:** 본 스펙은 사운드 컨트롤 UI 및 분산된 오디오 코드의 중앙화만 다룬다. 점수 UI는 별도 스펙(`2026-05-11-score-display-design.md`)에서 완료.
- **브랜치 전략:** 현재 브랜치(`20260511_#36_점수_표기_및_사운드_컨트롤_UI_추가`)에서 작업, 단일 PR로 머지.

## 1. 배경

현재 오디오 재생 코드가 여러 컴포넌트에 흩어져 있고 볼륨이 각 사이트에서 하드코딩된다.

| 사이트 | 종류 | 현재 볼륨 | 메모 |
| --- | --- | --- | --- |
| `BgmController` (/hub) | BGM | 0.7 (`BGM_DEFAULTS.volume`) | 라우트 기반 글로벌 BGM |
| `Stage1Placeholder` | BGM (heartbeat) | 0.7 | `new Audio(BGM_PATH)` |
| `Stage2Placeholder` | BGM | 0.5 | 의도된 낮은 볼륨 |
| `Stage2Placeholder` | SFX (fake/real/shutter) | 1.0 / 0.5 / 1.0 | one-shot |
| `Stage3Game` | BGM | 0.7 | `<audio>` JSX |
| `Stage4Host` | BGM | 0.7 | `<audio>` JSX |
| `Stage4Host` | SFX (jumpscare) | `SFX_VOLUME` 상수 | one-shot |
| `HubPage` | SFX (open door) | 1.0 | one-shot |
| `EndingCutscene` | SFX | `VOLUME` 상수 | one-shot |
| `DialogueBox` | SFX (typing tick) | 1.0 | 매 글자마다 재생 |

플레이어가 볼륨을 조절하거나 음소거할 UI가 없다. `BgmController.jsx`에는 이미 `TODO: 음량/음소거 UI` 코멘트가 있다.

## 2. 목표

- 플레이어가 한 곳에서 BGM·SFX 볼륨과 마스터 뮤트를 제어할 수 있다.
- 모든 오디오 재생 지점이 단일 상태에서 effective volume을 읽어 즉시 반영된다.
- 설정은 새로고침/탭 재방문 후에도 유지된다 (localStorage).
- 신규 사운드 추가 시 표준 패턴(`useAudioVolume` hook 또는 `playSfx` helper)만 따르면 자동으로 컨트롤 대상에 편입된다.

## 3. 사운드 카테고리

두 그룹만 둔다.

- **BGM** — 배경 음악 (루프, 트랙별 다른 길이의 분위기 음원).
- **SFX** — 효과음 일체 (one-shot 이벤트 사운드, 다이얼로그 타이핑 틱 포함).

Voice/Dialogue 별도 카테고리는 만들지 않는다. 음원이 typing tick 하나뿐이라 YAGNI.

## 4. 상태 저장소

신규 모듈 `src/audio/useAudioStore.js` — zustand 슬라이스, `persist` 미들웨어 사용.

```js
{
  bgmVolume: 0.7,    // 0.0 ~ 1.0
  sfxVolume: 0.7,
  isMuted: false,
  setBgmVolume(v),   // v 는 [0,1] clamp
  setSfxVolume(v),
  toggleMute(),
}
```

- localStorage 키: `qg-audio`.
- 초기 디폴트: `{ bgmVolume: 0.7, sfxVolume: 0.7, isMuted: false }`.
- `useGameStore`와 분리. 게임 진행 상태(`stageResults`, `hasUserStarted`)와 오디오 설정은 라이프사이클이 다르고 서로 reset 의미가 다르다 (`resetGame`이 오디오 설정을 건드리지 않아야 한다).

## 5. Effective Volume Hook

`src/audio/useAudioVolume.js`:

```js
useAudioVolume(category, options = { scale: 1 })
// category: 'bgm' | 'sfx'
// 반환: isMuted ? 0 : storeVolume(category) * options.scale
// scale 은 트랙별 미세 조정 (예: Stage2 BGM 의 0.5 톤 유지)
```

각 재생 사이트가 이 훅을 구독해 Audio 인스턴스의 `volume`을 동기화한다.

```jsx
const volume = useAudioVolume('bgm', { scale: 0.5 });  // Stage2 BGM
useEffect(() => {
  if (audioRef.current) audioRef.current.volume = volume;
}, [volume]);
```

## 6. One-shot SFX Helper

`src/audio/playSfx.js` — declarative 훅이 부적절한 발사-망각 케이스(`HubPage` 문 소리, `Stage4` jumpscare, `EndingCutscene`, `Stage2` fake/real/shutter)에서 사용.

```js
import { playSfx } from './audio/playSfx.js';
playSfx(ASSETS.sounds.openDoor, { scale: 1 });
```

내부 동작:
1. `useAudioStore.getState()`로 현재 `sfxVolume`/`isMuted` 읽음.
2. `new Audio(src)` 생성, `volume = isMuted ? 0 : sfxVolume * scale`.
3. `audio.play().catch(() => {})` (자동재생 정책 실패 시 silent).
4. `audio.addEventListener('ended', () => { audio.src = ''; })`로 GC 도움.

BGM은 loop·전환·중단 제어가 필요해서 imperative helper로 만들지 않는다. hook 패턴만 사용.

## 7. 패널 UI

`src/components/AudioControls/AudioControls.jsx`:

### 7.1 아이콘 버튼

- 우측 상단 고정 (`position: fixed; top: 28px; right: 28px;`).
- 스피커 SVG 아이콘. `isMuted = true`이면 X 표시가 겹친 음소거 아이콘으로 토글.
- `aria-label="사운드 설정"` + `aria-expanded={popoverOpen}`.
- 항상 노출. 가시성 규칙 없음 (타이틀에서도 노출).

### 7.2 Popover 패널

- 아이콘 클릭 → 아이콘 바로 아래로 펼쳐짐 (`position: absolute; top: 100%; right: 0;`).
- 외부 클릭(`document` pointerdown), Escape 키 → 닫힘.
- 패널 너비 약 240px, 다크 톤 배경(`#0e0e10` 계열) + 노란 액센트.
- 구성:
  - 행 1: `BGM` 라벨 + 슬라이더 `<input type="range" min="0" max="100">` + 현재값 % 텍스트.
  - 행 2: `효과음` 라벨 + 슬라이더 + % 텍스트.
  - 구분선.
  - 행 3: `마스터 음소거` 토글 버튼. 활성화 시 액센트 색.

### 7.3 슬라이더 ↔ store 매핑

- 슬라이더 표시값: 0~100 (정수).
- 저장값: 0~1 (소수).
- 변환: `displayed = round(stored * 100)`, `stored = displayed / 100`.
- `onChange` 시 즉시 store 업데이트 → 모든 구독 컴포넌트가 reactive 적용.

### 7.4 접근성

- 슬라이더는 표준 `<input type="range">` (키보드 방향키, 스크린리더 자동 지원).
- 아이콘 버튼은 `aria-pressed={isMuted}` 추가.
- 패널 열림 시 첫 슬라이더에 자동 포커스 없음 (예기치 않은 포커스 점프 회피). Tab으로 진입.

## 8. 기존 사이트 마이그레이션 매핑

| 사이트 | 적용 방식 | 카테고리 | scale |
| --- | --- | --- | --- |
| `BgmController.jsx` | hook (audio ref) | bgm | 1 |
| `Stage1Placeholder.jsx` (heartbeat) | hook | bgm | 1 |
| `Stage2Placeholder.jsx` (BGM) | hook | bgm | 0.5 (기존 톤 유지) |
| `Stage2Placeholder.jsx` (real/fake/shutter) | `playSfx` | sfx | real 1.0, shutter 1.0, fake 0.5 (기존 톤 유지) |
| `Stage3Game.jsx` (`<audio>` JSX) | hook | bgm | 1 |
| `Stage4Host.jsx` (BGM `<audio>` JSX) | hook | bgm | 1 |
| `Stage4Host.jsx` (jumpscare) | `playSfx` | sfx | `SFX_VOLUME` 값 보존 |
| `HubPage.jsx` (open door) | `playSfx` | sfx | 1 |
| `EndingCutscene.jsx` | `playSfx` | sfx | `VOLUME` 값 보존 |
| `DialogueBox.jsx` (typing tick) | hook (audio ref) | sfx | 1 |

`BGM_DEFAULTS.volume = 0.7` 상수는 제거하고 `useAudioStore` 디폴트로 흡수.

## 9. 라우팅과 가시성

- `HudOverlay`는 기존대로 `/`, `/ranking`에서 숨김.
- `AudioControls`는 **모든 라우트에서 노출**. 타이틀 화면에서도 사운드 컨트롤 가능해야 한다 (호러 경고 모달이 "이어폰 사용 시 볼륨" 항목을 안내하므로 일관성).

## 10. 명시적 비범위

- 페이드인/아웃 (현재도 hard cut, 후속 이슈).
- 트랙별 개별 슬라이더 (사용자가 BGM/SFX 2 그룹 선택, YAGNI).
- 키보드 단축키 (M 으로 mute 등, 별도 이슈).
- 오디오 컨텍스트 자동 unlock 정책 변경. `BgmController`의 기존 pointerdown/keydown unlock 로직 그대로 유지.
- 카테고리·트랙 enum 강제 검증 (런타임 타입 가드는 본 범위 외).

## 11. 테스트

### 11.1 `src/audio/useAudioStore.test.js`

- 초기값 `{ bgmVolume: 0.7, sfxVolume: 0.7, isMuted: false }`.
- `setBgmVolume(0.4)` 후 store 값 0.4.
- `setBgmVolume(-0.1)`/`setBgmVolume(1.5)` clamp 검증.
- `toggleMute()` 호출 시 `isMuted` 반전.
- persist 키 `qg-audio` 형식 (직접 localStorage 모킹).

### 11.2 `src/audio/useAudioVolume.test.jsx`

- `category='bgm'` 반환 = `bgmVolume`.
- `category='sfx'` 반환 = `sfxVolume`.
- `isMuted = true` 시 반환 0.
- `options.scale = 0.5` 적용 시 절반.

### 11.3 `src/components/AudioControls/__tests__/AudioControls.test.jsx`

- 마운트 시 popover 닫혀있음.
- 아이콘 클릭 → popover 열림 (DOM 존재).
- BGM 슬라이더 change → `useAudioStore.bgmVolume` 갱신.
- SFX 슬라이더 change → `useAudioStore.sfxVolume` 갱신.
- 마스터 음소거 토글 클릭 → `isMuted` 반전, 아이콘에 mute SVG 적용.
- popover 외부 클릭 → 닫힘.
- Escape 키 → 닫힘.

### 11.4 `src/audio/playSfx.test.js`

- `useAudioStore.setState({ sfxVolume: 0.3, isMuted: false })` 후 `playSfx(src)` 호출 시 생성된 Audio의 `volume === 0.3`.
- `isMuted: true` 시 `volume === 0`.
- `scale: 0.5` 옵션 적용 시 `volume === sfxVolume * 0.5`.
- 모킹: `globalThis.Audio` 스텁으로 인스턴스 캡쳐.

### 11.5 기존 회귀

- Stage2 BGM 은 카테고리 `bgm` + scale `0.5` 로 마이그레이션되었으므로, store `bgmVolume = 1.0, isMuted = false` 일 때 `useAudioVolume('bgm', { scale: 0.5 })` 반환값이 `0.5` 인지 검증.
- Stage2 fake SFX 는 카테고리 `sfx` + scale `0.5` 로 마이그레이션되었으므로 `playSfx(src, { scale: 0.5 })` 호출 시 생성된 Audio 의 `volume` 이 `sfxVolume * 0.5` 인지 검증.

## 12. 마이그레이션 및 리스크

- 기존 `BgmController`는 자체 unlock 로직이 있어 store 도입 후에도 첫 사용자 gesture 처리에 영향 없도록 한다. 볼륨 적용은 unlock 이후에도 가능 (HTMLMediaElement는 `volume` 속성 변경에 gesture 요구하지 않음).
- localStorage 미지원 환경(SSR, 비밀 모드 제한)에서는 zustand `persist`가 자동으로 in-memory fallback 동작.
- Stage2의 `playSound` 헬퍼는 내부 함수라 fake/real/shutter 호출부만 `playSfx`로 치환하면 됨. 헬퍼 자체 제거.
- DialogueBox의 typing tick은 매 글자마다 재생되므로 hook 패턴이 적합 (Audio 인스턴스 재사용).
