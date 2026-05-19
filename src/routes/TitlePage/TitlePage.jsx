import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
import './TitlePage.css';

const ADVANCE_KEYS = new Set(['Space', 'Enter']);

export default function TitlePage() {
  const navigate = useNavigate();
  const startGame = useGameStore((s) => s.startGame);

  const handleStart = () => {
    startGame();
    navigate('/hub');
  };

  useEffect(() => {
    const handle = (e) => {
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        handleStart();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="title-page"
      style={{ backgroundImage: 'url(/assets/images/bg_chalkboard.webp)' }}
    >
      <div className="title-page__action title-page__action--start">
        <p className="sub-instruction-text" style={{ cursor: 'pointer' }} onClick={handleStart}>
          ENTER 키를 눌러 시작
        </p>
      </div>
    </div>
  );
}
