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
    let targetVolume = volume;
    if (targetId === 'hub') {
      targetVolume = volume * 0.5;
    }
    audio.volume = targetVolume;
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
    if (audio) {
      const targetId = trackIdForPath(pathname);
      audio.volume = targetId === 'hub' ? volume * 0.5 : volume;
    }
  }, [volume, pathname]);

  return <audio ref={audioRef} preload="auto" />;
}
