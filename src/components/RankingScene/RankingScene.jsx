import { useState, useEffect } from 'react';
import { rankingRepository } from '../../ranking/rankingRepository';
import './RankingScene.css';

const TOP_N = 10;

function formatDate(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RankingScene({ mode, highlightedEntryId, onContinue, onBack }) {
  const [topEntries, setTopEntries] = useState(null);     // null=loading, []=empty
  const [myEntry, setMyEntry] = useState(null);
  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const top = await rankingRepository.getTopN(TOP_N);
      if (cancelled) return;
      setTopEntries(top);

      if (mode === 'after_clear' && highlightedEntryId) {
        const entry = await rankingRepository.getEntry(highlightedEntryId);
        const rank = await rankingRepository.getRankOf(highlightedEntryId);
        if (cancelled) return;
        setMyEntry(entry);
        setMyRank(rank);
      }
    })();
    return () => { cancelled = true; };
  }, [mode, highlightedEntryId]);

  // 키 입력
  useEffect(() => {
    const onKey = (e) => {
      if (mode === 'after_clear' && e.code === 'Enter') {
        e.preventDefault();
        onContinue?.();
      } else if (mode === 'readonly' && (e.code === 'Enter' || e.code === 'Escape')) {
        e.preventDefault();
        onBack?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, onContinue, onBack]);

  const isHighlighted = (id) =>
    mode === 'after_clear' && id === highlightedEntryId;
  const myInTop = myEntry && topEntries?.some((e) => e.id === myEntry.id);

  return (
    <div className="ranking-scene">
      <h1 className="ranking-title">🏆 랭킹</h1>

      {topEntries === null && <p className="ranking-loading">불러오는 중...</p>}

      {topEntries !== null && topEntries.length === 0 && (
        <p className="ranking-empty">아직 등록된 기록이 없습니다.</p>
      )}

      {topEntries !== null && topEntries.length > 0 && (
        <table className="ranking-table">
          <thead>
            <tr>
              <th>순위</th>
              <th>닉네임</th>
              <th>점수</th>
              <th>등록일시</th>
            </tr>
          </thead>
          <tbody>
            {topEntries.map((entry, i) => (
              <tr
                key={entry.id}
                className={isHighlighted(entry.id) ? 'ranking-row-highlight' : ''}
              >
                <td>{i + 1}</td>
                <td>{entry.nickname}</td>
                <td>{entry.score}</td>
                <td>{formatDate(entry.registeredAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {mode === 'after_clear' && myEntry && !myInTop && (
        <div className="ranking-my-row">
          <div className="ranking-my-row-label">내 순위</div>
          <table className="ranking-table ranking-table-my">
            <tbody>
              <tr className="ranking-row-highlight">
                <td>{myRank ?? '-'}</td>
                <td>{myEntry.nickname}</td>
                <td>{myEntry.score}</td>
                <td>{formatDate(myEntry.registeredAt)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="ranking-actions">
        {mode === 'after_clear' && (
          <button type="button" className="ranking-btn" onClick={onContinue}>
            계속하기 (Enter)
          </button>
        )}
        {mode === 'readonly' && (
          <button type="button" className="ranking-btn" onClick={onBack}>
            돌아가기 (Enter / Esc)
          </button>
        )}
      </div>
    </div>
  );
}
