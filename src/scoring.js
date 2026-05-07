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

// ───── 엔딩 분기 (PRD §6 등급 컷오프와 별개의 단일 컷오프) ─────

/**
 * 누적 점수가 이 값 이상이면 성공 엔딩, 미만이면 실패 엔딩.
 * Tunable — 부스 플레이테스트 후 조정. 등급 시스템(S/A/B/F) 확정 시
 * S/A 경계 점수와 정합시킨다.
 */
export const ENDING_SUCCESS_CUTOFF = 600;

/**
 * 누적 점수 → 엔딩 outcome 결정.
 * - totalScore >= ENDING_SUCCESS_CUTOFF → 'alive' (성공)
 * - totalScore <  ENDING_SUCCESS_CUTOFF → 'silhouette' (실패)
 *
 * 음수/NaN/비숫자 입력은 'silhouette'로 안전 분기.
 */
export function endingOutcomeFromTotal(totalScore) {
  if (typeof totalScore !== 'number' || Number.isNaN(totalScore)) {
    return 'silhouette';
  }
  return totalScore >= ENDING_SUCCESS_CUTOFF ? 'alive' : 'silhouette';
}
