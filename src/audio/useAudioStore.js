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
