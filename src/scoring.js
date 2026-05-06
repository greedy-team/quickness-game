// src/scoring.js
// PRD §13 Tunable. tier 수치는 후속 이슈(스테이지 메커닉 구현)에서 채움.
// 형식: { stageId: [{ maxAbsError: number, points: number }, ...] }
//   - 배열은 maxAbsError 오름차순 정렬 (앞에서부터 매칭).

export const STAGE_SCORE_TIERS = {
  1: [],
  2: [],
  3: [],
  4: [],
};

/**
 * stageId의 metric에 해당하는 점수를 반환.
 * - tier가 비어 있으면 0 반환 (스켈레톤 단계 기본 동작).
 * - metric의 절댓값이 가장 작은 tier(가장 정확)부터 매칭.
 * - 잘못된 stageId / NaN / 비숫자 metric은 0 반환.
 *
 * 시그니처는 고정. 후속 이슈는 STAGE_SCORE_TIERS만 채우면 동작.
 */
export function scoreFromMetric(stageId, metric) {
  const tiers = STAGE_SCORE_TIERS[stageId];
  if (!tiers || tiers.length === 0) return 0;
  if (typeof metric !== 'number' || Number.isNaN(metric)) return 0;

  const absError = Math.abs(metric);
  const tier = tiers.find((t) => absError <= t.maxAbsError);
  return tier?.points ?? 0;
}
