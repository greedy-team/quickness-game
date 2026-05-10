import { describe, it, expect } from 'vitest';
import { pointsForError, metricFromPoints } from './reactionScoring.js';

const FIXTURE = {
  accuracyTiers: [
    { id: 'perfect', maxError: 0.05,     points: 100, label: '완벽!', color: '#FFD700' },
    { id: 'great',   maxError: 0.10,     points: 80,  label: '훌륭!', color: '#FF8855' },
    { id: 'good',    maxError: 0.20,     points: 60,  label: '좋아!', color: '#FFCC00' },
    { id: 'ok',      maxError: 0.40,     points: 40,  label: '통과',  color: '#FFEE88' },
    { id: 'bare',    maxError: Infinity, points: 20,  label: '아슬',  color: '#CCCCCC' },
  ],
  precisionBonusMax: 60,
};

describe('pointsForError', () => {
  it('perfect tier 정중앙(error=0): base 100 + bonus 60 = 160', () => {
    const { tier, points } = pointsForError(0, FIXTURE);
    expect(tier.id).toBe('perfect');
    expect(points).toBe(160);
  });

  it('perfect tier 경계(error=maxError): bonus 0 → 100', () => {
    const { tier, points } = pointsForError(0.05, FIXTURE);
    expect(tier.id).toBe('perfect');
    expect(points).toBe(100);
  });

  it('perfect tier 절반(error=0.025): bonus 30 → 130', () => {
    const { tier, points } = pointsForError(0.025, FIXTURE);
    expect(tier.id).toBe('perfect');
    expect(points).toBe(130);
  });

  it('great tier (error=0.07): 보너스 없이 80', () => {
    const { tier, points } = pointsForError(0.07, FIXTURE);
    expect(tier.id).toBe('great');
    expect(points).toBe(80);
  });

  it('good tier (error=0.15): 60', () => {
    const { tier, points } = pointsForError(0.15, FIXTURE);
    expect(tier.id).toBe('good');
    expect(points).toBe(60);
  });

  it('ok tier (error=0.30): 40', () => {
    const { tier, points } = pointsForError(0.30, FIXTURE);
    expect(tier.id).toBe('ok');
    expect(points).toBe(40);
  });

  it('bare tier (error=999): 20', () => {
    const { tier, points } = pointsForError(999, FIXTURE);
    expect(tier.id).toBe('bare');
    expect(points).toBe(20);
  });
});

describe('metricFromPoints', () => {
  it('points=max(160) → metric 0', () => {
    expect(metricFromPoints(160, FIXTURE)).toBe(0);
  });

  it('points=base perfect(100) → metric 0.375', () => {
    // 1 - 100/160 = 0.375
    expect(metricFromPoints(100, FIXTURE)).toBeCloseTo(0.375, 5);
  });

  it('points=20 (bare) → metric 0.875', () => {
    // 1 - 20/160 = 0.875
    expect(metricFromPoints(20, FIXTURE)).toBeCloseTo(0.875, 5);
  });

  it('points 음수도 [0,1] 안으로 clamp', () => {
    expect(metricFromPoints(-100, FIXTURE)).toBe(1);
  });

  it('points 가 max 초과해도 [0,1] 안으로 clamp', () => {
    expect(metricFromPoints(9999, FIXTURE)).toBe(0);
  });
});
