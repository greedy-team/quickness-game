import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
import WarningModal from '../../components/WarningModal/WarningModal.jsx';
import './TitlePage.css';

export default function TitlePage() {
  const navigate = useNavigate();
  const startGame = useGameStore((s) => s.startGame);
  const [showWarning, setShowWarning] = useState(true);

  const handleStart = () => {
    startGame();
    navigate('/hub');
  };

  const handleOpenRanking = () => {
    navigate('/ranking');
  };

  return (
    <div
      className="title-page"
      style={{ backgroundImage: 'url(/assets/images/bg_chalkboard.png)' }}
    >
      <div className="title-page__action title-page__action--start">
        <button type="button" className="title-page__btn" onClick={handleStart}>
          시작 ▶
        </button>
      </div>

      <div className="title-page__action title-page__action--ranking">
        <button type="button" className="title-page__btn" onClick={handleOpenRanking}>
          🏆 랭킹 보기
        </button>
      </div>

      {showWarning && <WarningModal onAgree={() => setShowWarning(false)} />}
    </div>
  );
}
