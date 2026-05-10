import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useGameStore, selectTotalScore, selectClearedCount } from '../../store.js';
import ScoreTable from './ScoreTable.jsx';
import './HudOverlay.css';

const HIDDEN_ROUTES = new Set(['/', '/ranking']);

export default function HudOverlay() {
  const { pathname } = useLocation();
  const total = useGameStore(selectTotalScore);
  const cleared = useGameStore(selectClearedCount);
  const [tableOpen, setTableOpen] = useState(false);

  useEffect(() => {
    if (!tableOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setTableOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tableOpen]);

  if (HIDDEN_ROUTES.has(pathname)) return null;

  return (
    <div className="hud-overlay" aria-hidden="false">
      <button
        type="button"
        className="hud-overlay__score"
        onClick={() => setTableOpen((v) => !v)}
        aria-label="점수 기준 보기"
      >
        SCORE {total}
      </button>
      <div className="hud-overlay__progress">{cleared} / 4</div>
      {tableOpen && <ScoreTable onClose={() => setTableOpen(false)} />}
    </div>
  );
}
