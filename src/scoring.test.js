import { describe, it, expect } from 'vitest';
import {
  STAGE_SCORE_TIERS,
  PERFECT_HEADROOM,
  ENDING_SUCCESS_CUTOFF,
  TOTAL_MAX_SCORE,
  scoreFromMetric,
  endingOutcomeFromTotal,
} from './scoring.js';

describe('STAGE_SCORE_TIERS', () => {
  it('Stage 1·2·3·4 모두 5-tier 정의', () => {
    expect(STAGE_SCORE_TIERS[1]).toHaveLength(5);
    expect(STAGE_SCORE_TIERS[2]).toHaveLength(5);
    expect(STAGE_SCORE_TIERS[3]).toHaveLength(5);
    expect(STAGE_SCORE_TIERS[4]).toHaveLength(5);
  });

  it('PERFECT_HEADROOM 60', () => {
    expect(PERFECT_HEADROOM).toBe(60);
  });

  it('ENDING_SUCCESS_CUTOFF 700', () => {
    expect(ENDING_SUCCESS_CUTOFF).toBe(700);
  });

  it('TOTAL_MAX_SCORE 는 모든 스테이지 perfect tier + PERFECT_HEADROOM 의 합 (1540)', () => {
    expect(TOTAL_MAX_SCORE).toBe(1540);
  });

  it('TOTAL_MAX_SCORE 는 ENDING_SUCCESS_CUTOFF 보다 크다', () => {
    expect(TOTAL_MAX_SCORE).toBeGreaterThan(ENDING_SUCCESS_CUTOFF);
  });
});

describe('scoreFromMetric — Stage 1', () => {
  it('metric 0 (완벽) → perfect tier + headroom = 360', () => {
    expect(scoreFromMetric(1, 0)).toBe(360);
  });

  it('metric = 0.05 → 보간 (sentinel 360 ↔ perfect 300 의 절반)', () => {
    // t = (0.05 − 0) / (0.10 − 0) = 0.5; round(360 + (300−360)*0.5) = 330
    expect(scoreFromMetric(1, 0.05)).toBe(330);
  });

  it('metric = 0.10 → perfect tier 경계 = 300', () => {
    expect(scoreFromMetric(1, 0.10)).toBe(300);
  });

  it('metric = 0.25 → great→good 경계 = 240', () => {
    expect(scoreFromMetric(1, 0.25)).toBe(240);
  });

  it('metric = 0.45 → good→ok 경계 = 180', () => {
    expect(scoreFromMetric(1, 0.45)).toBe(180);
  });

  it('metric = 0.70 → ok→bare 경계 = 120', () => {
    expect(scoreFromMetric(1, 0.70)).toBe(120);
  });

  it('metric = 0.575 → ok 안 보간 (lo 180 ↔ hi 120 의 절반)', () => {
    // (0.575 − 0.45) / (0.70 − 0.45) = 0.5; round(180 + (120 − 180) × 0.5) = 150
    expect(scoreFromMetric(1, 0.575)).toBe(150);
  });

  it('metric = 1.00 → bare 끝 = 60', () => {
    expect(scoreFromMetric(1, 1.00)).toBe(60);
  });

  it('metric > 1 (clamp) → 60', () => {
    expect(scoreFromMetric(1, 1.5)).toBe(60);
  });

  it('metric 음수도 절댓값 + clamp', () => {
    expect(scoreFromMetric(1, -0.10)).toBe(300);
  });

  it('metric NaN → 0', () => {
    expect(scoreFromMetric(1, Number.NaN)).toBe(0);
  });

  it('비숫자 metric → 0', () => {
    expect(scoreFromMetric(1, 'oops')).toBe(0);
  });
});

describe('scoreFromMetric — Stage 2', () => {
  it('Stage 1 과 동일 tier 표 → 동일 결과', () => {
    expect(scoreFromMetric(2, 0)).toBe(360);
    expect(scoreFromMetric(2, 0.10)).toBe(300);
    expect(scoreFromMetric(2, 1.0)).toBe(60);
  });
});

describe('scoreFromMetric — Stage 3 (호환)', () => {
  it('metric 0 → 300 + 60 = 360 (PERFECT_HEADROOM 적용)', () => {
    expect(scoreFromMetric(3, 0)).toBe(360);
  });

  it('tier 경계 metric 0.10 → 기존과 동일 300', () => {
    expect(scoreFromMetric(3, 0.10)).toBe(300);
  });

  it('tier 경계 metric 1.0 → 기존과 동일 60', () => {
    expect(scoreFromMetric(3, 1.0)).toBe(60);
  });
});

describe('scoreFromMetric — Stage 4 (호환)', () => {
  it('metric 0 → 400 + 60 = 460', () => {
    expect(scoreFromMetric(4, 0)).toBe(460);
  });

  it('tier 경계 metric 0.10 → 기존과 동일 400', () => {
    expect(scoreFromMetric(4, 0.10)).toBe(400);
  });
});

describe('scoreFromMetric — 알 수 없는 stage', () => {
  it('stageId 99 → 0', () => {
    expect(scoreFromMetric(99, 0)).toBe(0);
  });
});

describe('endingOutcomeFromTotal', () => {
  it('totalScore 700 정확 → alive', () => {
    expect(endingOutcomeFromTotal(700)).toBe('alive');
  });

  it('totalScore 699 → silhouette', () => {
    expect(endingOutcomeFromTotal(699)).toBe('silhouette');
  });

  it('NaN → silhouette', () => {
    expect(endingOutcomeFromTotal(Number.NaN)).toBe('silhouette');
  });
});
