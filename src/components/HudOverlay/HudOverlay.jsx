import { useLocation } from 'react-router-dom';
import { useGameStore, selectTotalScore, selectClearedCount } from '../../store.js';
import './HudOverlay.css';

const HIDDEN_ROUTES = new Set(['/', '/ranking']);

export default function HudOverlay() {
  const { pathname } = useLocation();
  const total = useGameStore(selectTotalScore);
  const cleared = useGameStore(selectClearedCount);

  if (HIDDEN_ROUTES.has(pathname)) return null;

  return (
    <div className="hud-overlay" aria-hidden="false">
      <div className="hud-overlay__score">SCORE {total}</div>
      <div className="hud-overlay__progress">{cleared} / 4</div>
    </div>
  );
}
