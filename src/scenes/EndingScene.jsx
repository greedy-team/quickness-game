import { useEffect } from 'react';
import { useGame } from '../store/gameStore.jsx';
import './PlaceholderScene.css';

export default function EndingScene() {
  const { state, dispatch } = useGame();

  const reset = () => dispatch({ type: 'RESET' });

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyR' || e.code === 'Enter') {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="placeholder-scene">
      <h1 className="placeholder-title">🏁 모험 종료</h1>
      <p className="placeholder-score">총점 {state.totalScore}점</p>
      <p className="placeholder-desc">(엔딩 등급/연출은 별도 이슈에서 구현 예정)</p>
      <button type="button" className="placeholder-btn" onClick={reset}>처음부터 (R)</button>
    </div>
  );
}
