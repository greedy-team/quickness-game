// /ranking — 영속 랭킹 보드.
// - 엔딩 흐름에서 진입: location.state.highlightId 로 본인 행 식별.
//   Top N 안에 들어갔으면 그 행을 강조, 밖이면 보드 아래 별도 행으로 노출.
// - 타이틀에서 직접 진입: highlightId 없음 → 보드만 표시.
// - 자동 복귀: autoReturnMs 만료 또는 Space/Enter → resetGame + navigate('/').

import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
import { getRankingEntries } from '../../ranking/rankingStore.js';
import { RANKING_CONFIG } from '../../ranking/ranking.config.js';
import './RankingPage.css';

const ADVANCE_KEYS = new Set(['Space', 'Enter']);

export default function RankingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const resetGame = useGameStore((s) => s.resetGame);

  const highlightId = location.state?.highlightId ?? null;

  // 마운트 시점 1회 스냅샷 (렌더 중 보드가 바뀔 일 없음)
  const entries = useMemo(() => getRankingEntries(), []);
  const top = entries.slice(0, RANKING_CONFIG.topN);
  const myEntry = highlightId
    ? entries.find((e) => e.id === highlightId) ?? null
    : null;
  const myRank = myEntry ? entries.findIndex((e) => e.id === highlightId) + 1 : null;
  const myInTop = myEntry ? myRank <= RANKING_CONFIG.topN : false;

  const goTitle = () => {
    resetGame();
    navigate('/');
  };

  // 자동 복귀 타이머
  useEffect(() => {
    const id = setTimeout(goTitle, RANKING_CONFIG.autoReturnMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Space/Enter → 즉시 복귀
  useEffect(() => {
    const handle = (e) => {
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        goTitle();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ranking-page">
      <h1 className="ranking-page__title">🏆 RANKING BOARD</h1>

      {top.length === 0 && (
        <p className="ranking-page__empty">아직 기록이 없습니다.</p>
      )}

      {top.length > 0 && (
        <table className="ranking-page__table">
          <thead>
            <tr>
              <th>순위</th>
              <th>닉네임</th>
              <th>점수</th>
              <th>결말</th>
            </tr>
          </thead>
          <tbody>
            {top.map((e, i) => {
              const rank = i + 1;
              const isMe = e.id === highlightId;
              return (
                <tr
                  key={e.id}
                  className={isMe ? 'ranking-page__row ranking-page__row--me' : 'ranking-page__row'}
                >
                  <td>{rank}</td>
                  <td>{e.nickname}</td>
                  <td>{e.score}</td>
                  <td>{RANKING_CONFIG.outcomeLabels[e.outcome] ?? e.outcome}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {myEntry && !myInTop && (
        <p className="ranking-page__myrow">
          내 기록: {myRank}위 — {myEntry.nickname} {myEntry.score} ({RANKING_CONFIG.outcomeLabels[myEntry.outcome] ?? myEntry.outcome})
        </p>
      )}

      <p className="ranking-page__hint">
        Space / Enter 또는 잠시 후 타이틀로 돌아갑니다.
      </p>

      <button type="button" className="ranking-page__back" onClick={goTitle}>
        처음으로
      </button>
    </div>
  );
}
