// src/stages/stage3/stage3.config.js
export const STAGE3_CONFIG = {
  durationSec:             7,
  itemCount:               4,
  fallDurationSecMin:      0.8,
  fallDurationSecMax:      1.5,
  // 💡 판정 범위를 좁힘 (기존 0.25 -> 0.12). 동그라미 크기에 딱 맞춘 빡빡한 판정!
  catchZoneRatio:          0.12, 
  spawnIntervalJitterSec:  0.4,
  // 💡 동그라미에 쏙 들어가도록 좌우 랜덤(0.2)을 없애고 일직선(0)으로 떨어지게 함
  horizontalRandomRatio:   0,    
  seed:                    null,

  catchPoints: 25,
  catchLabel:  '캐치!',
  missLabel:   '놓침',
};
