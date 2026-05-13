// src/stages/stage3/stage3.config.js
export const STAGE3_CONFIG = {
  durationSec:             10,
  itemCount:               4,        // 전부 real, fake 없음
  fallDurationSec:         2.0,
  catchZoneRatio:          0.25,
  spawnIntervalJitterSec:  0.4,
  horizontalRandomRatio:   0.2,
  seed:                    null,     // null = 매 플레이 Date.now() 사용

  catchPoints: 25,         // 캐치 성공 시 고정 점수 (4 × 25 = 100 max)
  catchLabel:  '캐치!',
  missLabel:   '놓침',
};
