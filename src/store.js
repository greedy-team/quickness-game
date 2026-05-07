// src/store.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { scoreFromMetric, endingOutcomeFromTotal } from './scoring.js';

const initialState = {
  // 4개 스테이지 결과 — 단일 진실 공급원
  // 각 항목: null | { metric: number, score: number }
  stageResults: {
    1: null,
    2: null,
    3: null,
    4: null,
  },
  // 사용자가 타이틀에서 "시작"을 눌렀는가 (BGM autoplay 게이트 + 게임 진행 여부)
  hasUserStarted: false,
};

export const useGameStore = create(
  devtools(
    (set) => ({
      ...initialState,

      startGame: () =>
        set({ hasUserStarted: true }, false, 'startGame'),

      recordResult: (stageId, metric) =>
        set(
          (s) => ({
            stageResults: {
              ...s.stageResults,
              [stageId]: { metric, score: scoreFromMetric(stageId, metric) },
            },
          }),
          false,
          'recordResult',
        ),

      clearStageResult: (stageId) =>
        set(
          (s) => ({
            stageResults: { ...s.stageResults, [stageId]: null },
          }),
          false,
          'clearStageResult',
        ),

      resetGame: () =>
        set({ ...initialState }, false, 'resetGame'),
    }),
    { name: 'gameStore' },
  ),
);

// ───── Selectors (같은 파일 export) ─────

export const selectTotalScore = (s) =>
  Object.values(s.stageResults).reduce((acc, r) => acc + (r?.score ?? 0), 0);

/**
 * 스테이지 n이 클리어되었는지 반환하는 selector를 만든다 (curried factory).
 * NOTE: useGameStore(selectIsStageCleared(n)) 처럼 인라인 호출하면 매 렌더마다
 * 새 selector 함수가 만들어지므로, 컴포넌트에서 반복 사용 시 useMemo로 감싸거나
 * stageResults를 직접 구독한 뒤 로컬에서 파생하는 것을 권장.
 */
export const selectIsStageCleared = (n) => (s) =>
  s.stageResults[n] !== null;

export const selectIsDoor4Unlocked = (s) =>
  [1, 2, 3].every((n) => s.stageResults[n] !== null);

export const selectClearedCount = (s) =>
  [1, 2, 3, 4].reduce((acc, n) => acc + (s.stageResults[n] !== null ? 1 : 0), 0);

/**
 * 누적 점수 → 엔딩 outcome ('alive' | 'silhouette') selector.
 * EndingPage가 진입 시 한 번 평가하여 컷씬을 결정한다.
 */
export const selectEndingOutcome = (s) =>
  endingOutcomeFromTotal(selectTotalScore(s));
