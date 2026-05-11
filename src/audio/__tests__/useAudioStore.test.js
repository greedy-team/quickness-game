import { describe, it, expect, beforeEach } from 'vitest';
import { useAudioStore } from '../useAudioStore.js';

describe('useAudioStore', () => {
  beforeEach(() => {
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

  it('setBgmVolume(NaN) → 0 (비숫자 가드)', () => {
    useAudioStore.getState().setBgmVolume(NaN);
    expect(useAudioStore.getState().bgmVolume).toBe(0);
  });

  it('setSfxVolume("loud") → 0 (비숫자 가드)', () => {
    useAudioStore.getState().setSfxVolume('loud');
    expect(useAudioStore.getState().sfxVolume).toBe(0);
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
