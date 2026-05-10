// Stage 1·2·4 의 반응속도/타이밍 점수 산출 helper.
// stageN.config.js 의 accuracyTiers + precisionBonusMax 만 받아서 동작 — React/store 의존 없음.

/**
 * raw error → { tier, points }.
 * - tier: error 가 가장 먼저 maxError 이하로 들어가는 첫 tier (배열 앞에서부터 매칭).
 *   bare tier 의 maxError 는 Infinity 로 두어 항상 매칭 보장.
 * - points: tier.points + (perfect tier 이면 정밀도 보너스).
 *   precision = 1 − error / perfectMaxError, bonus = round(precision × precisionBonusMax).
 */
export function pointsForError(error, config) {
  const tier = config.accuracyTiers.find((t) => error <= t.maxError);
  let points = tier.points;
  if (tier.id === 'perfect') {
    const precision = Math.max(0, 1 - (error / tier.maxError));
    points += Math.round(precision * config.precisionBonusMax);
  }
  return { tier, points };
}

/**
 * earnedPoints → metric ∈ [0, 1] (0 = 완벽).
 * 분모는 perfect tier base + precisionBonusMax (perfect 만점).
 */
export function metricFromPoints(points, config) {
  const max = config.accuracyTiers[0].points + config.precisionBonusMax;
  return Math.max(0, Math.min(1, 1 - points / max));
}
