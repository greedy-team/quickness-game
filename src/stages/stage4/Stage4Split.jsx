// src/routes/stage4/Stage4Split.jsx

import React from 'react';
import Stage4TimerPane from './Stage4TimerPane.jsx'; 
import Stage2Placeholder from '../stage2/Stage2Placeholder.jsx';
import Stage3Game from '../stage3/Stage3Game.jsx';
import './Stage4Split.css';

export default function Stage4Split({ isRunning, onSubResult }) {
  return (
    <div className="stage4-split">

      {/* ── 1. 맨 왼쪽 Pane: 타이머 영역 ── */}
      <div className="stage4-split__pane pane-left">
        <div className="stage4-pane-hint">←</div>
        <Stage4TimerPane
          isRunning={isRunning}
          onResult={onSubResult[1]}
        />
      </div>

      {/* ── 2. 중앙 Pane: 카메라 게임 (도서관) ── */}
      <div className="stage4-split__pane pane-center">
        <div className="stage4-pane-hint">↑</div>
        <Stage2Placeholder
          mode="split"
          isRunning={isRunning}
          onResult={onSubResult[2]}
        />
      </div>

      {/* ── 3. 오른쪽 Pane: 가로 캐치 (리듬 게임) ── */}
      <div className="stage4-split__pane pane-right">
        <div className="stage4-pane-hint">→</div>
        <Stage3Game
          mode="split"
          isRunning={isRunning}
          onResult={onSubResult[3]}
        />
      </div>

    </div>
  );
}
