import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackIdForPath, TRACK_TO_FILE, BGM_DEFAULTS } from './trackRegistry.js';

// TODO(post-skeleton):
//   - 크로스페이드 전환 (현재는 hard cut)
//   - 음량/음소거 UI (현재는 BGM_DEFAULTS 상수 고정)
//   - 라우트별 신규 BGM 파일 추가 (TRACK_TO_FILE만 갱신)
//   - 효과음(SFX)은 별도 컨트롤러 — 본 컨트롤러는 BGM 전용

export default function BgmController() {
  const audioRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    // ① 현재 라우트의 트랙 파일 결정
    const targetId = trackIdForPath(pathname);
    const targetFile = targetId ? TRACK_TO_FILE[targetId] : null;

    // ② 트랙 파일 없는 라우트 → 정지 + src 제거
    if (!targetFile) {
      audio.pause();
      audio.removeAttribute('src');
      return undefined;
    }

    // ③ 파일 URL 기준 동일성 검사 → 같은 파일이면 건드리지 않음
    const targetSrc = new URL(targetFile, window.location.origin).href;
    if (audio.currentSrc === targetSrc && !audio.paused) return undefined;

    // ④ hard cut 교체 후 재생 시도
    audio.src = targetFile;
    audio.volume = BGM_DEFAULTS.volume;
    audio.loop = BGM_DEFAULTS.loop;

    // ⑤ autoplay 차단 시 첫 사용자 gesture에서 자동 재시도.
    // 새로고침/딥링크 등으로 gesture 없이 진입한 경우를 위해.
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

    // 라우트 변경/언마운트 시 미발화 리스너 정리
    return removeUnlock;
  }, [pathname]);

  return <audio ref={audioRef} preload="auto" />;
}
