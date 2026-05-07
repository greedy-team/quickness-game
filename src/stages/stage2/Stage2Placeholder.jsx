// src/stages/stage2/Stage2Placeholder.jsx
import { useEffect, useState } from 'react';
import './Stage2Placeholder.css';

const PLACEHOLDER_DURATION_SEC = 10;

export default function Stage2Placeholder({ mode = 'split', isRunning, onResult }) {
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
        onResult(0.5);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isRunning, onResult]);

  return (
    <div className={`stage2-placeholder stage2-placeholder--${mode}`}>
      <div className="stage2-placeholder__icon">↑</div>
      <div className="stage2-placeholder__title">Stage 2</div>
      <div className="stage2-placeholder__note">팀원 작업 대기 중</div>
      <div className="stage2-placeholder__bar">
        <div
          className="stage2-placeholder__bar-fill"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
