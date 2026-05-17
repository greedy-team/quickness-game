import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RankingPage from '../RankingPage.jsx';
import * as leaderboardApi from '../../../api/leaderboard.js';
import * as usersApi from '../../../api/users.js';
import { useGameStore } from '../../../store.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage({ state } = {}) {
  const entry = state
    ? [{ pathname: '/ranking', state }]
    : ['/ranking'];
  return render(
    <MemoryRouter initialEntries={entry}>
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
    vi.useRealTimers();
    useGameStore.getState().resetGame();
  });

  it('마운트 직후 로딩 상태를 표시한다', () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/불러오는 중/)).toBeInTheDocument();
  });

  it('로딩 중에도 Space 키 입력 시 / 로 이동한다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/불러오는 중/)).toBeInTheDocument();
    await userEvent.keyboard('[Space]');
    expect(mockNavigate).toHaveBeenCalledWith('/');
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
    expect(screen.getByText('500점')).toBeInTheDocument();
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
  });

  it('"처음으로" 버튼 클릭 시 / 로 이동한다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({ ok: true, rankings: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/아직 기록이 없습니다/)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /처음으로/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('state.nickname + state.score가 매칭되면 해당 행에 --current 클래스가 붙는다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: true,
      rankings: [
        { rank: 1, nickname: '에이스', score: 500 },
        { rank: 2, nickname: '베타', score: 450 },
        { rank: 3, nickname: '나', score: 420 },
      ],
    });
    renderPage({ state: { nickname: '나', score: 420 } });

    const myRow = (await screen.findByText('나')).closest('li');
    expect(myRow).not.toBeNull();
    expect(myRow).toHaveClass('ranking-list__row--current');

    const otherRow = screen.getByText('에이스').closest('li');
    expect(otherRow).not.toHaveClass('ranking-list__row--current');
  });

  it('state가 없으면 어떤 행에도 --current 클래스가 없다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: true,
      rankings: [
        { rank: 1, nickname: '에이스', score: 500 },
      ],
    });
    renderPage();

    const row = (await screen.findByText('에이스')).closest('li');
    expect(row).not.toHaveClass('ranking-list__row--current');
  });

  it('nickname만 일치하고 score가 다르면 강조하지 않는다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: true,
      rankings: [
        { rank: 1, nickname: '나', score: 999 },
      ],
    });
    renderPage({ state: { nickname: '나', score: 420 } });

    const row = (await screen.findByText('나')).closest('li');
    expect(row).not.toHaveClass('ranking-list__row--current');
  });

  it('input에 userId 입력 + Enter → 매칭 행에 --current 클래스가 붙는다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: true,
      rankings: [
        { rank: 1, nickname: '에이스', score: 500 },
        { rank: 2, nickname: '찾는사람', score: 420 },
      ],
    });
    vi.spyOn(usersApi, 'getUserById').mockResolvedValue({
      ok: true,
      user: { userId: 'ABCD1234', nickname: '찾는사람', phone: '00000000' },
    });

    renderPage();
    await screen.findByText('에이스');

    const input = screen.getByPlaceholderText(/유저 ID로 내 행 찾기/);
    await userEvent.type(input, 'ABCD1234');
    await userEvent.keyboard('[Enter]');

    await waitFor(() => {
      const row = screen.getByText('찾는사람').closest('li');
      expect(row).toHaveClass('ranking-list__row--current');
    });

    const otherRow = screen.getByText('에이스').closest('li');
    expect(otherRow).not.toHaveClass('ranking-list__row--current');

    expect(screen.queryByText(/찾을 수 없습니다/)).toBeNull();
    expect(screen.queryByText(/탑5에 기록이 없습니다/)).toBeNull();
  });

  it('404 응답 시 "ID를 찾을 수 없습니다" 메시지 표시, 강조 없음', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: true,
      rankings: [{ rank: 1, nickname: '에이스', score: 500 }],
    });
    vi.spyOn(usersApi, 'getUserById').mockResolvedValue({
      ok: false,
      status: 404,
      message: '유저 정보를 가져오지 못했습니다.',
    });

    renderPage();
    await screen.findByText('에이스');

    const input = screen.getByPlaceholderText(/유저 ID로 내 행 찾기/);
    await userEvent.type(input, 'NONE');
    await userEvent.keyboard('[Enter]');

    expect(await screen.findByText('ID를 찾을 수 없습니다')).toBeInTheDocument();
    const row = screen.getByText('에이스').closest('li');
    expect(row).not.toHaveClass('ranking-list__row--current');
  });

  it('닉네임이 탑5 밖이면 "탑5에 기록이 없습니다" 메시지 표시', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: true,
      rankings: [{ rank: 1, nickname: '에이스', score: 500 }],
    });
    vi.spyOn(usersApi, 'getUserById').mockResolvedValue({
      ok: true,
      user: { userId: 'XYZ', nickname: '없는사람', phone: '11111111' },
    });

    renderPage();
    await screen.findByText('에이스');

    const input = screen.getByPlaceholderText(/유저 ID로 내 행 찾기/);
    await userEvent.type(input, 'XYZ');
    await userEvent.keyboard('[Enter]');

    expect(await screen.findByText('탑5에 기록이 없습니다')).toBeInTheDocument();
    const row = screen.getByText('에이스').closest('li');
    expect(row).not.toHaveClass('ranking-list__row--current');
  });

  it('input을 비우고 Enter 시 강조가 해제된다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: true,
      rankings: [{ rank: 1, nickname: '찾는사람', score: 420 }],
    });
    vi.spyOn(usersApi, 'getUserById').mockResolvedValue({
      ok: true,
      user: { userId: 'ABCD', nickname: '찾는사람', phone: '00000000' },
    });

    renderPage();
    await screen.findByText('찾는사람');

    const input = screen.getByPlaceholderText(/유저 ID로 내 행 찾기/);
    await userEvent.type(input, 'ABCD');
    await userEvent.keyboard('[Enter]');

    await waitFor(() => {
      const row = screen.getByText('찾는사람').closest('li');
      expect(row).toHaveClass('ranking-list__row--current');
    });

    await userEvent.clear(input);
    await userEvent.keyboard('[Enter]');

    await waitFor(() => {
      const row = screen.getByText('찾는사람').closest('li');
      expect(row).not.toHaveClass('ranking-list__row--current');
    });
  });
});
