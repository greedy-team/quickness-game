// 엔딩 컷씬 — outcome에 따라 이미지/자막/SFX 렌더.
// SFX 경로가 null이면 재생 skip (음원 미존재 시 안전 동작).

import { useEffect } from 'react';
import { ENDING_CONFIG } from './ending.config.js';
import './EndingCutscene.css';

const VOLUME = 0.8;

export default function EndingCutscene({ outcome, phase, totalScore }) {
  const { image, sfxSrc } = ENDING_CONFIG.assetsByOutcome[outcome];
  const caption = ENDING_CONFIG.captions[outcome];

  // SFX — reveal 진입 시 1회. 경로 null이면 skip.
  useEffect(() => {
    if (phase !== 'reveal') return undefined;
    if (!sfxSrc) return undefined;
    const audio = new Audio(sfxSrc);
    audio.volume = VOLUME;
    audio.play().catch(() => {});  // 자동재생 정책 실패 시 silent
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [phase, sfxSrc]);

  // phase가 'leaving'이면 페이드아웃, 'entered'이면 미가시(즉시 reveal로 전환됨)
  const visibilityClass =
    phase === 'leaving' ? 'ending-cutscene--leaving'
    : phase === 'entered' ? 'ending-cutscene--entered'
    : 'ending-cutscene--visible';

  return (
    <div className={`ending-cutscene ${visibilityClass}`}>
      <img
        className="ending-cutscene__image"
        src={image}
        alt={outcome === 'alive' ? '진짜 그린이' : '귀신이 된 그린이'}
        draggable={false}
      />
      <p className="ending-cutscene__caption">{caption}</p>
      <p className="ending-cutscene__score">최종 점수 {totalScore}</p>
    </div>
  );
}
