import { useState } from 'react';
import './CatchGame.css';

export default function CatchGame() {
  const [phase, setPhase] = useState('idle');

  const startGame = () => {
    setPhase('running');
  };

  return (
    <div className="catch-stage">
      <div className="catch-bg" aria-hidden="true" />
      <div className="catch-greenie" aria-hidden="true" />
      <div className="catch-circle" aria-hidden="true" />

      <div className="catch-ui-overlay">
        {phase === 'idle' && (
          <div className="catch-panel catch-panel-start">
            <h2 className="catch-title">⚔️ 장비 드롭의 시련</h2>
            <p>하늘에서 떨어지는 장비를 거치대(빨간 원) 위치에서 <b>→ 키</b>로 잡아라!</p>
            <button className="catch-btn catch-btn-primary" onClick={startGame} type="button">
              ▶ 시작 (Space)
            </button>
          </div>
        )}

        {phase === 'running' && (
          <div className="catch-hud">
            <div>장비 드롭 진행 중...</div>
          </div>
        )}
      </div>
    </div>
  );
}
