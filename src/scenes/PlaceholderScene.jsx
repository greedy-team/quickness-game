import { useEffect } from 'react';
import { useGame } from '../store/gameStore.jsx';
import './PlaceholderScene.css';

export default function PlaceholderScene({ title, description, buttonLabel = '다음으로 (Enter / Space)', onContinue }) {
  const { state } = useGame();

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onContinue?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue]);

  return (
    <div className="placeholder-scene">
      <h1 className="placeholder-title">{title}</h1>
      <p className="placeholder-desc">{description}</p>
      <p className="placeholder-score">현재 점수: {state.totalScore}점</p>
      <button type="button" className="placeholder-btn" onClick={onContinue}>{buttonLabel}</button>
    </div>
  );
}
