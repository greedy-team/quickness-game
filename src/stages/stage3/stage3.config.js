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

  // 캐치 존 내 정확도 tier (per-item points). realCount(4) × perfect(25) = 100점 만점.
  // maxOffset: 0=중심, 1=캐치 존 가장자리
  // id: CSS 클래스용 영문 식별자 / label: 화면 표시용 한국어
  accuracyTiers: [
    { id: 'perfect', maxOffset: 0.05, points: 25, label: '완벽!',  color: '#FFD700' },
    { id: 'great',   maxOffset: 0.15, points: 20, label: '훌륭!',  color: '#FF8855' },
    { id: 'good',    maxOffset: 0.30, points: 15, label: '좋아!',  color: '#FFCC00' },
    { id: 'ok',      maxOffset: 0.50, points: 10, label: '통과',   color: '#FFEE88' },
    { id: 'bare',    maxOffset: 1.00, points:  5, label: '아슬',   color: '#CCCCCC' },
  ],

  fakePenalty: -12,    // fake 캐치 시 (100점 만점 기준 비례 조정)
  missScore:    0,     // real 미입력 / 캐치 존 밖 입력

  // 표시용 라벨 (popup)
  fakeLabel:    '가짜!',
  missLabel:    '놓침',
};
