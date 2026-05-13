// Stage 1 (괘종시계) tunables. 모든 게임 숫자가 이 한 파일에 외부화됨.
// PRD §13 Tunable. Stage 3 의 stage3.config.js 와 동형 패턴.

export const STAGE1_CONFIG = {
  targetSec: 10.00,    // 12:00:00.00 = elapsed 10s
  timeoutSec: 11.5,    // 자동 종료
  // error = |elapsed − targetSec| (s).
  accuracyTiers: [
    { id: 'perfect', maxError: 0.05,     points: 100, label: '완벽!', color: '#FFD700' },
    { id: 'great',   maxError: 0.10,     points: 80,  label: '훌륭!', color: '#FF8855' },
    { id: 'good',    maxError: 0.20,     points: 60,  label: '좋아!', color: '#FFCC00' },
    { id: 'ok',      maxError: 0.40,     points: 40,  label: '통과',  color: '#FFEE88' },
    { id: 'bare',    maxError: Infinity, points: 20,  label: '아슬',  color: '#CCCCCC' },
  ],
  precisionBonusMax: 0,  // 100점 만점 체계 — perfect 내 정밀도 보너스 제거
};
