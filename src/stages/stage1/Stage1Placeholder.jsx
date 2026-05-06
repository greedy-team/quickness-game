// src/stages/stage1/Stage1Placeholder.jsx
// 팀원 작업 도착 전 임시 컴포넌트. split 모드 전용.

import { useEffect, useState } from 'react';
import './Stage1Placeholder.css';

const PLACEHOLDER_DURATION_SEC = 10;

export default function Stage1Placeholder({ mode = 'split', isRunning, onResult }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const start = performance.now();
    let raf;
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const p = Math.min(1, elapsed / PLACEHOLDER_DURATION_SEC);
      setProgress(p);
      if (p >= 1) {
        onResult(0.5); // 중간 점수
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isRunning, onResult]);

  return (
    <div className={`stage1-placeholder stage1-placeholder--${mode}`}>
      <div className="stage1-placeholder__icon">←</div>
      <div className="stage1-placeholder__title">Stage 1</div>
      <div className="stage1-placeholder__note">팀원 작업 대기 중</div>
      <div className="stage1-placeholder__bar">
        <div
          className="stage1-placeholder__bar-fill"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
