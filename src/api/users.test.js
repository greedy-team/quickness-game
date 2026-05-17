import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getUserById } from './users.js';

describe('getUserById', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('200 응답 시 ok:true + user 객체 반환', async () => {
    const user = { userId: 'ABCD1234', nickname: '에이스', phone: '12345678' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(user), { status: 200 }),
    ));
    const result = await getUserById('ABCD1234');
    expect(result).toEqual({ ok: true, user });
  });

  it('요청 URL과 메서드 검증', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ userId: 'X', nickname: 'Y' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await getUserById('XYZ');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/api/users/XYZ');
    expect(init?.method ?? 'GET').toBe('GET');
  });

  it('200 + body 파싱 실패 → ok:true + user:null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('not-json', { status: 200 }),
    ));
    const result = await getUserById('AAA');
    expect(result).toEqual({ ok: true, user: null });
  });

  it('4xx → ok:false + 4xx 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 404 }),
    ));
    const result = await getUserById('NONE');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.message).toBe('유저 정보를 가져오지 못했습니다.');
  });

  it('5xx → 서버 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 503 }),
    ));
    const result = await getUserById('AAA');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(result.message).toBe('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('fetch reject → 네트워크 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const result = await getUserById('AAA');
    expect(result.ok).toBe(false);
    expect(result.message).toBe('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('AbortError(타임아웃) → 네트워크 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    }));
    const result = await getUserById('AAA');
    expect(result.ok).toBe(false);
    expect(result.message).toBe('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('VITE_API_BASE_URL 누락 → ok:false + 환경 설정 오류', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await getUserById('AAA');
    expect(result.ok).toBe(false);
    expect(result.message).toBe('환경 설정 오류가 발생했습니다.');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
