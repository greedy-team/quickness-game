import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup, act } from '@testing-library/react';
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
    act(() => { useAudioStore.setState({ bgmVolume: 0.1 }); });
    rerender();
    expect(result.current).toBe(0.1);
  });
});
