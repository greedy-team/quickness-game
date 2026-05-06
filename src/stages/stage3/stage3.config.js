// src/stages/stage3/stage3.config.js
// PRD §13 Tunable. 모든 게임 숫자가 이 한 파일에 외부화됨.

export const STAGE3_CONFIG = {
  durationSec:       10,      // 낙하 시퀀스 총 시간
  itemCount:         6,       // 아이템 개수
  realCount:         4,       // 진짜 기억 (나머지 = fakeCount = 2)
  fallDurationSec:   2.0,     // 한 아이템이 화면 위→아래까지
  catchZoneRatio:    0.25,    // 캐치 존 높이 (화면 대비)
  spawnIntervalJitterSec: 0.3,
  horizontalRandomRatio:  0.2, // 중앙 ±20%
  seed:              null,    // null = 매 플레이 timestamp 사용

  // 캐치 존 내 정확도 tier (per-item points)
  // maxOffset: 0=중심, 1=캐치 존 가장자리
  accuracyTiers: [
    { maxOffset: 0.05, points: 100, label: 'PERFECT', color: '#FFD700' },
    { maxOffset: 0.15, points: 80,  label: 'GREAT',   color: '#FF4444' },
    { maxOffset: 0.30, points: 60,  label: 'GOOD',    color: '#FFCC00' },
    { maxOffset: 0.50, points: 40,  label: 'OK',      color: '#FFEE88' },
    { maxOffset: 1.00, points: 20,  label: 'BARE',    color: '#AAAAAA' },
  ],

  fakePenalty: -50,   // fake 캐치 시
  missScore:    0,    // real 미입력 / 캐치 존 밖 입력
};
