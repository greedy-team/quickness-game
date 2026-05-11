import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HudOverlay from '../HudOverlay.jsx';
import { useGameStore } from '../../../store.js';

function renderHud({ path = '/hub' } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <HudOverlay />
    </MemoryRouter>,
  );
}

function setTotalScore(score) {
  // Stage 1 의 score 슬롯에만 점수를 넣어 selectTotalScore 가 그대로 score 를 반환하게 한다.
  useGameStore.setState({
    stageResults: { 1: { metric: 0, score }, 2: null, 3: null, 4: null },
  });
}

describe('HudOverlay 점수 막대', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  afterEach(() => {
    cleanup();
    useGameStore.getState().resetGame();
  });

  it('total=0 일 때 채움 폭은 0%, alive 클래스 없음', () => {
    setTotalScore(0);
    const { container } = renderHud();
    const fill = container.querySelector('.hud-overlay__bar-fill');
    expect(fill).not.toBeNull();
    expect(fill.style.width).toBe('0%');
    expect(fill.className).not.toContain('hud-overlay__bar-fill--alive');
  });

  it('total=699 → 채움 폭 ≈ 31.2%, alive 클래스 없음', () => {
    setTotalScore(699);
    const { container } = renderHud();
    const fill = container.querySelector('.hud-overlay__bar-fill');
    const pct = parseFloat(fill.style.width);
    expect(pct).toBeGreaterThan(31);
    expect(pct).toBeLessThan(31.3);
    expect(fill.className).not.toContain('hud-overlay__bar-fill--alive');
  });

  it('total=700 → 채움 폭 ≈ 31.25%, alive 클래스 있음 (생존선 정확 통과)', () => {
    setTotalScore(700);
    const { container } = renderHud();
    const fill = container.querySelector('.hud-overlay__bar-fill');
    const pct = parseFloat(fill.style.width);
    expect(pct).toBeGreaterThanOrEqual(31.2);
    expect(pct).toBeLessThanOrEqual(31.3);
    expect(fill.className).toContain('hud-overlay__bar-fill--alive');
  });

  it('total=2240 → 채움 폭 100%, alive 클래스 있음', () => {
    setTotalScore(2240);
    const { container } = renderHud();
    const fill = container.querySelector('.hud-overlay__bar-fill');
    expect(fill.style.width).toBe('100%');
    expect(fill.className).toContain('hud-overlay__bar-fill--alive');
  });

  it('만점 텍스트(/ 2240)와 생존선 라벨(700)이 노출된다', () => {
    setTotalScore(0);
    renderHud();
    expect(screen.getByText(/\/\s*2240/)).toBeInTheDocument();
    expect(screen.getByText(/생존선 700/)).toBeInTheDocument();
  });

  it('점수 블록 클릭 시 ScoreTable 모달이 열린다 (회귀 보호)', async () => {
    setTotalScore(250);
    const user = userEvent.setup();
    renderHud();
    await user.click(screen.getByRole('button', { name: /점수 기준 보기/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('/ (타이틀) 라우트에서는 HUD 가 렌더되지 않는다', () => {
    setTotalScore(0);
    const { container } = renderHud({ path: '/' });
    expect(container.querySelector('.hud-overlay')).toBeNull();
  });
});
