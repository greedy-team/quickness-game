// 미니게임 4 (병렬 진행) — 합산 점수 → 5단계 등급 산정
// 등급 임계치는 절대 점수 기준 (랭킹전이라 점수 상한 미고지)
export const PARALLEL_GRADES = [
  { grade: 'LEGENDARY', threshold: 900, stars: 5, color: '#ffd700', title: '🌟 결전의 영웅', desc: '갑옷 입은 그린이의 모든 능력이 폭발했다.' },
  { grade: 'UNIQUE',    threshold: 750, stars: 4, color: '#ff007f', title: '💎 갑옷의 수호자', desc: '훌륭한 종합 시험. 보스 앞에서도 흔들리지 않으리라.' },
  { grade: 'EPIC',      threshold: 550, stars: 3, color: '#a78bfa', title: '🔮 결전의 전사', desc: '준비는 충분하다. 보스를 향해 나아가자.' },
  { grade: 'RARE',      threshold: 300, stars: 2, color: '#60a5fa', title: '⚔️ 시련의 통과자', desc: '아슬아슬하게 시련을 통과했다.' },
  { grade: 'COMMON',    threshold: 0,   stars: 1, color: '#86efac', title: '🛡️ 새내기 전사', desc: '아직 부족하지만 보스를 향한 첫 발은 뗐다.' },
];

export function getParallelGrade(totalBonus) {
  const score = Math.max(0, totalBonus);
  return PARALLEL_GRADES.find((g) => score >= g.threshold);
}

// 합산 점수 (보너스 적용 전/후) 산출
export function computeFinalScore(scoreLeft, scoreCenter, scoreRight, bonus = 2) {
  const raw = Math.max(0, (scoreLeft ?? 0) + (scoreCenter ?? 0) + (scoreRight ?? 0));
  return { raw, total: raw * bonus };
}

// dev 환경 자체 검증 (console.assert)
if (import.meta.env?.DEV) {
  console.assert(getParallelGrade(1000).grade === 'LEGENDARY', 'parallelUtils: 1000 → LEGENDARY');
  console.assert(getParallelGrade(900).grade === 'LEGENDARY', 'parallelUtils: 900 → LEGENDARY');
  console.assert(getParallelGrade(899).grade === 'UNIQUE',    'parallelUtils: 899 → UNIQUE');
  console.assert(getParallelGrade(750).grade === 'UNIQUE',    'parallelUtils: 750 → UNIQUE');
  console.assert(getParallelGrade(749).grade === 'EPIC',      'parallelUtils: 749 → EPIC');
  console.assert(getParallelGrade(550).grade === 'EPIC',      'parallelUtils: 550 → EPIC');
  console.assert(getParallelGrade(549).grade === 'RARE',      'parallelUtils: 549 → RARE');
  console.assert(getParallelGrade(300).grade === 'RARE',      'parallelUtils: 300 → RARE');
  console.assert(getParallelGrade(299).grade === 'COMMON',    'parallelUtils: 299 → COMMON');
  console.assert(getParallelGrade(0).grade === 'COMMON',      'parallelUtils: 0 → COMMON');
  console.assert(getParallelGrade(-100).grade === 'COMMON',   'parallelUtils: -100 → COMMON (clamp)');
  const f = computeFinalScore(100, 100, 300);
  console.assert(f.raw === 500 && f.total === 1000, 'parallelUtils: max raw 500, total 1000');
  const fNeg = computeFinalScore(100, -20, 300);
  console.assert(fNeg.raw === 380 && fNeg.total === 760, 'parallelUtils: 개별 음수 입력 합산 380 (합산 양수 → 클램프 미적용)');
  // 합산이 실제로 음수인 케이스 (ColorReaction -20만 있고 나머지 0) → raw 0으로 클램프
  const fAllNeg = computeFinalScore(0, -20, 0);
  console.assert(fAllNeg.raw === 0 && fAllNeg.total === 0, 'parallelUtils: 합산 음수 → raw 0으로 클램프, total 0');
}
