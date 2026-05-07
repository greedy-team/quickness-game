// src/ranking/rankingStore.js
// localStorage 기반 랭킹 영속화. localStorage 비활성/quota 초과 시 in-memory fallback.

import { RANKING_CONFIG } from './ranking.config.js';

const VALID_OUTCOMES = new Set(['alive', 'silhouette']);

// in-memory fallback — 같은 세션 내에서만 유효
let memoryFallback = [];
let useFallback = false;

function readRaw() {
  if (useFallback) return memoryFallback.slice();
  try {
    const raw = localStorage.getItem(RANKING_CONFIG.storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('[rankingStore] 손상된 데이터 — 빈 배열로 시작');
      return [];
    }
    return parsed;
  } catch (err) {
    console.warn('[rankingStore] 읽기 실패, in-memory fallback 사용', err);
    useFallback = true;
    return memoryFallback.slice();
  }
}

function writeRaw(entries) {
  if (useFallback) {
    memoryFallback = entries.slice();
    return;
  }
  try {
    localStorage.setItem(RANKING_CONFIG.storageKey, JSON.stringify(entries));
  } catch (err) {
    console.warn('[rankingStore] 쓰기 실패 (quota?), in-memory fallback로 전환', err);
    useFallback = true;
    memoryFallback = entries.slice();
  }
}

function generateId() {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 0x10000)
    .toString(16)
    .padStart(4, '0');
  return `${ts}-${rand}`;
}

/**
 * 새 entry 추가. 길이 재검증 + outcome 화이트리스트.
 * cap 초과 시 ts 오름차순으로 정렬 후 초과분(가장 오래된 것부터)을 잘라냄 (FIFO).
 * @returns {{id,nickname,score,outcome,ts}} 저장된 entry (id 포함)
 */
export function appendRankingEntry({ nickname, score, outcome }) {
  const trimmed = (typeof nickname === 'string' ? nickname : '').trim();
  const safeNickname = trimmed.slice(0, RANKING_CONFIG.nicknameMaxLength);
  if (safeNickname.length < RANKING_CONFIG.nicknameMinLength) {
    throw new Error('[rankingStore] nickname is empty after trim');
  }
  const safeScore = typeof score === 'number' && !Number.isNaN(score) ? score : 0;
  const safeOutcome = VALID_OUTCOMES.has(outcome) ? outcome : 'silhouette';
  const entry = {
    id: generateId(),
    nickname: safeNickname,
    score: safeScore,
    outcome: safeOutcome,
    ts: Date.now(),
  };
  const entries = readRaw();
  entries.push(entry);
  // cap 초과 → ts 오름차순 정렬 후 가장 오래된 것부터 잘라냄
  if (entries.length > RANKING_CONFIG.storageCap) {
    entries.sort((a, b) => a.ts - b.ts);
    entries.splice(0, entries.length - RANKING_CONFIG.storageCap);
  }
  writeRaw(entries);
  return entry;
}

/**
 * 정렬된 entry 배열 반환 (score desc, 동점이면 ts asc — 먼저 기록한 사람이 위).
 */
export function getRankingEntries() {
  const entries = readRaw();
  return entries.slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.ts - b.ts;
  });
}

/**
 * 운영자 전용 — 보드 비움. UI 노출 없음, 콘솔/스크립트로만 호출.
 */
export function clearRanking() {
  if (useFallback) {
    memoryFallback = [];
    return;
  }
  try {
    localStorage.removeItem(RANKING_CONFIG.storageKey);
  } catch (err) {
    console.warn('[rankingStore] clearRanking 실패', err);
  }
}
