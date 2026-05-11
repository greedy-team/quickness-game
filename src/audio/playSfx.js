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
  audio.addEventListener('ended', () => { audio.src = ''; });
  if (durationMs !== null) {
    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, durationMs);
  }
}
