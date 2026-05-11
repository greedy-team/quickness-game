import { useAudioStore } from './useAudioStore.js';

/**
 * 카테고리별 실효 볼륨 셀렉터.
 * @param {'bgm' | 'sfx'} category
 * @param {{ scale?: number }} [options] - 트랙별 미세 조정 인수 (기본 1).
 * @returns {number} isMuted 면 0, 아니면 store volume * scale.
 */
export function useAudioVolume(category, options) {
  const scale = options?.scale ?? 1;
  return useAudioStore((s) => {
    if (s.isMuted) return 0;
    const v = category === 'bgm' ? s.bgmVolume : s.sfxVolume;
    return v * scale;
  });
}
