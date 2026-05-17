import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Info, LogIn } from 'lucide-react';
import { useGameStore, selectTotalScore, selectClearedCount } from '../../store.js';
import { endingOutcomeFromTotal } from '../../scoring.js';
import InfoModal from '../InfoModal/InfoModal.jsx';
import './HudOverlay.css';

const HIDDEN_ROUTES = new Set(['/', '/ranking']);

const STAGE_HINTS = {
  1: '10초가 되면 ← 키로 멈추기',
  2: '진짜 모습이 보이면 ↑ 키',
  3: '기억이 원 안에 있을 때 → 키',
  // Stage 4: 화면에 화살표가 직접 표시되므로 hint 미노출
};

export default function HudOverlay() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const total = useGameStore(selectTotalScore);
  const clearedCount = useGameStore(selectClearedCount);
  const stageResults = useGameStore((s) => s.stageResults);
  const activePlayStageId = useGameStore((s) => s.activePlayStageId);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!infoOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setInfoOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [infoOpen]);

  if (HIDDEN_ROUTES.has(pathname)) return null;

  if (pathname.startsWith('/stage/')) {
    const hint = STAGE_HINTS[activePlayStageId];
    if (!hint) return null;
    return (
      <div className="hud-overlay" aria-hidden="false">
        <div className={`hud-overlay__hint hud-overlay__hint--stage${activePlayStageId}`}>{hint}</div>
      </div>
    );
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
        <div className="hud-overlay__action-wrapper">
          <button
            type="button"
            className="hud-overlay__action-btn"
            onClick={() => navigate(`/ending/${endingOutcomeFromTotal(total)}`)}
            aria-label="결과 확인"
          >
            <LogIn size={30} />
          </button>
          {clearedCount === 4 && pathname === '/hub' && (
            <div className="hud-overlay__tooltip">
              여기를 눌러서 결과를 확인해보세요!
            </div>
          )}
        </div>
      </div>
      {infoOpen && <InfoModal onClose={() => setInfoOpen(false)} />}
    </div>
  );
}
