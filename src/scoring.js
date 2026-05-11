// src/scoring.js
// PRD §13 Tunable. STAGE_SCORE_TIERS 는 maxAbsError 오름차순.
// scoreFromMetric 은 sentinel(metric=0) ↔ tier[0] ↔ ... ↔ tier[last] 사이를 선형 보간.

export const PERFECT_HEADROOM = 60;  // metric=0 일 때 perfect tier 점수 위로 추가되는 동점방지 헤드룸 (모든 stage 공통).

export const STAGE_SCORE_TIERS = {
  1: [
    { maxAbsError: 0.10, points: 300 },
    { maxAbsError: 0.25, points: 240 },
    { maxAbsError: 0.45, points: 180 },
    { maxAbsError: 0.70, points: 120 },
    { maxAbsError: 1.00, points: 60  },
  ],
  2: [
    { maxAbsError: 0.10, points: 300 },
    { maxAbsError: 0.25, points: 240 },
    { maxAbsError: 0.45, points: 180 },
    { maxAbsError: 0.70, points: 120 },
    { maxAbsError: 1.00, points: 60  },
  ],
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
 * stageId 의 metric 에 해당하는 점수를 반환.
 * - tier 가 비어 있거나 stageId 미상이면 0.
 * - 비숫자/NaN → 0.
 * - 절댓값으로 정규화 후 [0, 1] clamp.
 * - sentinel(metric=0, points=tiers[0].points + PERFECT_HEADROOM) ↔ tiers 사이 선형 보간.
 *   → tier 경계점 점수는 기존과 동일, 같은 tier 안에서만 metric 차이가 점수 차이로 전이.
 */
export function scoreFromMetric(stageId, metric) {
  const tiers = STAGE_SCORE_TIERS[stageId];
  if (!tiers || tiers.length === 0) return 0;
  if (typeof metric !== 'number' || Number.isNaN(metric)) return 0;
  const m = Math.max(0, Math.min(1, Math.abs(metric)));

  const sentinel = { maxAbsError: 0, points: tiers[0].points + PERFECT_HEADROOM };
  const all = [sentinel, ...tiers];

  for (let i = 1; i < all.length; i++) {
    const lo = all[i - 1];
    const hi = all[i];
    if (m <= hi.maxAbsError) {
      const span = hi.maxAbsError - lo.maxAbsError;
      const t = span === 0 ? 0 : (m - lo.maxAbsError) / span;
      return Math.round(lo.points + (hi.points - lo.points) * t);
    }
  }
  return tiers[tiers.length - 1].points;
}

// ───── 엔딩 분기 ─────

// Stage 3은 누적식(가짜 캐치 페널티 포함)이라 tier 시스템과 별개의 raw max를 사용.
// stage3.config.js: realCount(4) × accuracyTiers[0].points(100) = 400.
// 순환 의존 회피를 위해 여기에 동기화된 상수로 둠.
const STAGE3_RAW_MAX = 400;

/**
 * 스테이지별 최대 점수.
 * - Stage 1·2: tiers[0].points + PERFECT_HEADROOM (perfect + 동점방지 헤드룸)
 * - Stage 3: raw 누적 최대 (가짜 무시 + 진짜 perfect)
 * - Stage 4: sub-pane(Stage 1·2·3) 점수의 합. 사용자가 sub-pane 모달에서 본 값과 합치.
 */
export function maxScoreForStage(stageId) {
  if (stageId === 3) return STAGE3_RAW_MAX;
  if (stageId === 4) {
    // Stage 4는 Stage 1·2·3 sub-pane 점수 합으로 정의 — STAGE_SCORE_TIERS[4]는 표시·통계용으로 유지.
    return maxScoreForStage(1) + maxScoreForStage(2) + maxScoreForStage(3);
  }
  const tiers = STAGE_SCORE_TIERS[stageId];
  if (!tiers || tiers.length === 0) return 0;
  return tiers[0].points + PERFECT_HEADROOM;
}

/**
 * 가능한 최대 누적 점수.
 * Stage 1·2 = 360, Stage 3 = 400 (raw), Stage 4 = 1120 (sub-pane 합) → 합 2240.
 */
export const TOTAL_MAX_SCORE = [1, 2, 3, 4].reduce(
  (sum, n) => sum + maxScoreForStage(n),
  0,
);

/**
 * 누적 점수가 이 값 이상이면 성공 엔딩, 미만이면 실패 엔딩.
 * Tunable — 부스 플레이테스트 후 조정.
 * 만점 변화: 1300 → 1540 → 1580 → 2240 (Stage 4 = sub-pane 합).
 * 비율: 1000/2240 ≈ 44.6% — "꾸준히 good 근처로 가야 통과" 의도.
 */
export const ENDING_SUCCESS_CUTOFF = 1000;

/**
 * 누적 점수 → 엔딩 outcome 결정.
 * - totalScore >= ENDING_SUCCESS_CUTOFF → 'alive'
 * - 그 외 / 음수 / NaN / 비숫자 → 'silhouette'
 */
export function endingOutcomeFromTotal(totalScore) {
  if (typeof totalScore !== 'number' || Number.isNaN(totalScore)) {
    return 'silhouette';
  }
  return totalScore >= ENDING_SUCCESS_CUTOFF ? 'alive' : 'silhouette';
}
