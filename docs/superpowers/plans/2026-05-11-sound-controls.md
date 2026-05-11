# 사운드 컨트롤 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 우상단 사운드 컨트롤 패널(BGM/SFX 슬라이더 + 마스터 뮤트, localStorage 영속)을 도입하고, 분산된 Audio 재생 지점들을 중앙 store 기반 패턴(`useAudioVolume` hook / `playSfx` helper)으로 마이그레이션한다.

**Architecture:**
- 신규 zustand 슬라이스 `src/audio/useAudioStore.js`가 `bgmVolume`, `sfxVolume`, `isMuted`를 `persist` 미들웨어로 localStorage(`qg-audio`)에 보존.
- 모든 Audio 재생 지점은 declarative 사이트(`useAudioVolume('bgm'|'sfx', { scale })`)와 imperative one-shot(`playSfx(src, { scale })`) 중 하나를 사용해 실효 볼륨을 store에서 읽어옴.
- `AudioControls` 컴포넌트가 우상단 고정 아이콘 + popover로 노출되어 모든 라우트에서 사용 가능.

**Tech Stack:** React 19, zustand 5 + `zustand/middleware` `persist`, Vitest + @testing-library/react + userEvent.

**Spec:** `docs/superpowers/specs/2026-05-11-sound-controls-design.md`

---

## File Structure

**Create:**
- `src/audio/useAudioStore.js` — zustand store with persist
- `src/audio/useAudioVolume.js` — selector hook
- `src/audio/playSfx.js` — imperative one-shot helper
- `src/audio/__tests__/useAudioStore.test.js`
- `src/audio/__tests__/useAudioVolume.test.jsx`
- `src/audio/__tests__/playSfx.test.js`
- `src/components/AudioControls/AudioControls.jsx`
- `src/components/AudioControls/AudioControls.css`
- `src/components/AudioControls/__tests__/AudioControls.test.jsx`

**Modify:**
- `src/App.jsx` — mount `<AudioControls />` above `<HudOverlay />`
- `src/audio/BgmController.jsx` — apply `useAudioVolume('bgm')`, remove `BGM_DEFAULTS.volume` reference (keep `BGM_DEFAULTS.loop`)
- `src/stages/stage1/Stage1Placeholder.jsx` — `useAudioVolume('bgm')` for heartbeat
- `src/stages/stage2/Stage2Placeholder.jsx` — `useAudioVolume('bgm', { scale: 0.5 })`, replace `playSound` helper with `playSfx`
- `src/stages/stage3/Stage3Game.jsx` — `useAudioVolume('bgm')` applied to `<audio>` ref
- `src/stages/stage4/Stage4Host.jsx` — `useAudioVolume('bgm')` for BGM, `playSfx` for jumpscare
- `src/routes/HubPage/HubPage.jsx` — `playSfx` for openDoor
- `src/routes/EndingPage/EndingCutscene.jsx` — `playSfx` for ending SFX
- `src/components/DialogueBox/DialogueBox.jsx` — `useAudioVolume('sfx')`

---

## Task 1: `useAudioStore` zustand 슬라이스 (TDD)

**Files:**
- Create: `src/audio/useAudioStore.js`
- Create: `src/audio/__tests__/useAudioStore.test.js`

- [ ] **Step 1.1: Write the failing tests**

Create `src/audio/__tests__/useAudioStore.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { useAudioStore } from '../useAudioStore.js';

describe('useAudioStore', () => {
  beforeEach(() => {
    // Reset to initial values + clear persisted state
    localStorage.removeItem('qg-audio');
    useAudioStore.setState({ bgmVolume: 0.7, sfxVolume: 0.7, isMuted: false });
  });

  it('초기 디폴트: bgmVolume 0.7, sfxVolume 0.7, isMuted false', () => {
    const s = useAudioStore.getState();
    expect(s.bgmVolume).toBe(0.7);
    expect(s.sfxVolume).toBe(0.7);
    expect(s.isMuted).toBe(false);
  });

  it('setBgmVolume(0.4) 호출 시 bgmVolume = 0.4', () => {
    useAudioStore.getState().setBgmVolume(0.4);
    expect(useAudioStore.getState().bgmVolume).toBe(0.4);
  });

  it('setBgmVolume(-0.1) → 0 으로 clamp', () => {
    useAudioStore.getState().setBgmVolume(-0.1);
    expect(useAudioStore.getState().bgmVolume).toBe(0);
  });

  it('setBgmVolume(1.5) → 1 로 clamp', () => {
    useAudioStore.getState().setBgmVolume(1.5);
    expect(useAudioStore.getState().bgmVolume).toBe(1);
  });

  it('setSfxVolume(0.3) 호출 시 sfxVolume = 0.3', () => {
    useAudioStore.getState().setSfxVolume(0.3);
    expect(useAudioStore.getState().sfxVolume).toBe(0.3);
  });

  it('toggleMute() 호출 시 isMuted 반전', () => {
    expect(useAudioStore.getState().isMuted).toBe(false);
    useAudioStore.getState().toggleMute();
    expect(useAudioStore.getState().isMuted).toBe(true);
    useAudioStore.getState().toggleMute();
    expect(useAudioStore.getState().isMuted).toBe(false);
  });

  it('localStorage 키 qg-audio 에 직렬화된다', () => {
    useAudioStore.getState().setBgmVolume(0.42);
    const raw = localStorage.getItem('qg-audio');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed.state.bgmVolume).toBe(0.42);
  });
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

Run: `npm run test:run -- src/audio/__tests__/useAudioStore.test.js`
Expected: FAIL — `useAudioStore` 모듈이 존재하지 않음.

- [ ] **Step 1.3: Implement the store**

Create `src/audio/useAudioStore.js`:

```js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const clamp01 = (v) => {
  if (typeof v !== 'number' || Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
};

export const useAudioStore = create(
  persist(
    (set) => ({
      bgmVolume: 0.7,
      sfxVolume: 0.7,
      isMuted: false,
      setBgmVolume: (v) => set({ bgmVolume: clamp01(v) }),
      setSfxVolume: (v) => set({ sfxVolume: clamp01(v) }),
      toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
    }),
    { name: 'qg-audio' },
  ),
);
```

- [ ] **Step 1.4: Run tests to verify they pass**

Run: `npm run test:run -- src/audio/__tests__/useAudioStore.test.js`
Expected: PASS (7 tests).

- [ ] **Step 1.5: Commit**

```bash
git add src/audio/useAudioStore.js src/audio/__tests__/useAudioStore.test.js
git commit -m "feat(audio): useAudioStore (zustand + localStorage persist) 도입 #36

BGM/SFX 볼륨 + 마스터 뮤트 상태를 보관하는 신규 슬라이스.
clamp 로 [0,1] 안전성 보장, 키 qg-audio 로 localStorage 직렬화."
```

---

## Task 2: `useAudioVolume` 셀렉터 훅 (TDD)

**Files:**
- Create: `src/audio/useAudioVolume.js`
- Create: `src/audio/__tests__/useAudioVolume.test.jsx`

- [ ] **Step 2.1: Write the failing tests**

Create `src/audio/__tests__/useAudioVolume.test.jsx`:

```jsx
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useAudioVolume } from '../useAudioVolume.js';
import { useAudioStore } from '../useAudioStore.js';

