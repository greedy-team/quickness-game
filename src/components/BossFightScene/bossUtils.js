// 보스전 핵심 룰: 누적 점수가 그대로 데미지. 점수 0/음수면 1로 클램프해 어떤 경우든 결국 클리어 가능.

export const BOSS_MAX_HP = 2000;

export function clampDamage(totalScore) {
  const n = Number(totalScore);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function computeAttacksToKill(totalScore, hp = BOSS_MAX_HP) {
  return Math.ceil(hp / clampDamage(totalScore));
}

if (import.meta.env?.DEV) {
  console.assert(clampDamage(0) === 1,        'bossUtils: 0 → 1');
  console.assert(clampDamage(-50) === 1,      'bossUtils: -50 → 1');
  console.assert(clampDamage(NaN) === 1,      'bossUtils: NaN → 1');
  console.assert(clampDamage(undefined) === 1,'bossUtils: undefined → 1');
  console.assert(clampDamage(800) === 800,    'bossUtils: 800 → 800');
  console.assert(clampDamage(800.7) === 800,  'bossUtils: 소수점 floor');
  console.assert(computeAttacksToKill(800) === 3,    'bossUtils: 2000/800 → 3회');
  console.assert(computeAttacksToKill(2000) === 1,   'bossUtils: 2000/2000 → 1회');
  console.assert(computeAttacksToKill(1) === 2000,   'bossUtils: 2000/1 → 2000회');
  console.assert(computeAttacksToKill(0) === 2000,   'bossUtils: 0 → 클램프 후 2000회');
  console.assert(BOSS_MAX_HP === 2000,               'bossUtils: BOSS_MAX_HP=2000');
}
