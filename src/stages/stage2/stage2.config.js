// Stage 2 (반응속도) tunables. 모든 게임 숫자가 이 한 파일에 외부화됨.
// PRD §13 Tunable. Stage 1·3 의 *.config.js 와 동형 패턴.

export const STAGE2_CONFIG = {
  attackWindowMs: 700,  // 진짜 출현 후 미반응 자동 실패 시간
  // error = pressTime − attackStart (s). fake 캐치 / 타임아웃 → bare tier 직행 (컴포넌트에서 명시 처리).
  accuracyTiers: [
    { id: 'perfect', maxError: 0.25,     points: 100, label: '완벽!', color: '#FFD700' },
    { id: 'great',   maxError: 0.35,     points: 80,  label: '훌륭!', color: '#FF8855' },
    { id: 'good',    maxError: 0.50,     points: 60,  label: '좋아!', color: '#FFCC00' },
    { id: 'ok',      maxError: 0.65,     points: 40,  label: '통과',  color: '#FFEE88' },
    { id: 'bare',    maxError: Infinity, points: 20,  label: '아슬',  color: '#CCCCCC' },
  ],
  precisionBonusMax: 0,
};
