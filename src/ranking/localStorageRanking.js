// src/ranking/localStorageRanking.js
// LocalStorage 기반 랭킹 어댑터.
// 인터페이스: register / getTopN / getRankOf / getEntry
// 모두 Promise 반환 — 백엔드 어댑터와 시그니처 호환.

const STORAGE_KEY = 'quickness-game.ranking.v1';

let memoryFallback = null; // localStorage 접근 실패 시 사용

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readRaw() {
  if (memoryFallback) return memoryFallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.entries)) return { entries: [] };
    return parsed;
  } catch (e) {
    console.warn('[ranking] localStorage 읽기 실패 → 메모리 fallback 사용', e);
    if (!memoryFallback) memoryFallback = { entries: [] };
    return memoryFallback;
  }
}

function writeRaw(data) {
  if (memoryFallback) {
    memoryFallback = data;
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[ranking] localStorage 쓰기 실패 → 메모리 fallback 전환', e);
    memoryFallback = data;
  }
}

function sortEntries(entries) {
  // score desc, registeredAt asc
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.registeredAt - b.registeredAt;
  });
}

export const localStorageRanking = {
  async register({ nickname, score }) {
    const entry = {
      id: generateId(),
      nickname,
      score,
      registeredAt: Date.now(),
    };
    const data = readRaw();
    const next = { entries: [...data.entries, entry] };
    writeRaw(next);
    return entry;
  },

  async getTopN(n = 10) {
    const { entries } = readRaw();
    return sortEntries(entries).slice(0, n);
  },

  async getRankOf(entryId) {
    const { entries } = readRaw();
    const sorted = sortEntries(entries);
    const idx = sorted.findIndex((e) => e.id === entryId);
    return idx === -1 ? null : idx + 1;
  },

  async getEntry(entryId) {
    const { entries } = readRaw();
    return entries.find((e) => e.id === entryId) ?? null;
  },

  // 테스트/리셋용 (DEV에서만 사용)
  __reset() {
    memoryFallback = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
  },
};

if (import.meta.env?.DEV) {
  (async () => {
    const repo = localStorageRanking;
    repo.__reset();

    // 빈 상태
    console.assert((await repo.getTopN()).length === 0, 'ranking: 빈 상태 getTopN');
    console.assert((await repo.getRankOf('none')) === null, 'ranking: 없는 id rank null');

    // 등록 + 정렬
    const e1 = await repo.register({ nickname: 'A', score: 100 });
    await new Promise((r) => setTimeout(r, 2));
    const e2 = await repo.register({ nickname: 'B', score: 200 });
    await new Promise((r) => setTimeout(r, 2));
    const e3 = await repo.register({ nickname: 'C', score: 200 }); // 동률, 늦게 등록

    const top = await repo.getTopN();
    console.assert(top.length === 3, 'ranking: 3 entries');
    console.assert(top[0].id === e2.id, 'ranking: 200점 먼저 등록한 B가 1위');
    console.assert(top[1].id === e3.id, 'ranking: 200점 동률, 등록 빠른 순으로 C가 2위');
    console.assert(top[2].id === e1.id, 'ranking: 100점 A가 3위');

    console.assert((await repo.getRankOf(e2.id)) === 1, 'ranking: B rank=1');
    console.assert((await repo.getRankOf(e3.id)) === 2, 'ranking: C rank=2');
    console.assert((await repo.getRankOf(e1.id)) === 3, 'ranking: A rank=3');

    const got = await repo.getEntry(e1.id);
    console.assert(got && got.nickname === 'A' && got.score === 100, 'ranking: getEntry');

    // getTopN(2) 제한
    const top2 = await repo.getTopN(2);
    console.assert(top2.length === 2 && top2[0].id === e2.id, 'ranking: getTopN(2)');

    repo.__reset();
    console.assert((await repo.getTopN()).length === 0, 'ranking: __reset 후 빈 상태');
  })();
}
