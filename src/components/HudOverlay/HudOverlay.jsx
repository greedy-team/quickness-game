import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useGameStore, selectTotalScore, selectClearedCount } from '../../store.js';
import { TOTAL_MAX_SCORE, ENDING_SUCCESS_CUTOFF, maxScoreForStage } from '../../scoring.js';
import ScoreTable from './ScoreTable.jsx';
import './HudOverlay.css';

const HIDDEN_ROUTES = new Set(['/', '/ranking']);

const CUTOFF_PCT = (ENDING_SUCCESS_CUTOFF / TOTAL_MAX_SCORE) * 100;

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

  if (pathname.startsWith('/stage/')) {
    return (
      <div className="hud-overlay" aria-hidden="false">
        <div className="hud-overlay__score-simple">SCORE {total}</div>
      </div>
    );
  }

  const fillPct = Math.min(100, (total / TOTAL_MAX_SCORE) * 100);
  const isAlive = total >= ENDING_SUCCESS_CUTOFF;
  const fillClass = isAlive
    ? 'hud-overlay__bar-fill hud-overlay__bar-fill--alive'
    : 'hud-overlay__bar-fill';

  return (
    <div className="hud-overlay" aria-hidden="false">
      <button
        type="button"
        className="hud-overlay__score"
        onClick={() => setTableOpen((v) => !v)}
        aria-label={`점수 기준 보기 — 현재 ${total}점, 목표 ${ENDING_SUCCESS_CUTOFF}점 ${isAlive ? '통과' : '미도달'}`}
      >
        <span className="hud-overlay__score-line">
          SCORE {total}
          <span className="hud-overlay__score-max"> / {TOTAL_MAX_SCORE}</span>
        </span>
        <span className="hud-overlay__bar" role="presentation">
          <span className={fillClass} style={{ width: `${fillPct}%` }} />
          <span className="hud-overlay__bar-tick" style={{ left: `${CUTOFF_PCT}%` }} />
          <span className="hud-overlay__bar-tick-label" style={{ left: `${CUTOFF_PCT}%` }}>
            생존선 {ENDING_SUCCESS_CUTOFF}
          </span>
        </span>
        <span className="hud-overlay__weights" aria-label="스테이지별 만점 가중치">
          S1·2 {maxScoreForStage(1)}
          {' · '}S3 {maxScoreForStage(3)}
          {' · '}S4 {maxScoreForStage(4)}
          <span className="hud-overlay__weights-boost"> ⚡</span>
        </span>
      </button>
      <div className="hud-overlay__progress">{cleared} / 4</div>
      {tableOpen && <ScoreTable onClose={() => setTableOpen(false)} />}
    </div>
  );
}
