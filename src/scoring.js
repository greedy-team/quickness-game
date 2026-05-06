// src/scoring.js
// PRD §13 Tunable. 배열은 maxAbsError 오름차순 정렬 (앞에서부터 매칭).

export const STAGE_SCORE_TIERS = {
  1: [],   // 팀원 작업 대기
  2: [],   // 팀원 작업 대기
  3: [
    { maxAbsError: 0.10, points: 300 },
    { maxAbsError: 0.25, points: 240 },
    { maxAbsError: 0.45, points: 180 },
    { maxAbsError: 0.70, points: 120 },
    { maxAbsError: 1.00, points: 60  },
  ],
  4: [
    { maxAbsError: 0.10, points: 400 },
    { maxAbsError: 0.25, points: 320 },
    { maxAbsError: 0.45, points: 240 },
    { maxAbsError: 0.70, points: 160 },
    { maxAbsError: 1.00, points: 80  },
  ],
};

/**
 * stageId의 metric에 해당하는 점수를 반환.
 * - tier가 비어 있으면 0 반환.
 * - metric의 절댓값이 가장 작은 tier(가장 정확)부터 매칭.
 * - 잘못된 stageId / NaN / 비숫자 metric은 0 반환.
 */
export function scoreFromMetric(stageId, metric) {
  const tiers = STAGE_SCORE_TIERS[stageId];
  if (!tiers || tiers.length === 0) return 0;
  if (typeof metric !== 'number' || Number.isNaN(metric)) return 0;

  const absError = Math.abs(metric);
  const tier = tiers.find((t) => absError <= t.maxAbsError);
  return tier?.points ?? 0;
}
