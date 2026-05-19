// src/stages/stage4/Stage4MergeOverlay.jsx
import React from 'react';
import './Stage4MergeOverlay.css'; // 🚨 이 경로가 무조건 맞아야 합니다!

export default function Stage4MergeOverlay({ scores, onComplete }) {
  const p1 = scores?.pane1 ?? 0;
  const p2 = scores?.pane2 ?? 0;
  const p3 = scores?.pane3 ?? 0;
  const totalScore = p1 + p2 + p3;

  return (
    <div className="s4-merge-overlay">
      <div className="s4-merge-math-container">
        <div className="s4-merge-math-row">
          <span className="s4-score-item s4-score-1">{p1}</span>
          <span className="s4-math-sign s4-sign-1">+</span>
          
          <span className="s4-score-item s4-score-2">{p2}</span>
          <span className="s4-math-sign s4-sign-2">+</span>
          
          <span className="s4-score-item s4-score-3">{p3}</span>
        </div>

        <div className="s4-total-row">
          <span className="s4-math-sign equals">=</span>
          <span className="s4-total-score" data-testid="merge-total">{totalScore}</span>
        </div>
      </div>

      <div className="s4-return-btn" onClick={onComplete}>
        <span>메인 화면으로 복귀 (ENTER)</span>
      </div>
    </div>
  );
}
