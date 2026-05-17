// src/api/leaderboard.js
// quickness-game 리더보드 조회 API 클라이언트.
// - 8초 타임아웃 (AbortController)
// - throw 하지 않고 { ok, status?, message? } 반환
// - 환경 변수 누락은 콘솔에 에러 + 사용자 친화 메시지 반환

const API_GAME_NAME = 'quickness-game';
const REQUEST_TIMEOUT_MS = 8000;

const MESSAGES = {
  env: '환경 설정 오류가 발생했습니다.',
  network: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  client: '기록을 불러오지 못했습니다.',
};

export async function fetchLeaderboard() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!baseUrl) {
    console.error('[leaderboard api] missing env', { hasBaseUrl: Boolean(baseUrl) });
    return { ok: false, status: 0, message: MESSAGES.env };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${baseUrl}/api/leader-board/${API_GAME_NAME}`,
      { method: 'GET', signal: controller.signal },
    );

    if (response.ok) {
      let rankings = [];
      try {
        const data = await response.json();
        rankings = Array.isArray(data?.rankings) ? data.rankings : [];
      } catch {
        rankings = [];
      }
      return { ok: true, rankings };
    }

    const fallback = response.status >= 500 ? MESSAGES.server : MESSAGES.client;
    return { ok: false, status: response.status, message: fallback };
  } catch (err) {
    if (err?.name === 'AbortError') {
      console.warn('[leaderboard api] request timed out');
    }
    return { ok: false, status: 0, message: MESSAGES.network };
  } finally {
    clearTimeout(timeoutId);
  }
}
