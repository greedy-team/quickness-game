// /ranking — 영속 랭킹 보드.
// - 마운트 시 GET /api/leader-board/quickness-game 호출.
// - 사용자 입력 없이는 자동 복귀하지 않는다.
// - Space/Enter 또는 "처음으로" 버튼 → resetGame + navigate('/').

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
import { fetchLeaderboard } from '../../api/leaderboard.js';
import './RankingPage.css';

const ADVANCE_KEYS = new Set(['Space', 'Enter']);

export default function RankingPage() {
  const navigate = useNavigate();
  const resetGame = useGameStore((s) => s.resetGame);

  // null = 로딩 중, [] = 비어있음, [...] = 데이터 있음
  const [entries, setEntries] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const goTitle = () => {
    resetGame();
    navigate('/');
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchLeaderboard();
      if (cancelled) return;
      if (result.ok) {
        setEntries(result.rankings);
      } else {
        setEntries([]);
        setErrorMessage(result.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handle = (e) => {
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        goTitle();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
    // navigate(react-router)와 resetGame(zustand selector)은 안정적 참조라 deps 생략 안전.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = entries === null;
  const hasError = Boolean(errorMessage);
  const isEmpty = !isLoading && !hasError && entries.length === 0;
  const hasRows = !isLoading && !hasError && entries.length > 0;

  return (
    <div className="ranking-page">
      <h1 className="ranking-page__headline">RANKING</h1>

      {isLoading && (
        <p className="ranking-page__status">기록을 불러오는 중…</p>
      )}

      {hasError && (
        <p className="ranking-page__status ranking-page__status--error">{errorMessage}</p>
      )}

      {isEmpty && (
        <p className="ranking-page__empty">아직 기록이 없습니다.</p>
      )}

      {hasRows && (
        <ul className="ranking-list">
          {entries.map((e) => (
            <li key={e.rank} className="ranking-list__row">
              <span className="ranking-list__rank">#{e.rank}</span>
              <span className="ranking-list__nickname">{e.nickname}</span>
              <span className="ranking-list__score">{e.score}점</span>
            </li>
          ))}
        </ul>
      )}

      <p className="ranking-page__hint">
        Space / Enter 키로 처음 화면으로 돌아갑니다.
      </p>

      <button type="button" className="ranking-page__back" onClick={goTitle}>
        처음으로
      </button>
    </div>
  );
}
