// src/scenes/IntroScene.jsx
import { useEffect } from 'react';
import { useGame } from '../store/gameStore.jsx';
import './IntroScene.css';

export default function IntroScene() {
  const { dispatch } = useGame();

  const start = () => {
    dispatch({ type: 'SET_WORLD_STAGE', payload: 0 });
    dispatch({ type: 'GO_TO_SCENE', payload: 'world' });
  };

  const openRanking = () => {
    dispatch({ type: 'GO_TO_RANKING', payload: 'readonly' });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="intro-scene">
      <h1 className="intro-title">용사 그린이의 대모험</h1>
      <p className="intro-story">
        평화롭던 그린 왕국에 어둠의 군주가 나타나 성을 점령했다.<br />
        우리의 그린이는 아직 약하지만, 훈련을 통해 점점 강해질 수 있다.
      </p>
      <button type="button" className="intro-start-btn" onClick={start}>▶ 시작 (Space)</button>
      <button type="button" className="intro-ranking-btn" onClick={openRanking}>🏆 랭킹 보기</button>
      <p className="intro-hint">← → 이동 / Space 시작·진입</p>
    </div>
  );
}
