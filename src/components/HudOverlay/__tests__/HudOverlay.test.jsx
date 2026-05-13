import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HudOverlay from '../HudOverlay.jsx';
import { useGameStore } from '../../../store.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderHud({ path = '/hub' } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <HudOverlay />
    </MemoryRouter>,
  );
}

function setStageScore(stageId, score) {
  useGameStore.setState((s) => ({
    stageResults: { ...s.stageResults, [stageId]: { metric: 0, score } },
  }));
}

describe('HudOverlay', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    cleanup();
    useGameStore.getState().resetGame();
  });

  it('/ 라우트에서는 HUD가 렌더되지 않는다', () => {
    const { container } = renderHud({ path: '/' });
    expect(container.querySelector('.hud-overlay')).toBeNull();
  });

  it('/ranking 라우트에서는 HUD가 렌더되지 않는다', () => {
    const { container } = renderHud({ path: '/ranking' });
    expect(container.querySelector('.hud-overlay')).toBeNull();
  });

  it('/stage/* 라우트에서는 SCORE 텍스트만 노출되고 아이콘 버튼은 없다', () => {
    renderHud({ path: '/stage/1' });
    expect(screen.getByText(/SCORE/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '게임 설명' })).toBeNull();
    expect(screen.queryByRole('button', { name: '결과 확인' })).toBeNull();
  });

  it('초기 상태 — 스테이지 점수 0 · 0 · 0 · 0 텍스트가 노출된다', () => {
    renderHud();
    expect(screen.getByText('0 · 0 · 0 · 0')).toBeInTheDocument();
  });

  it('Stage 1 클리어 후 해당 점수가 반영된다', () => {
    setStageScore(1, 360);
    renderHud();
    expect(screen.getByText('360 · 0 · 0 · 0')).toBeInTheDocument();
  });

  it('Info 버튼 클릭 시 InfoModal이 열린다', async () => {
    const user = userEvent.setup();
    renderHud();
    await user.click(screen.getByRole('button', { name: '게임 설명' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('LogIn 버튼 클릭 시 999점 → /ending/silhouette로 이동한다', async () => {
    setStageScore(1, 999);
    const user = userEvent.setup();
    renderHud();
    await user.click(screen.getByRole('button', { name: '결과 확인' }));
    expect(mockNavigate).toHaveBeenCalledWith('/ending/silhouette');
  });

  it('LogIn 버튼 클릭 시 1000점 → /ending/alive로 이동한다', async () => {
    setStageScore(1, 1000);
    const user = userEvent.setup();
    renderHud();
    await user.click(screen.getByRole('button', { name: '결과 확인' }));
    expect(mockNavigate).toHaveBeenCalledWith('/ending/alive');
  });
});
