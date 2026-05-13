import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Info, LogIn } from 'lucide-react';
import { useGameStore, selectTotalScore } from '../../store.js';
import { endingOutcomeFromTotal } from '../../scoring.js';
import InfoModal from '../InfoModal/InfoModal.jsx';
import './HudOverlay.css';

const HIDDEN_ROUTES = new Set(['/', '/ranking']);

export default function HudOverlay() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const total = useGameStore(selectTotalScore);
  const stageResults = useGameStore((s) => s.stageResults);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!infoOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setInfoOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [infoOpen]);

  if (HIDDEN_ROUTES.has(pathname)) return null;

  if (pathname.startsWith('/stage/')) {
    return null;
  }

  const scoreText = [1, 2, 3, 4]
    .map((n) => stageResults[n]?.score ?? 0)
    .join(' · ');

  return (
    <div className="hud-overlay" aria-hidden="false">
      <div className="hud-overlay__scores">{scoreText}</div>
      <div className="hud-overlay__actions">
        <button
          type="button"
          className="hud-overlay__action-btn"
          onClick={() => setInfoOpen(true)}
          aria-label="게임 설명"
        >
          <Info size={30} />
        </button>
        <button
          type="button"
          className="hud-overlay__action-btn"
          onClick={() => navigate(`/ending/${endingOutcomeFromTotal(total)}`)}
          aria-label="결과 확인"
        >
          <LogIn size={30} />
        </button>
      </div>
      {infoOpen && <InfoModal onClose={() => setInfoOpen(false)} />}
    </div>
  );
}
