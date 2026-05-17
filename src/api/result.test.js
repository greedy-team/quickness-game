// src/api/result.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { submitResult } from './result.js';

describe('submitResult', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    vi.stubEnv('VITE_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('200 응답 시 ok:true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'OK' }), { status: 200 }),
    ));

    const result = await submitResult({ userId: 'AAAA', score: 420 });

    expect(result).toEqual({ ok: true });
  });

  it('요청 페이로드에 gameName/userId/score/apiKey 포함', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await submitResult({ userId: 'BBBB', score: 350 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/api/result');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({
      gameName: 'quickness-game',
      userId: 'BBBB',
      score: 350,
      apiKey: 'test-key',
    });
  });

  it('4xx + body message → 해당 메시지 전달', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: '존재하지 않는 유저입니다.' }), { status: 404 }),
    ));

    const result = await submitResult({ userId: 'ZZZZ', score: 100 });

    expect(result).toEqual({
      ok: false,
      status: 404,
      message: '존재하지 않는 유저입니다.',
    });
  });

  it('4xx + body 없음 → 기본 4xx 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 400 }),
    ));

    const result = await submitResult({ userId: 'AAAA', score: 100 });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('등록에 실패했습니다. 유저 ID를 확인해주세요.');
  });

  it('5xx → 서버 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 503 }),
    ));

    const result = await submitResult({ userId: 'AAAA', score: 100 });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(result.message).toBe('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('fetch reject → 네트워크 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const result = await submitResult({ userId: 'AAAA', score: 100 });

    expect(result.ok).toBe(false);
    expect(result.message).toBe('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('AbortError(타임아웃) → 네트워크 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    }));

    const result = await submitResult({ userId: 'AAAA', score: 100 });

    expect(result.ok).toBe(false);
    expect(result.message).toBe('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('VITE_API_BASE_URL 누락 → ok:false + 환경 설정 오류', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await submitResult({ userId: 'AAAA', score: 100 });

    expect(result.ok).toBe(false);
    expect(result.message).toBe('환경 설정 오류가 발생했습니다.');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('VITE_API_KEY 누락 → ok:false + 환경 설정 오류', async () => {
    vi.stubEnv('VITE_API_KEY', '');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await submitResult({ userId: 'AAAA', score: 100 });

    expect(result.ok).toBe(false);
    expect(result.message).toBe('환경 설정 오류가 발생했습니다.');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
