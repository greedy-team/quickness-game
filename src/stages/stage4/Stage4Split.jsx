// 3분할 컨테이너 — 좌(Stage1) / 중(Stage2) / 우(Stage3) sub-stage 마운트.
// 각 sub-stage에 isRunning 신호 전파 + onResult 수집.

import Stage1Placeholder from '../stage1/Stage1Placeholder.jsx';
import Stage2Placeholder from '../stage2/Stage2Placeholder.jsx';
import Stage3Game from '../stage3/Stage3Game.jsx';
import './Stage4Split.css';

export default function Stage4Split({ isRunning, onSubResult }) {
  return (
    <div className="stage4-split">
      <div className="stage4-split__pane">
        <Stage1Placeholder
          mode="split"
          isRunning={isRunning}
          onResult={onSubResult(1)}
        />
      </div>
      <div className="stage4-split__pane">
        <Stage2Placeholder
          mode="split"
          isRunning={isRunning}
          onResult={onSubResult(2)}
        />
      </div>
      <div className="stage4-split__pane">
        <Stage3Game
          mode="split"
          isRunning={isRunning}
          onResult={onSubResult(3)}
        />
      </div>
    </div>
  );
}
