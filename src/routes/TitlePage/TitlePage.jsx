import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
import WarningModal from '../../components/WarningModal/WarningModal.jsx';
import './TitlePage.css';

const ADVANCE_KEYS = new Set(['Space', 'Enter']);

export default function TitlePage() {
  const navigate = useNavigate();
  const startGame = useGameStore((s) => s.startGame);
  const [showWarning, setShowWarning] = useState(true);

  const handleStart = () => {
    startGame();
    navigate('/hub');
  };

  useEffect(() => {
    if (showWarning) return undefined;
    const handle = (e) => {
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        handleStart();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWarning]);

  return (
    <div
      className="title-page"
      style={{ backgroundImage: 'url(/assets/images/bg_chalkboard.png)' }}
    >
      <div className="title-page__action title-page__action--start">
        <button type="button" className="title-page__btn" onClick={handleStart}>
          시작 ▶
        </button>
        <p className="sub-instruction-text">ENTER 키를 눌러 시작</p>
      </div>

      {showWarning && <WarningModal onAgree={() => setShowWarning(false)} />}
    </div>
  );
}
