import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchLeaderboard } from './leaderboard.js';

describe('fetchLeaderboard', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('200 응답 시 ok:true + rankings 배열 반환', async () => {
    const rankings = [
      { rank: 1, nickname: 'AAA', score: 500 },
      { rank: 2, nickname: 'BBB', score: 420 },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ gameName: 'quickness-game', unit: '점', rankings }),
        { status: 200 },
      ),
    ));

    const result = await fetchLeaderboard();

    expect(result).toEqual({ ok: true, rankings });
  });

  it('요청 URL과 메서드 검증', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ rankings: [] }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchLeaderboard();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/api/leader-board/quickness-game');
    expect(init?.method ?? 'GET').toBe('GET');
  });

  it('200 + rankings 누락 → ok:true + 빈 배열', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ gameName: 'quickness-game', unit: '점' }), { status: 200 }),
    ));

    const result = await fetchLeaderboard();

    expect(result).toEqual({ ok: true, rankings: [] });
  });

  it('4xx → ok:false + 4xx 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 404 }),
    ));

    const result = await fetchLeaderboard();

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.message).toBe('기록을 불러오지 못했습니다.');
  });

  it('5xx → 서버 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 503 }),
    ));

    const result = await fetchLeaderboard();

    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(result.message).toBe('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('fetch reject → 네트워크 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const result = await fetchLeaderboard();

    expect(result.ok).toBe(false);
    expect(result.message).toBe('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('AbortError(타임아웃) → 네트워크 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    }));

    const result = await fetchLeaderboard();

    expect(result.ok).toBe(false);
    expect(result.message).toBe('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('VITE_API_BASE_URL 누락 → ok:false + 환경 설정 오류', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await fetchLeaderboard();

    expect(result.ok).toBe(false);
    expect(result.message).toBe('환경 설정 오류가 발생했습니다.');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