describe('useAudioVolume', () => {
  beforeEach(() => {
    localStorage.removeItem('qg-audio');
    useAudioStore.setState({ bgmVolume: 0.7, sfxVolume: 0.7, isMuted: false });
  });

  afterEach(() => cleanup());

  it("category='bgm' 반환 = bgmVolume", () => {
    useAudioStore.setState({ bgmVolume: 0.42 });
    const { result } = renderHook(() => useAudioVolume('bgm'));
    expect(result.current).toBe(0.42);
  });

  it("category='sfx' 반환 = sfxVolume", () => {
    useAudioStore.setState({ sfxVolume: 0.25 });
    const { result } = renderHook(() => useAudioVolume('sfx'));
    expect(result.current).toBe(0.25);
  });

  it('isMuted = true 시 반환 0', () => {
    useAudioStore.setState({ bgmVolume: 0.9, sfxVolume: 0.9, isMuted: true });
    const { result: r1 } = renderHook(() => useAudioVolume('bgm'));
    const { result: r2 } = renderHook(() => useAudioVolume('sfx'));
    expect(r1.current).toBe(0);
    expect(r2.current).toBe(0);
  });

  it('options.scale = 0.5 → 절반 반환', () => {
    useAudioStore.setState({ bgmVolume: 1, isMuted: false });
    const { result } = renderHook(() => useAudioVolume('bgm', { scale: 0.5 }));
    expect(result.current).toBe(0.5);
  });

  it('options.scale 미지정 시 scale=1 적용', () => {
    useAudioStore.setState({ bgmVolume: 0.6 });
    const { result } = renderHook(() => useAudioVolume('bgm'));
    expect(result.current).toBe(0.6);
  });

  it('store 갱신 시 훅 반환값도 갱신', () => {
    const { result, rerender } = renderHook(() => useAudioVolume('bgm'));
    expect(result.current).toBe(0.7);
    useAudioStore.setState({ bgmVolume: 0.1 });
    rerender();
    expect(result.current).toBe(0.1);
  });
});
```

- [ ] **Step 2.2: Run tests to verify they fail**

Run: `npm run test:run -- src/audio/__tests__/useAudioVolume.test.jsx`
Expected: FAIL — `useAudioVolume` 모듈 없음.

- [ ] **Step 2.3: Implement the hook**

Create `src/audio/useAudioVolume.js`:

```js
import { useAudioStore } from './useAudioStore.js';

/**
 * 카테고리별 실효 볼륨 셀렉터.
 * @param {'bgm' | 'sfx'} category
 * @param {{ scale?: number }} [options] - 트랙별 미세 조정 인수 (기본 1).
 * @returns {number} isMuted 면 0, 아니면 store volume * scale (둘 다 [0,1] clamp 후 곱).
 */
export function useAudioVolume(category, options) {
  const scale = options?.scale ?? 1;
  return useAudioStore((s) => {
    if (s.isMuted) return 0;
    const v = category === 'bgm' ? s.bgmVolume : s.sfxVolume;
    return v * scale;
  });
}
```

- [ ] **Step 2.4: Run tests to verify they pass**

Run: `npm run test:run -- src/audio/__tests__/useAudioVolume.test.jsx`
Expected: PASS (6 tests).

- [ ] **Step 2.5: Commit**

```bash
git add src/audio/useAudioVolume.js src/audio/__tests__/useAudioVolume.test.jsx
git commit -m "feat(audio): useAudioVolume 셀렉터 훅 도입 #36

카테고리(bgm/sfx) + scale 인수로 실효 볼륨을 store 에서 파생.
isMuted 시 0 반환. 모든 declarative 재생 지점이 구독해 audio.volume 동기화."
```

---

## Task 3: `playSfx` 일회성 SFX 헬퍼 (TDD)

**Files:**
- Create: `src/audio/playSfx.js`
- Create: `src/audio/__tests__/playSfx.test.js`

- [ ] **Step 3.1: Write the failing tests**

Create `src/audio/__tests__/playSfx.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { playSfx } from '../playSfx.js';
import { useAudioStore } from '../useAudioStore.js';

