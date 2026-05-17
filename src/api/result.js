// src/api/result.js
// quickness-game 결과 등록 API 클라이언트.
// - 8초 타임아웃 (AbortController)
// - throw 하지 않고 { ok, status?, message? } 반환 (호출자 분기 단순화)
// - 환경 변수 누락은 콘솔에 에러 + 사용자 친화 메시지 반환

const API_GAME_NAME = 'quickness-game';
const REQUEST_TIMEOUT_MS = 8000;

const MESSAGES = {
  env: '환경 설정 오류가 발생했습니다.',
  network: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  client: '등록에 실패했습니다. 유저 ID를 확인해주세요.',
};

export async function submitResult({ userId, score }) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const apiKey = import.meta.env.VITE_API_KEY;

  if (!baseUrl || !apiKey) {
    console.error('[result api] missing env', {
      hasBaseUrl: Boolean(baseUrl),
      hasApiKey: Boolean(apiKey),
    });
    return { ok: false, status: 0, message: MESSAGES.env };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/api/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameName: API_GAME_NAME,
        userId,
        score,
        apiKey,
      }),
      signal: controller.signal,
    });

    // 백엔드가 201 등으로 바꿔도 견고하게 동작하도록 response.ok(200-299) 전체를 성공으로 처리.
    if (response.ok) {
      return { ok: true };
    }

    let bodyMessage = null;
    try {
      const data = await response.json();
      bodyMessage = typeof data?.message === 'string' ? data.message : null;
    } catch {
      bodyMessage = null;
    }

    const fallback = response.status >= 500 ? MESSAGES.server : MESSAGES.client;
    return {
      ok: false,
      status: response.status,
      message: bodyMessage || fallback,
    };
  } catch (err) {
    if (err?.name === 'AbortError') {
      console.warn('[result api] request timed out');
    }
    return { ok: false, status: 0, message: MESSAGES.network };
  } finally {
    clearTimeout(timeoutId);
  }
}
