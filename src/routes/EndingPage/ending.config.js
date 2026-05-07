// src/routes/EndingPage/ending.config.js
// 엔딩 컷씬 튜닝 단일 소스. 타이밍/자막/outcome→자산 매핑 모두 여기서 조정.

import { ASSETS } from '../../assets.js';

export const ENDING_CONFIG = {
  // 페이드인 (이미지 + 자막 등장)
  revealMs: 1000,
  // hold (정지 노출, PRD §5 "엔딩 10초"의 대부분 차지)
  holdMs:   8000,
  // 페이드아웃 후 /ranking 이동
  leaveMs:   500,

  // 한국어 자막 1줄 — PRD §10 자막 가이드 (큰 글씨, 가독성 우선)
  captions: {
    alive:      '또 다른 나를 떨쳐냈다.',
    silhouette: '또 다른 내가 되어버렸다.',
  },

  // outcome → 사용할 이미지 / SFX 키
  // SFX 경로가 null이면 EndingCutscene에서 재생 skip (안전).
  assetsByOutcome: {
    alive: {
      image:  ASSETS.images.endingAlive,
      sfxSrc: ASSETS.sounds.endingAliveSfx,
    },
    silhouette: {
      image:  ASSETS.images.endingSilhouette,
      sfxSrc: ASSETS.sounds.endingSilhouetteSfx,
    },
  },
};