describe('playSfx', () => {
  let originalAudio;
  let createdAudios;

  beforeEach(() => {
    localStorage.removeItem('qg-audio');
    useAudioStore.setState({ bgmVolume: 0.7, sfxVolume: 0.7, isMuted: false });
    createdAudios = [];
    originalAudio = globalThis.Audio;
    globalThis.Audio = vi.fn(function MockAudio(src) {
      this.src = src;
      this.volume = 1;
      this.play = vi.fn().mockResolvedValue(undefined);
      this.addEventListener = vi.fn();
      createdAudios.push(this);
    });
  });

  afterEach(() => {
    globalThis.Audio = originalAudio;
  });

  it('current sfxVolume 을 생성된 Audio.volume 에 적용', () => {
    useAudioStore.setState({ sfxVolume: 0.3, isMuted: false });
    playSfx('/foo.mp3');
    expect(createdAudios).toHaveLength(1);
    expect(createdAudios[0].volume).toBe(0.3);
    expect(createdAudios[0].src).toBe('/foo.mp3');
    expect(createdAudios[0].play).toHaveBeenCalledTimes(1);
  });

  it('isMuted = true 시 volume 0', () => {
    useAudioStore.setState({ sfxVolume: 1, isMuted: true });
    playSfx('/foo.mp3');
    expect(createdAudios[0].volume).toBe(0);
  });

  it('scale 0.5 옵션 적용 시 sfxVolume * 0.5', () => {
    useAudioStore.setState({ sfxVolume: 0.8, isMuted: false });
    playSfx('/foo.mp3', { scale: 0.5 });
    expect(createdAudios[0].volume).toBeCloseTo(0.4, 10);
  });

  it('null/undefined src 면 Audio 생성하지 않고 silent return', () => {
    playSfx(null);
    playSfx(undefined);
    expect(createdAudios).toHaveLength(0);
  });

  it('durationMs 옵션 시 해당 시간 후 audio.pause() + currentTime 리셋', () => {
    vi.useFakeTimers();
    useAudioStore.setState({ sfxVolume: 1, isMuted: false });
    playSfx('/foo.mp3', { durationMs: 400 });
    expect(createdAudios).toHaveLength(1);
    const a = createdAudios[0];
    a.pause = vi.fn();
    a.currentTime = 0;
    vi.advanceTimersByTime(400);
    expect(a.pause).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 3.2: Run tests to verify they fail**

Run: `npm run test:run -- src/audio/__tests__/playSfx.test.js`
Expected: FAIL — `playSfx` 모듈 없음.

- [ ] **Step 3.3: Implement playSfx**

Create `src/audio/playSfx.js`:

```js
import { useAudioStore } from './useAudioStore.js';

/**
 * 일회성 효과음 재생. store 의 현재 sfxVolume / isMuted 를 즉시 읽어 적용.
 * 발사 후 잊는 케이스(문 열기, 점프스케어, 엔딩 SFX 등)에 사용.
 * @param {string | null | undefined} src - 음원 경로. falsy 면 무동작.
 * @param {{ scale?: number, durationMs?: number }} [options]
 *   scale: 트랙별 미세 조정 (기본 1).
 *   durationMs: 지정 시 해당 시간 후 자동 정지 (예: shutter 500ms 트림).
 */
export function playSfx(src, options) {
  if (!src) return;
  const scale = options?.scale ?? 1;
  const durationMs = options?.durationMs ?? null;
  const { sfxVolume, isMuted } = useAudioStore.getState();
  const audio = new Audio(src);
  audio.volume = isMuted ? 0 : sfxVolume * scale;
  audio.play().catch(() => {});
  // GC 도움 — 재생 끝나면 src 해제
  audio.addEventListener('ended', () => { audio.src = ''; });
  if (durationMs !== null) {
    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, durationMs);
  }
}
```

- [ ] **Step 3.4: Run tests to verify they pass**

Run: `npm run test:run -- src/audio/__tests__/playSfx.test.js`
Expected: PASS (4 tests).

- [ ] **Step 3.5: Commit**

```bash
git add src/audio/playSfx.js src/audio/__tests__/playSfx.test.js
git commit -m "feat(audio): playSfx 일회성 SFX 헬퍼 도입 #36

발사-망각 SFX 재생 함수. useAudioStore.getState() 로 현재 볼륨/뮤트 즉시 적용.
HubPage 문 소리, Stage4 점프스케어 등에서 사용 예정."
```

---

## Task 4: `AudioControls` 컴포넌트 (TDD)

**Files:**
- Create: `src/components/AudioControls/AudioControls.jsx`
- Create: `src/components/AudioControls/AudioControls.css`
- Create: `src/components/AudioControls/__tests__/AudioControls.test.jsx`

- [ ] **Step 4.1: Write the failing tests**

Create `src/components/AudioControls/__tests__/AudioControls.test.jsx`:

```jsx
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AudioControls from '../AudioControls.jsx';
import { useAudioStore } from '../../../audio/useAudioStore.js';

describe('AudioControls', () => {
  beforeEach(() => {
    localStorage.removeItem('qg-audio');
    useAudioStore.setState({ bgmVolume: 0.7, sfxVolume: 0.7, isMuted: false });
  });

  afterEach(() => cleanup());

  it('마운트 시 popover 닫혀있음 (슬라이더 미노출)', () => {
    render(<AudioControls />);
    expect(screen.queryByLabelText(/BGM 볼륨/)).toBeNull();
  });

  it('아이콘 클릭 시 popover 열림 (BGM/SFX 슬라이더 + 음소거 버튼 노출)', async () => {
    const user = userEvent.setup();
    render(<AudioControls />);
    await user.click(screen.getByRole('button', { name: /사운드 설정/ }));
    expect(screen.getByLabelText(/BGM 볼륨/)).toBeInTheDocument();
    expect(screen.getByLabelText(/효과음 볼륨/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /마스터 음소거/ })).toBeInTheDocument();
  });

  it('BGM 슬라이더 change → store.bgmVolume 갱신 (0~100 → 0~1 변환)', async () => {
    const user = userEvent.setup();
    render(<AudioControls />);
    await user.click(screen.getByRole('button', { name: /사운드 설정/ }));
    const slider = screen.getByLabelText(/BGM 볼륨/);
    fireEvent.change(slider, { target: { value: '40' } });
    expect(useAudioStore.getState().bgmVolume).toBeCloseTo(0.4, 5);
  });

  it('SFX 슬라이더 change → store.sfxVolume 갱신', async () => {
    const user = userEvent.setup();
    render(<AudioControls />);
    await user.click(screen.getByRole('button', { name: /사운드 설정/ }));
    const slider = screen.getByLabelText(/효과음 볼륨/);
    fireEvent.change(slider, { target: { value: '20' } });
    expect(useAudioStore.getState().sfxVolume).toBeCloseTo(0.2, 5);
  });

  it('마스터 음소거 토글 클릭 → isMuted 반전, 아이콘에 muted 클래스 적용', async () => {
    const user = userEvent.setup();
    const { container } = render(<AudioControls />);
    await user.click(screen.getByRole('button', { name: /사운드 설정/ }));
    await user.click(screen.getByRole('button', { name: /마스터 음소거/ }));
    expect(useAudioStore.getState().isMuted).toBe(true);
    expect(container.querySelector('.audio-controls__icon-button--muted')).not.toBeNull();
  });

  it('popover 외부 클릭 → 닫힘', async () => {
    const user = userEvent.setup();
    render(<AudioControls />);
    await user.click(screen.getByRole('button', { name: /사운드 설정/ }));
    expect(screen.getByLabelText(/BGM 볼륨/)).toBeInTheDocument();
    // 외부(document body) pointerdown
    fireEvent.pointerDown(document.body);
    expect(screen.queryByLabelText(/BGM 볼륨/)).toBeNull();
  });

  it('Escape 키 → popover 닫힘', async () => {
    const user = userEvent.setup();
    render(<AudioControls />);
    await user.click(screen.getByRole('button', { name: /사운드 설정/ }));
    expect(screen.getByLabelText(/BGM 볼륨/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByLabelText(/BGM 볼륨/)).toBeNull();
  });
});
```

- [ ] **Step 4.2: Run tests to verify they fail**

Run: `npm run test:run -- src/components/AudioControls/__tests__/AudioControls.test.jsx`
Expected: FAIL — 컴포넌트 없음.

- [ ] **Step 4.3: Implement `AudioControls.jsx`**

Create `src/components/AudioControls/AudioControls.jsx`:

```jsx
import React, { useEffect, useRef, useState } from 'react';
import { useAudioStore } from '../../audio/useAudioStore.js';
import './AudioControls.css';

function MuteIcon({ muted }) {
  // 스피커 아이콘 (muted=true 시 X 표시 추가)
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor" />
      {muted ? (
        <>
          <line x1="16" y1="9" x2="22" y2="15" stroke="currentColor" strokeWidth="2" />
          <line x1="22" y1="9" x2="16" y2="15" stroke="currentColor" strokeWidth="2" />
        </>
      ) : (
        <>
          <path d="M16 8.5a4.5 4.5 0 0 1 0 7" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M18.5 6a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" />
        </>
      )}
    </svg>
  );
}

export default function AudioControls() {
  const bgmVolume = useAudioStore((s) => s.bgmVolume);
  const sfxVolume = useAudioStore((s) => s.sfxVolume);
  const isMuted = useAudioStore((s) => s.isMuted);
  const setBgmVolume = useAudioStore((s) => s.setBgmVolume);
  const setSfxVolume = useAudioStore((s) => s.setSfxVolume);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // 외부 클릭 / Escape 로 닫기
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const bgmDisplay = Math.round(bgmVolume * 100);
  const sfxDisplay = Math.round(sfxVolume * 100);

  return (
    <div className="audio-controls" ref={rootRef}>
      <button
        type="button"
        className={`audio-controls__icon-button ${isMuted ? 'audio-controls__icon-button--muted' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="사운드 설정"
        aria-expanded={open}
        aria-pressed={isMuted}
      >
        <MuteIcon muted={isMuted} />
      </button>

      {open && (
        <div className="audio-controls__popover" role="dialog" aria-label="사운드 컨트롤">
          <label className="audio-controls__row">
            <span className="audio-controls__label">BGM</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={bgmDisplay}
              onChange={(e) => setBgmVolume(Number(e.target.value) / 100)}
              aria-label="BGM 볼륨"
            />
            <span className="audio-controls__value">{bgmDisplay}</span>
          </label>

          <label className="audio-controls__row">
            <span className="audio-controls__label">효과음</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={sfxDisplay}
              onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
              aria-label="효과음 볼륨"
            />
            <span className="audio-controls__value">{sfxDisplay}</span>
          </label>

          <div className="audio-controls__divider" />

          <button
            type="button"
            className={`audio-controls__mute-toggle ${isMuted ? 'audio-controls__mute-toggle--on' : ''}`}
            onClick={toggleMute}
            aria-label="마스터 음소거"
            aria-pressed={isMuted}
          >
            {isMuted ? '음소거 해제' : '마스터 음소거'}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4.4: Implement `AudioControls.css`**

Create `src/components/AudioControls/AudioControls.css`:

```css
.audio-controls {
  position: fixed;
  top: 28px;
  right: 28px;
  z-index: 110;
}

.audio-controls__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  background: rgba(255, 204, 0, 0.08);
  border: 1px solid rgba(255, 204, 0, 0.45);
  border-radius: 4px;
  color: #ffcc00;
  cursor: pointer;
  box-shadow: 0 0 12px rgba(255, 204, 0, 0.12);
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.1s;
}

.audio-controls__icon-button:hover {
  background: rgba(255, 204, 0, 0.18);
  border-color: rgba(255, 204, 0, 0.8);
  box-shadow: 0 0 18px rgba(255, 204, 0, 0.28);
  transform: translateY(-1px);
}

.audio-controls__icon-button:focus-visible {
  outline: 2px solid rgba(255, 204, 0, 0.85);
  outline-offset: 3px;
}

.audio-controls__icon-button--muted {
  color: #ff6666;
  border-color: rgba(255, 102, 102, 0.55);
  background: rgba(255, 102, 102, 0.08);
  box-shadow: 0 0 12px rgba(255, 102, 102, 0.18);
}

.audio-controls__popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 240px;
  padding: 14px 16px;
  background: #0e0e10;
  border: 1px solid #444;
  border-radius: 6px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.55);
  color: #e6e6e6;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.audio-controls__row {
  display: grid;
  grid-template-columns: 60px 1fr 36px;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
}

.audio-controls__label {
  color: rgba(255, 204, 0, 0.85);
  font-weight: 600;
}

.audio-controls__row input[type="range"] {
  width: 100%;
  accent-color: #ffcc00;
}

.audio-controls__value {
  text-align: right;
  color: rgba(255, 255, 255, 0.7);
  font-variant-numeric: tabular-nums;
  font-size: 0.85rem;
}

.audio-controls__divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 4px 0;
}

.audio-controls__mute-toggle {
  padding: 8px 10px;
  background: transparent;
  border: 1px solid rgba(255, 204, 0, 0.45);
  border-radius: 4px;
  color: #ffcc00;
  font: inherit;
  font-size: 0.9rem;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.audio-controls__mute-toggle:hover {
  background: rgba(255, 204, 0, 0.12);
}

.audio-controls__mute-toggle--on {
  background: rgba(255, 102, 102, 0.12);
  border-color: rgba(255, 102, 102, 0.7);
  color: #ff8888;
}
```

- [ ] **Step 4.5: Run tests to verify they pass**

Run: `npm run test:run -- src/components/AudioControls/__tests__/AudioControls.test.jsx`
Expected: PASS (7 tests).

- [ ] **Step 4.6: Run full test suite (no regressions)**

Run: `npm run test:run`
Expected: 64 (기존) + 7 (Task1) + 6 (Task2) + 4 (Task3) + 7 (Task4) = 88 tests PASS.

- [ ] **Step 4.7: Commit**

```bash
git add src/components/AudioControls/AudioControls.jsx src/components/AudioControls/AudioControls.css src/components/AudioControls/__tests__/AudioControls.test.jsx
git commit -m "feat(audio): AudioControls 우상단 popover 컴포넌트 #36

스피커 아이콘 클릭 시 BGM/효과음 슬라이더와 마스터 음소거 토글 노출.
외부 클릭/Escape 닫기, isMuted 시 빨강 톤. 모든 라우트에서 항상 노출 예정."
```

---

## Task 5: App 에 `AudioControls` 마운트

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 5.1: Edit `src/App.jsx`**

Replace the contents with:

```jsx
import RouteTree from './routes/RouteTree.jsx';
import HudOverlay from './components/HudOverlay/HudOverlay.jsx';
import AudioControls from './components/AudioControls/AudioControls.jsx';
import BgmController from './audio/BgmController.jsx';
import './App.css';

export default function App() {
  return (
    <div className="app-stage">
      <RouteTree />
      <HudOverlay />
      <AudioControls />
      <BgmController />
    </div>
  );
}
```

- [ ] **Step 5.2: Run full test suite**

Run: `npm run test:run`
Expected: 88 tests still PASS.

- [ ] **Step 5.3: Manual smoke test**

Run: `npm run dev` (in a separate terminal).
브라우저에서 다음을 확인:
- 우상단 스피커 아이콘이 모든 라우트(`/`, `/hub`, `/stage/1`, `/ranking`, `/ending/*`)에서 노출되는가
- 아이콘 클릭 시 popover 열리고 슬라이더 동작
- 외부 클릭/Escape 로 닫힘
- 새로고침 후 슬라이더 값이 유지되는가 (localStorage)

- [ ] **Step 5.4: Commit**

```bash
git add src/App.jsx
git commit -m "feat(audio): App 에 AudioControls 마운트 #36

RouteTree/HudOverlay/BgmController 와 동급 레이어로 추가.
모든 라우트에서 우상단 아이콘 노출."
```

---

## Task 6: `BgmController` 마이그레이션

**Files:**
- Modify: `src/audio/BgmController.jsx`

- [ ] **Step 6.1: Replace `src/audio/BgmController.jsx`**

기존 파일 전체를 다음으로 교체. `BGM_DEFAULTS.volume` 사용을 제거하고 `useAudioVolume('bgm')` 구독으로 대체.

```jsx
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackIdForPath, TRACK_TO_FILE, BGM_DEFAULTS } from './trackRegistry.js';
import { useAudioVolume } from './useAudioVolume.js';

// TODO(post-skeleton):
//   - 크로스페이드 전환 (현재는 hard cut)
//   - 라우트별 신규 BGM 파일 추가 (TRACK_TO_FILE만 갱신)

export default function BgmController() {
  const audioRef = useRef(null);
  const { pathname } = useLocation();
  const volume = useAudioVolume('bgm');

  // 트랙 전환: 라우트 변경 시 src 갱신 + 재생
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const targetId = trackIdForPath(pathname);
    const targetFile = targetId ? TRACK_TO_FILE[targetId] : null;

    if (!targetFile) {
      audio.pause();
      audio.removeAttribute('src');
      return undefined;
    }

    const targetSrc = new URL(targetFile, window.location.origin).href;
    if (audio.currentSrc === targetSrc && !audio.paused) return undefined;

    audio.src = targetFile;
    audio.volume = volume;
    audio.loop = BGM_DEFAULTS.loop;

    let unlockHandler = null;
    const removeUnlock = () => {
      if (!unlockHandler) return;
      document.removeEventListener('pointerdown', unlockHandler, true);
      document.removeEventListener('keydown', unlockHandler, true);
      unlockHandler = null;
    };

    audio.play().catch(() => {
      unlockHandler = () => {
        removeUnlock();
        audio.play().catch(() => {});
      };
      document.addEventListener('pointerdown', unlockHandler, true);
      document.addEventListener('keydown', unlockHandler, true);
    });

    return removeUnlock;
  }, [pathname, volume]);

  // 볼륨 실시간 동기화: 트랙 전환과 별개로 store volume 변경 시 즉시 반영
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  return <audio ref={audioRef} preload="auto" />;
}
```

> 참고: `volume` 변경이 트랙 전환 effect의 deps에도 들어가서 매번 src 재할당이 일어나면 재생이 끊어진다. 위 구현은 src 동일성 검사(`audio.currentSrc === targetSrc && !audio.paused`)로 막아주지만, deps에 volume을 넣은 이유는 첫 src 할당 시점에도 최신 볼륨을 쓰기 위함이다. 이후 변경은 두 번째 effect가 담당.

- [ ] **Step 6.2: Run full test suite**

Run: `npm run test:run`
Expected: 88 tests still PASS.

- [ ] **Step 6.3: Manual smoke test**

`npm run dev` 후 `/hub` 진입 시 BGM 들리는지, AudioControls에서 BGM 슬라이더 움직이면 실시간으로 음량 변하는지, 마스터 뮤트 토글 시 즉시 무음 되는지 확인.

- [ ] **Step 6.4: Commit**

```bash
git add src/audio/BgmController.jsx
git commit -m "refactor(audio): BgmController 가 useAudioVolume 구독 #36

BGM_DEFAULTS.volume 하드코딩 제거.
store volume/isMuted 변경 시 실시간 동기화."
```

---

## Task 7: Stage 1 (heartbeat BGM) 마이그레이션

**Files:**
- Modify: `src/stages/stage1/Stage1Placeholder.jsx`

- [ ] **Step 7.1: Edit `Stage1Placeholder.jsx`**

상단 import에 추가:

```js
import { useAudioVolume } from '../../audio/useAudioVolume.js';
```

컴포넌트 함수 본문 시작부 (`const [phase, setPhase] = useState('STORY');` 라인 근처)에 추가:

```js
  const bgmVolume = useAudioVolume('bgm');
```

키 다운 핸들러 안의 다음 코드를 찾는다:

```js
        const bgm = bgmRef.current;
        if (bgm) {
          bgm.currentTime = 0.1;
          bgm.volume = 0.7;
          bgm.playbackRate = 1.15;
          bgm.play().catch(() => {}); 
        }
```

`bgm.volume = 0.7;` 라인을 `bgm.volume = bgmVolume;`로 교체.

그리고 그 아래쪽 어딘가의 BGM useEffect (volume을 직접 세팅하는 곳이 더 있으면 마찬가지로 `bgmVolume` 사용) 그리고 useEffect deps 배열에 `bgmVolume`을 추가한다.

또한 컴포넌트 내에 store 변경 시 현재 재생 중인 audio.volume 도 동기화하는 effect를 추가한다 (Stage 1 BGM useEffect 끝에 새 useEffect 추가):

```js
  // useAudioStore 의 bgmVolume 변경 시 현재 재생 중인 heartbeat 에 즉시 반영
  useEffect(() => {
    const bgm = bgmRef.current;
    if (bgm) bgm.volume = bgmVolume;
  }, [bgmVolume]);
```

- [ ] **Step 7.2: Run full test suite**

Run: `npm run test:run`
Expected: 88 tests still PASS.

- [ ] **Step 7.3: Manual smoke test**

`npm run dev` → `/stage/1` 진입 → CHIMING 진입 후 heartbeat BGM 들리는지, AudioControls에서 BGM 슬라이더 움직이면 실시간 반영되는지, 마스터 뮤트 시 무음 되는지 확인.

- [ ] **Step 7.4: Commit**

```bash
git add src/stages/stage1/Stage1Placeholder.jsx
git commit -m "refactor(stage1): heartbeat BGM 이 useAudioVolume 구독 #36

하드코딩 0.7 제거. store 변경 시 실시간 동기화 effect 추가."
```

---

## Task 8: Stage 2 (BGM + 3 SFX, playSound 헬퍼 제거) 마이그레이션

**Files:**
- Modify: `src/stages/stage2/Stage2Placeholder.jsx`

- [ ] **Step 8.1: Update imports**

상단 import에 추가:

```js
import { useAudioVolume } from '../../audio/useAudioVolume.js';
import { playSfx } from '../../audio/playSfx.js';
```

`useCallback` import는 더 이상 필요 없으면 제거. 사용처 확인 후 결정.

- [ ] **Step 8.2: Refactor audio setup**

`audioRefs` (4개 Audio 보관) 중 BGM만 유지하고, SFX 3개(`fake`/`real`/`shutter`)는 `new Audio()` 생성 코드 제거 — `playSfx`가 매번 생성한다.

기존:
```js
  const audioRefs = useRef({
    bgm: null,
    fake: null,
    real: null,
    shutter: null,
  });
```

이후:
```js
  const bgmRef = useRef(null);
```

마운트 effect 갱신:
```js
  useEffect(() => {
    Object.values(BGS).forEach(src => { const img = new Image(); img.src = src; });

    bgmRef.current = new Audio(SOUNDS.BGM);
    bgmRef.current.loop = true;

    return () => {
      const bgm = bgmRef.current;
      if (bgm) { bgm.pause(); bgm.currentTime = 0; }
      if (jumpscareAudioTimeoutRef.current) {
        clearTimeout(jumpscareAudioTimeoutRef.current);
      }
    };
  }, []);
```

- [ ] **Step 8.3: Replace playSound helper**

기존 `playSound` `useCallback` 정의를 제거. 호출부를 `playSfx`로 직접 대체.

Stage 2의 현재 `playSound` 호출은 두 곳 (line 176, 247):
- `playSound('shutter', 1.0, 500)` → `playSfx(SOUNDS.SHUTTER, { durationMs: 500 })`
- `playSound('fake', 0.8, 400)` → `playSfx(SOUNDS.FAKE, { scale: 0.8, durationMs: 400 })`

`playSfx`의 `durationMs` 옵션(Task 3에서 추가) 으로 기존 duration 제한 동작 보존.

또한 `playSound`가 등록된 useEffect deps 배열(`[handleFinish, playSound]`)에서 `playSound`를 제거. 그리고 함수 본문에서 `useCallback`이 더 이상 필요 없으면 import에서 제거.

- [ ] **Step 8.4: BGM volume + scale 적용**

함수 본문 상단:

```js
  const bgmVolume = useAudioVolume('bgm', { scale: 0.5 }); // 기존 0.5 톤 유지
```

기존 BGM useEffect 의 `bgm.volume = 0.5;` 라인을 `bgm.volume = bgmVolume;`로 교체하고 deps 에 `bgmVolume` 추가:

```js
  useEffect(() => {
    const bgm = bgmRef.current;
    if (!bgm) return;

    if (phase === 'PLAY' && isRunning) {
      bgm.volume = bgmVolume;
      bgm.currentTime = 86;
      bgm.play().catch(() => {});
    } else {
      bgm.pause();
    }
  }, [phase, isRunning, bgmVolume]);
```

또한 store 변경 시 실시간 동기화 effect 추가:

```js
  useEffect(() => {
    const bgm = bgmRef.current;
    if (bgm) bgm.volume = bgmVolume;
  }, [bgmVolume]);
```

- [ ] **Step 8.5: Special-case real SFX (delayed)**

기존 코드에 `realAudio.currentTime = 0.5; realAudio.volume = 1.0; realAudio.play()` 같은 패턴이 setTimeout 안에 있다 (line ~270). 이 경우도 `playSfx(SOUNDS.REAL)`로 단순화 가능 — `currentTime = 0.5` 시작 트림이 실제로 필요한지 확인. 기존 동작이 0.5초부터 재생이라면 `playSfx` 확장 없이 `Audio` 직접 사용도 OK. 다만 store 볼륨은 반드시 읽어 적용해야 함:

```js
jumpscareAudioTimeoutRef.current = setTimeout(() => {
  const audio = new Audio(SOUNDS.REAL);
  audio.currentTime = 0.5;
  const { sfxVolume, isMuted } = useAudioStore.getState();
  audio.volume = isMuted ? 0 : sfxVolume;
  audio.play().catch(() => {});
}, /* delay */);
```

(이 케이스는 `playSfx` 일반 케이스에 안 들어가서 인라인 처리. `useAudioStore` import 추가 필요.)

- [ ] **Step 8.6: Run full test suite**

Run: `npm run test:run`
Expected: 88 tests still PASS.

- [ ] **Step 8.7: Manual smoke test**

`/stage/2` 진입 후 풀 플레이. BGM은 약간 작게(scale 0.5), real(jumpscare) SFX는 store sfxVolume 따라 변하는지, fake/shutter도 마찬가지인지, 마스터 뮤트 시 모두 무음인지 확인.

- [ ] **Step 8.8: Commit**

```bash
git add src/stages/stage2/Stage2Placeholder.jsx
git commit -m "refactor(stage2): BGM + SFX 가 useAudioVolume / playSfx 사용 #36

playSound 내부 헬퍼 제거. BGM scale 0.5 로 기존 톤 유지.
real(jumpscare)는 트림 재생 요구로 인라인 케이스 유지하되 store 볼륨 적용."
```

---

## Task 9: Stage 3 BGM 마이그레이션

**Files:**
- Modify: `src/stages/stage3/Stage3Game.jsx`

- [ ] **Step 9.1: Edit**

상단 import에 추가:

```js
import { useAudioVolume } from '../../audio/useAudioVolume.js';
```

`BGM_DEFAULTS` import는 `loop` 사용 위해 그대로 둬도 무방. (아래서 사용 안 하게 되면 제거.)

함수 본문 상단:

```js
  const bgmVolume = useAudioVolume('bgm');
```

기존 BGM useEffect 의 `audio.volume = BGM_DEFAULTS.volume;` 라인을 `audio.volume = bgmVolume;`로 교체하고 deps 에 `bgmVolume` 추가.

`BGM_DEFAULTS.loop` 사용이 그 외 라인에 있으면 그대로 두고, 다른 라인 없다면 `BGM_DEFAULTS` import도 제거. 검색: `git grep -n "BGM_DEFAULTS" src/stages/stage3/`

`loop` 한 줄 남기려고 import 유지하는 게 어색하면 인라인 `audio.loop = true;`로 대체.

또한 store 변경 시 실시간 동기화 effect 추가:

```js
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = bgmVolume;
  }, [bgmVolume]);
```

- [ ] **Step 9.2: Run full test suite**

Run: `npm run test:run`
Expected: 88 tests still PASS.

- [ ] **Step 9.3: Manual smoke**

`/stage/3` standalone 모드에서 BGM 들리는지, 슬라이더 움직이면 실시간 반영되는지 확인.

- [ ] **Step 9.4: Commit**

```bash
git add src/stages/stage3/Stage3Game.jsx
git commit -m "refactor(stage3): BGM 이 useAudioVolume 구독 #36

BGM_DEFAULTS.volume 제거. store 변경 시 실시간 반영."
```

---

## Task 10: Stage 4 (BGM + jumpscare SFX) 마이그레이션

**Files:**
- Modify: `src/stages/stage4/Stage4Host.jsx`

- [ ] **Step 10.1: Edit imports**

상단 import에 추가:

```js
import { useAudioVolume } from '../../audio/useAudioVolume.js';
import { playSfx } from '../../audio/playSfx.js';
```

`BGM_DEFAULTS`는 `loop` 사용분만 유지(또는 인라인). `SFX_VOLUME` 상수는 제거.

- [ ] **Step 10.2: BGM hook + 실시간 동기화**

함수 본문 상단:

```js
  const bgmVolume = useAudioVolume('bgm');
```

기존 BGM useEffect 의 `audio.volume = BGM_DEFAULTS.volume;` 를 `audio.volume = bgmVolume;` 로 교체. deps 에 `bgmVolume` 추가.

실시간 동기화 effect 추가:

```js
  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (audio) audio.volume = bgmVolume;
  }, [bgmVolume]);
```

- [ ] **Step 10.3: jumpscare SFX 를 playSfx 로 교체**

기존:

```js
    const sfxSrc = ASSETS.sounds.cutsceneJumpscareSfx;
    if (sfxSrc) {
      const audio = new Audio(sfxSrc);
      audio.volume = SFX_VOLUME;
      audio.play().catch(() => {});
      sfxAudioRef.current = audio;
    }
```

`sfxAudioRef`는 언마운트 cleanup 용으로 남아 있다 (line ~101). `playSfx`는 audio 인스턴스를 반환하지 않으므로, 언마운트 cleanup 을 위한 ref 가 필요하면 인라인 패턴을 유지하되 볼륨만 store 에서 읽도록 변경:

```js
    const sfxSrc = ASSETS.sounds.cutsceneJumpscareSfx;
    if (sfxSrc) {
      const audio = new Audio(sfxSrc);
      const { sfxVolume, isMuted } = useAudioStore.getState();
      audio.volume = isMuted ? 0 : sfxVolume;
      audio.play().catch(() => {});
      sfxAudioRef.current = audio;
    }
```

`useAudioStore` import 추가:

```js
import { useAudioStore } from '../../audio/useAudioStore.js';
```

`SFX_VOLUME` 상수 제거.

> 결정: 본 케이스는 `playSfx`를 쓰지 않고 인라인 + `getState()` 패턴을 유지한다. 이유: 언마운트 cleanup 을 위한 ref 가 필요해서. `playSfx`는 fire-and-forget 만 다룬다.

- [ ] **Step 10.4: Run full test suite**

Run: `npm run test:run`
Expected: 88 tests still PASS (Stage4TimerPane 테스트 회귀 없음 확인).

- [ ] **Step 10.5: Manual smoke**

`/stage/4` 진입 후 풀 플레이 (intro → running → merging → jumpscare). BGM 과 jumpscare SFX 가 store 볼륨/뮤트 따라 반영되는지 확인.

- [ ] **Step 10.6: Commit**

```bash
git add src/stages/stage4/Stage4Host.jsx
git commit -m "refactor(stage4): BGM/jumpscare SFX 가 store 볼륨 사용 #36

BGM_DEFAULTS.volume, SFX_VOLUME 상수 제거.
jumpscare SFX 는 언마운트 cleanup 위해 인라인 getState 패턴 유지."
```

---

## Task 11: HubPage 문 열기 SFX 마이그레이션

**Files:**
- Modify: `src/routes/HubPage/HubPage.jsx`

- [ ] **Step 11.1: Edit**

상단 import에 추가:

```js
import { playSfx } from '../../audio/playSfx.js';
```

`openDoor` 함수의 다음 두 줄:

```js
    const sfx = new Audio(ASSETS.sounds.openDoor);
    sfx.play().catch(() => {});
```

다음 한 줄로 교체:

```js
    playSfx(ASSETS.sounds.openDoor);
```

- [ ] **Step 11.2: Run full test suite**

Run: `npm run test:run`
Expected: 88 tests still PASS.

- [ ] **Step 11.3: Manual smoke**

`/hub` 에서 문 클릭 시 소리 들리는지, 마스터 뮤트 시 무음인지 확인.

- [ ] **Step 11.4: Commit**

```bash
git add src/routes/HubPage/HubPage.jsx
git commit -m "refactor(hub): openDoor SFX 가 playSfx 사용 #36"
```

---

## Task 12: EndingCutscene SFX 마이그레이션

**Files:**
- Modify: `src/routes/EndingPage/EndingCutscene.jsx`

- [ ] **Step 12.1: Edit**

상단 import에 추가:

```js
import { playSfx } from '../../audio/playSfx.js';
```

`VOLUME = 0.8` 상수 제거. 기존 useEffect 본문:

```js
  useEffect(() => {
    if (phase !== 'reveal') return undefined;
    if (!sfxSrc) return undefined;
    const audio = new Audio(sfxSrc);
    audio.volume = VOLUME;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [phase, sfxSrc]);
```

`playSfx`는 fire-and-forget 이라 cleanup 못 함. 엔딩 SFX 는 짧고 한 번 들리고 끝나는 게 의도된 사운드라 cleanup 이 정말 필요한지 재검토. 만약 라우트 이탈 시 즉시 멈춰야 한다면 인라인 패턴 유지하되 store 볼륨 읽기:

```js
  useEffect(() => {
    if (phase !== 'reveal') return undefined;
    if (!sfxSrc) return undefined;
    const audio = new Audio(sfxSrc);
    const { sfxVolume, isMuted } = useAudioStore.getState();
    audio.volume = (isMuted ? 0 : sfxVolume) * 0.8; // 기존 VOLUME 0.8 톤 유지
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [phase, sfxSrc]);
```

`useAudioStore` import 추가:

```js
import { useAudioStore } from '../../audio/useAudioStore.js';
```

> 결정: 본 케이스도 cleanup 이 명시되어 있으므로 인라인 패턴 유지. 0.8 scale 은 기존 톤을 보존하기 위해 곱하기로 적용.

- [ ] **Step 12.2: Run full test suite**

Run: `npm run test:run`
Expected: 88 tests still PASS.

- [ ] **Step 12.3: Manual smoke**

엔딩 시나리오까지 도달해 SFX 가 마스터 뮤트/슬라이더에 반응하는지 확인.

- [ ] **Step 12.4: Commit**

```bash
git add src/routes/EndingPage/EndingCutscene.jsx
git commit -m "refactor(ending): SFX 가 store 볼륨 사용 #36

VOLUME 0.8 상수는 scale 곱하기로 흡수. cleanup 위해 인라인 패턴 유지."
```

---

## Task 13: DialogueBox typing tick 마이그레이션

**Files:**
- Modify: `src/components/DialogueBox/DialogueBox.jsx`

- [ ] **Step 13.1: Edit**

상단 import에 추가:

```js
import { useAudioVolume } from '../../audio/useAudioVolume.js';
```

컴포넌트 함수 본문 상단(useState/useRef 선언 직후):

```js
  const sfxVolume = useAudioVolume('sfx');
```

오디오 ref 의 볼륨을 동기화하는 effect 추가 (typing useEffect 뒤에):

```js
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = sfxVolume;
  }, [sfxVolume]);
```

`audioRef.current.play()` 호출부는 그대로. typing 사이드 effect 안에서 `audio.volume = sfxVolume`을 직접 세팅하면 매 글자마다 store 읽어야 하므로 위 별도 effect 가 더 깔끔.

- [ ] **Step 13.2: Run full test suite**

Run: `npm run test:run`
Expected: 88 tests still PASS.

- [ ] **Step 13.3: Manual smoke**

다이얼로그가 등장하는 라우트(Stage 1 인트로 등)에서 typing tick 이 store sfxVolume 따라 반영되는지, 마스터 뮤트 시 무음인지 확인.

- [ ] **Step 13.4: Commit**

```bash
git add src/components/DialogueBox/DialogueBox.jsx
git commit -m "refactor(dialogue): typing tick 이 useAudioVolume(sfx) 구독 #36"
```

---

## Task 14: 최종 검증 (lint, build, full smoke)

**Files:** 없음.

- [ ] **Step 14.1: 전체 테스트 통과 확인**

Run: `npm run test:run`
Expected: 88 tests PASS.

- [ ] **Step 14.2: Production build**

Run: `npm run build`
Expected: 성공, CSS/JS 번들 크기 합리적.

- [ ] **Step 14.3 (선택): Lint**

Run: `npx eslint src/audio src/components/AudioControls 2>&1 | tail -30`
Expected: 본 작업 범위 파일에서 새 경고/에러 없음.
(전역 ESLint 설정의 import-x 플러그인 누락 이슈는 본 범위 외 — 무시.)

- [ ] **Step 14.4: 풀 스모크 시나리오**

`npm run dev`. 다음 시나리오를 처음부터 끝까지 플레이하며 사운드 컨트롤이 모든 지점에서 일관되게 동작하는지 확인:

1. `/` 타이틀 진입 — 우상단 스피커 아이콘 노출. BGM 슬라이더 50%, SFX 70%로 조정 후 시작.
2. `/hub` — BGM 들림 (50% 톤). 문 클릭 SFX 들림.
3. `/stage/1` — heartbeat BGM. AudioControls 에서 마스터 뮤트 → 즉시 무음. 해제 → 복귀.
4. `/stage/2` — 정적 BGM (scale 0.5 적용으로 0.5 × 0.5 = 0.25 톤). fake/real/shutter SFX 모두 store 따라 동작.
5. `/stage/3` — bgmStage3. 슬라이더 실시간 반영.
6. `/stage/4` — bgmStage4 + jumpscare SFX. 마스터 뮤트 상태로 들어가도 jumpscare 무음 유지.
7. 엔딩 컷씬 — ending SFX (scale 0.8 톤) 동작.
8. 새로고침 — 슬라이더 값이 localStorage 에서 복원되는지 확인.

- [ ] **Step 14.5: (테스트 통과 + 빌드 통과 + 스모크 OK 이면 추가 커밋 없음)**

본 태스크는 검증만이라 커밋이 발생하지 않는다. 만약 스모크에서 추가 수정이 필요하면 해당 사이트의 task 로 돌아가 fix 후 별도 커밋.

---

## Spec Coverage Self-Check

| 스펙 섹션 | 매핑 작업 |
| --- | --- |
| §3 카테고리 (BGM/SFX) | Task 1 (store 필드), Task 2 (selector) |
| §4 useAudioStore | Task 1 |
| §5 useAudioVolume | Task 2 |
| §6 playSfx | Task 3 |
| §7 패널 UI (아이콘, popover, 슬라이더, 음소거 토글, 외부클릭/Escape) | Task 4 |
| §8 마이그레이션 매핑 — BgmController | Task 6 |
| §8 — Stage1 heartbeat | Task 7 |
| §8 — Stage2 BGM scale 0.5 | Task 8 (Step 8.4) |
| §8 — Stage2 real/fake/shutter SFX | Task 8 (Step 8.3, 8.5) |
| §8 — Stage3 BGM | Task 9 |
| §8 — Stage4 BGM + jumpscare | Task 10 |
| §8 — HubPage openDoor | Task 11 |
| §8 — EndingCutscene SFX | Task 12 |
| §8 — DialogueBox typing | Task 13 |
| §9 라우팅/가시성 (모든 라우트 노출) | Task 5 (App 마운트, HIDDEN_ROUTES 미적용) |
| §11.1 useAudioStore 테스트 | Task 1 |
| §11.2 useAudioVolume 테스트 | Task 2 |
| §11.3 AudioControls 테스트 | Task 4 |
| §11.4 playSfx 테스트 | Task 3 |
| §11.5 회귀 (Stage2 scale 0.5) | Task 2/3 의 scale 테스트 + Task 8 스모크 |
| §12 마이그레이션 리스크 (BgmController unlock 보존) | Task 6 (unlock 로직 유지) |
