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
