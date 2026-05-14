// 1초 합체 연출 골격 — 3 panes fade + scale + center 모임.
// 부모(Stage4Host)가 active 동안만 마운트, 1초 후 unmount.
// TODO(post-skeleton): 거울 균열 SVG, "진짜만 남음" 텍스트, 충격음 등 후속 폴리싱.

import React from 'react';
import './Stage4MergeOverlay.css';

export default function Stage4MergeOverlay({ scores }) {
  const p1 = scores?.pane1 ?? 0;
  const p2 = scores?.pane2 ?? 0;
  const p3 = scores?.pane3 ?? 0;
  const total = p1 + p2 + p3;

  return (
    <div className="stage4-merge-overlay" aria-hidden="true">
      <div className="merge-content">
        <div className="merge-scores">
          <span className="merge-score merge-score--1">{p1}</span>
          <span className="merge-op merge-op--1">+</span>
          <span className="merge-score merge-score--2">{p2}</span>
          <span className="merge-op merge-op--2">+</span>
          <span className="merge-score merge-score--3">{p3}</span>
        </div>
        <div className="merge-result">
          <span className="merge-eq">=</span>
          <span className="merge-total" data-testid="merge-total">{total}</span>
        </div>
      </div>
    </div>
  );
}
