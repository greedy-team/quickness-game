// Stage 3 entry — sub-stage contract 진입점.
// state machine: idle → running → done
// standalone: 본인 인트로 + Space listen / split: isRunning prop 신호

import { useEffect, useState } from 'react';
import Stage3Intro from './Stage3Intro.jsx';
import Stage3Field from './Stage3Field.jsx';
import './Stage3Game.css';

export default function Stage3Game({ mode = 'standalone', isRunning, onResult }) {
  // local phase: 'idle' | 'running' | 'done'
  const [phase, setPhase] = useState('idle');

  // standalone: Space 키로 self-trigger
  useEffect(() => {
    if (mode !== 'standalone') return;
    if (phase !== 'idle') return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setPhase('running');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, phase]);

  // split: isRunning prop watch
  useEffect(() => {
    if (mode !== 'split') return;
    if (isRunning && phase === 'idle') setPhase('running');
  }, [mode, isRunning, phase]);

  const handleFieldDone = (metric) => {
    setPhase('done');
    onResult(metric);
  };

  return (
    <div className={`stage3-game stage3-game--${mode}`}>
      {phase === 'idle' && mode === 'standalone' && <Stage3Intro />}
      {(phase === 'running' || phase === 'done') && (
        <Stage3Field
          isRunning={phase === 'running'}
          onResult={handleFieldDone}
        />
      )}
    </div>
  );
}
