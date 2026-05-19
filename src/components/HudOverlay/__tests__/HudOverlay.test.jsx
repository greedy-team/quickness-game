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

  it('/stage/:id 라우트에서 activePlayStageId가 null이면 힌트도 노출되지 않는다', () => {
    const { container } = renderHud({ path: '/stage/1' });
    expect(container.querySelector('.hud-overlay')).toBeNull();
  });

  it('/stage/:id 라우트 + activePlayStageId=1이면 우측 상단 힌트만 노출된다', () => {
    useGameStore.getState().setActivePlayStageId(1);
    const { container } = renderHud({ path: '/stage/1' });
    expect(container.querySelector('.hud-overlay')).not.toBeNull();
    expect(container.querySelector('.hud-overlay__hint')).not.toBeNull();
    expect(container.querySelector('.hud-overlay__scores')).toBeNull();
    expect(container.querySelector('.hud-overlay__actions')).toBeNull();
    expect(screen.getByText('10초가 되면 ← 키로 멈추기')).toBeInTheDocument();
  });

  it.each([
    [2, '눈 앞에 나타나는 순간 ↑키'],
    [3, '물건이 원 안에 위치한 순간 → 키'],
  ])('activePlayStageId=%i이면 해당 스테이지 힌트가 노출된다', (stageId, hint) => {
    useGameStore.getState().setActivePlayStageId(stageId);
    renderHud({ path: `/stage/${stageId}` });
    expect(screen.getByText(hint)).toBeInTheDocument();
  });

  it('activePlayStageId=4(스테이지 4)일 때 HUD hint는 노출되지 않는다', () => {
    useGameStore.getState().setActivePlayStageId(4);
    const { container } = renderHud({ path: '/stage/4' });
    expect(container.querySelector('.hud-overlay')).toBeNull();
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

  it('LogIn 버튼 클릭 시 269점 → /ending/silhouette로 이동한다', async () => {
    setStageScore(1, 269);
    const user = userEvent.setup();
    renderHud();
    await user.click(screen.getByRole('button', { name: '결과 확인' }));
    expect(mockNavigate).toHaveBeenCalledWith('/ending/silhouette');
  });

  it('LogIn 버튼 클릭 시 400점 → /ending/alive로 이동한다', async () => {
    setStageScore(1, 400);
    const user = userEvent.setup();
    renderHud();
    await user.click(screen.getByRole('button', { name: '결과 확인' }));
    expect(mockNavigate).toHaveBeenCalledWith('/ending/alive');
  });
});
