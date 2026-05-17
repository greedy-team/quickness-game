import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RankingPage from '../RankingPage.jsx';
import * as leaderboardApi from '../../../api/leaderboard.js';
import { useGameStore } from '../../../store.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/ranking']}>
      <RankingPage />
    </MemoryRouter>,
  );
}

describe('RankingPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    useGameStore.getState().resetGame();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useGameStore.getState().resetGame();
  });

  it('마운트 직후 로딩 상태를 표시한다', () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/불러오는 중/)).toBeInTheDocument();
  });

  it('정상 응답 시 표에 기록을 렌더한다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: true,
      rankings: [
        { rank: 1, nickname: 'AAA', score: 500 },
        { rank: 2, nickname: 'BBB', score: 420 },
      ],
    });
    renderPage();
    expect(await screen.findByText('AAA')).toBeInTheDocument();
    expect(screen.getByText('BBB')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('빈 응답 시 "아직 기록이 없습니다." 표시', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({ ok: true, rankings: [] });
    renderPage();
    expect(await screen.findByText(/아직 기록이 없습니다/)).toBeInTheDocument();
  });

  it('에러 응답 시 에러 메시지를 표시', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: false,
      status: 503,
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
    renderPage();
    expect(await screen.findByText(/서버 오류가 발생했습니다/)).toBeInTheDocument();
  });

  it('Space 키 입력 시 / 로 이동한다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({ ok: true, rankings: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/아직 기록이 없습니다/)).toBeInTheDocument());
    await userEvent.keyboard('[Space]');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('Enter 키 입력 시 / 로 이동한다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({ ok: true, rankings: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/아직 기록이 없습니다/)).toBeInTheDocument());
    await userEvent.keyboard('[Enter]');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('키 입력 없이 시간이 흘러도 자동으로 이동하지 않는다', async () => {
    vi.useFakeTimers();
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({ ok: true, rankings: [] });
    renderPage();
    await vi.advanceTimersByTimeAsync(60000);
    expect(mockNavigate).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('"처음으로" 버튼 클릭 시 / 로 이동한다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({ ok: true, rankings: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/아직 기록이 없습니다/)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /처음으로/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
