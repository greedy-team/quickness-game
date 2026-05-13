import { describe, it, expect } from 'vitest';
import {
  STAGE_SCORE_TIERS,
  PERFECT_HEADROOM,
  ENDING_SUCCESS_CUTOFF,
  TOTAL_MAX_SCORE,
  maxScoreForStage,
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

  it('PERFECT_HEADROOM 0 (100점 만점 체계)', () => {
    expect(PERFECT_HEADROOM).toBe(0);
  });

  it('ENDING_SUCCESS_CUTOFF 270', () => {
    expect(ENDING_SUCCESS_CUTOFF).toBe(270);
  });

  it('TOTAL_MAX_SCORE = 100+100+100+300 = 600', () => {
    expect(TOTAL_MAX_SCORE).toBe(600);
  });

  it('TOTAL_MAX_SCORE 는 ENDING_SUCCESS_CUTOFF 보다 크다', () => {
    expect(TOTAL_MAX_SCORE).toBeGreaterThan(ENDING_SUCCESS_CUTOFF);
  });

  it('maxScoreForStage: 1·2·3 = 100, 4 = 300(sub-pane 합)', () => {
    expect(maxScoreForStage(1)).toBe(100);
    expect(maxScoreForStage(2)).toBe(100);
    expect(maxScoreForStage(3)).toBe(100);
    expect(maxScoreForStage(4)).toBe(300);
  });

  it('maxScoreForStage: 알 수 없는 stage → 0', () => {
    expect(maxScoreForStage(99)).toBe(0);
  });
});

describe('scoreFromMetric — Stage 1', () => {
  it('metric 0 (완벽) → 100', () => {
    expect(scoreFromMetric(1, 0)).toBe(100);
  });

  it('metric = 0.05 → sentinel과 tier[0] 모두 100점이라 100', () => {
    // sentinel(0, 100) ↔ tier[0](0.10, 100): t=0.5, score=100+(100-100)*0.5=100
    expect(scoreFromMetric(1, 0.05)).toBe(100);
  });

  it('metric = 0.10 → perfect tier 경계 = 100', () => {
    expect(scoreFromMetric(1, 0.10)).toBe(100);
  });

  it('metric = 0.25 → great 경계 = 80', () => {
    expect(scoreFromMetric(1, 0.25)).toBe(80);
  });

  it('metric = 0.45 → good 경계 = 60', () => {
    expect(scoreFromMetric(1, 0.45)).toBe(60);
  });

  it('metric = 0.70 → ok 경계 = 40', () => {
    expect(scoreFromMetric(1, 0.70)).toBe(40);
  });

  it('metric = 0.575 → ok 안 보간 (lo 60 ↔ hi 40 의 절반)', () => {
    // (0.575 − 0.45) / (0.70 − 0.45) = 0.5; round(60 + (40−60)*0.5) = 50
    expect(scoreFromMetric(1, 0.575)).toBe(50);
  });

  it('metric = 1.00 → bare 끝 = 20', () => {
    expect(scoreFromMetric(1, 1.00)).toBe(20);
  });

  it('metric > 1 (clamp) → 20', () => {
    expect(scoreFromMetric(1, 1.5)).toBe(20);
  });

  it('metric 음수도 절댓값 + clamp', () => {
    expect(scoreFromMetric(1, -0.10)).toBe(100);
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
    expect(scoreFromMetric(2, 0)).toBe(100);
    expect(scoreFromMetric(2, 0.10)).toBe(100);
    expect(scoreFromMetric(2, 1.0)).toBe(20);
  });
});

describe('scoreFromMetric — Stage 3 (호환)', () => {
  it('metric 0 → 100 (PERFECT_HEADROOM=0)', () => {
    expect(scoreFromMetric(3, 0)).toBe(100);
  });

  it('tier 경계 metric 0.10 → 100', () => {
    expect(scoreFromMetric(3, 0.10)).toBe(100);
  });

  it('tier 경계 metric 1.0 → 20', () => {
    expect(scoreFromMetric(3, 1.0)).toBe(20);
  });
});

describe('scoreFromMetric — Stage 4 (호환)', () => {
  it('metric 0 → 100', () => {
    expect(scoreFromMetric(4, 0)).toBe(100);
  });

  it('tier 경계 metric 0.10 → 100', () => {
    expect(scoreFromMetric(4, 0.10)).toBe(100);
  });
});

describe('scoreFromMetric — 알 수 없는 stage', () => {
  it('stageId 99 → 0', () => {
    expect(scoreFromMetric(99, 0)).toBe(0);
  });
});

describe('endingOutcomeFromTotal', () => {
  it('totalScore 270 정확 → alive', () => {
    expect(endingOutcomeFromTotal(270)).toBe('alive');
  });

  it('totalScore 269 → silhouette', () => {
    expect(endingOutcomeFromTotal(269)).toBe('silhouette');
  });

  it('NaN → silhouette', () => {
    expect(endingOutcomeFromTotal(Number.NaN)).toBe('silhouette');
  });
});
