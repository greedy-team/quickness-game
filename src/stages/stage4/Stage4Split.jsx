// 3분할 컨테이너 — 좌(Stage1) / 중(Stage2) / 우(Stage3) sub-stage 마운트.
// 각 sub-stage에 isRunning 신호 전파 + onResult 수집.
//
// onSubResult는 { 1: fn, 2: fn, 3: fn } 형태의 안정적인 객체 (Stage4Host.useMemo).
// 함수 호출(`onSubResult(1)`)이 아닌 인덱스 접근(`onSubResult[1]`)이라 매 렌더마다
// 새 함수가 만들어지지 않음 → sub-stage useEffect 안정성 보장.

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
          onResult={onSubResult[1]}
        />
      </div>
      <div className="stage4-split__pane">
        <Stage2Placeholder
          mode="split"
          isRunning={isRunning}
          onResult={onSubResult[2]}
        />
      </div>
      <div className="stage4-split__pane">
        <Stage3Game
          mode="split"
          isRunning={isRunning}
          onResult={onSubResult[3]}
        />
      </div>
    </div>
  );
}
