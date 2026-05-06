import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useGameStore } from '../store.js';
import { trackIdForPath, TRACK_TO_FILE, BGM_DEFAULTS } from './trackRegistry.js';

// TODO(post-skeleton):
//   - 크로스페이드 전환 (현재는 hard cut)
//   - 음량/음소거 UI (현재는 BGM_DEFAULTS 상수 고정)
//   - 라우트별 신규 BGM 파일 추가 (TRACK_TO_FILE만 갱신)
//   - 효과음(SFX)은 별도 컨트롤러 — 본 컨트롤러는 BGM 전용

export default function BgmController() {
  const audioRef = useRef(null);
  const { pathname } = useLocation();
  const hasUserStarted = useGameStore((s) => s.hasUserStarted);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // ① 사용자 gesture 전 → 절대 재생 시도 안 함 (autoplay 정책 회피)
    if (!hasUserStarted) {
      audio.pause();
      audio.removeAttribute('src');
      return;
    }

    // ② 현재 라우트의 트랙 파일 결정
    const targetId = trackIdForPath(pathname);
    if (!targetId) return;
    const targetFile = TRACK_TO_FILE[targetId];

    // ③ 파일 URL 기준 동일성 검사 → 같은 파일이면 건드리지 않음
    //    (뼈대 단계: 모든 라우트가 동일 파일이므로 끊김 없이 유지)
    //    (정식 단계: 라우트마다 다른 파일이면 자동 전환)
    const targetSrc = new URL(targetFile, window.location.origin).href;
    if (audio.currentSrc === targetSrc) return;

    // ④ hard cut 교체
    audio.src = targetFile;
    audio.volume = BGM_DEFAULTS.volume;
    audio.loop = BGM_DEFAULTS.loop;
    audio.play().catch(() => {
      // 차단 시 silently fail — gesture 후 호출되므로 production에서는 차단 안 됨
    });
  }, [pathname, hasUserStarted]);

  return <audio ref={audioRef} preload="auto" />;
}
