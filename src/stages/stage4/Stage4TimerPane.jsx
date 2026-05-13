// src/stages/stage4/Stage4TimerPane.jsx
import React, { useState, useEffect, useRef } from 'react';
import './Stage4TimerPane.css';
import { STAGE1_CONFIG } from '../stage1/stage1.config.js';
import { pointsForError, metricFromPoints } from '../common/reactionScoring.js';
import { scoreFromMetric, maxScoreForStage } from '../../scoring.js';
import ResultModal from '../../components/ResultModal/ResultModal.jsx';

const TIER_COMMENT = {
  perfect: '완벽한 정각. 도플갱어의 주파수가 끊어졌습니다.',
  great:   '거의 정확한 타이밍. 가짜의 형체가 흐려집니다.',
  good:    '준수한 타이밍. 도플갱어를 잠시 밀어냈습니다.',
  ok:      '간발의 차이로 도플갱어를 막아냈습니다.',
  bare:    '타이밍이 어긋났습니다. 도플갱어와 눈이 마주쳤습니다.',
};

export default function Stage4TimerPane({ isRunning, onResult }) {
  const [currentTime, setCurrentTime] = useState(0.00);
  const [phase, setPhase] = useState('running'); // 'running' | 'end'
  const [finalTime, setFinalTime] = useState(0);
  const [resultTier, setResultTier] = useState(null);
  const [resultScore, setResultScore] = useState(0);

  const startTimeRef = useRef(0);
  const requestRef = useRef();
  const phaseRef = useRef('running');
  const finishTimeoutRef = useRef(null);

  // 시간 포맷
  const formatTime = (elapsed) => {
    const totalSec = 50 + elapsed;
    let hourMin, secMs;
    if (totalSec < 60) {
      hourMin = "11:59:";
      secMs = `${Math.floor(totalSec).toString().padStart(2, '0')}${(totalSec % 1).toFixed(2).substring(1)}`;
    } else {
      const overSec = totalSec - 60;
      hourMin = "12:00:";
      secMs = `${Math.floor(overSec).toString().padStart(2, '0')}${(overSec % 1).toFixed(2).substring(1)}`;
    }
    return (
      <><span className="s4-hour-min">{hourMin}</span>{secMs}</>
    );
  };

  const animate = () => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    if (elapsed <= STAGE1_CONFIG.timeoutSec) {
      setCurrentTime(elapsed);
      requestRef.current = requestAnimationFrame(animate);
    } else {
      handleFinish(elapsed);
    }
  };

  const handleFinish = (time) => {
    if (phaseRef.current !== 'running') return;
    cancelAnimationFrame(requestRef.current);

    const error = Math.abs(time - STAGE1_CONFIG.targetSec);
    const { tier, points } = pointsForError(error, STAGE1_CONFIG);
    const metric = metricFromPoints(points, STAGE1_CONFIG);
    const score = scoreFromMetric(1, metric);

    phaseRef.current = 'end';
    setFinalTime(time);
    setResultTier(tier);
    setResultScore(score);
    setPhase('end');

    finishTimeoutRef.current = setTimeout(() => {
      if (onResult) onResult(metric, { score });
      finishTimeoutRef.current = null;
    }, 1500);
  };

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      cancelAnimationFrame(requestRef.current);
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
      }
    };
  }, [isRunning]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && isRunning && phaseRef.current === 'running') {
        handleFinish((Date.now() - startTimeRef.current) / 1000);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning]);

  return (
    <div className="s4-timer-pane">
      <div className="s4-timer-bg" />

      <div className="s4-timer-content">
        <h1 className={`s4-timer-display ${
          currentTime > 8.00 ? 'off' :
          currentTime > 7.00 ? 'flicker' : ''
        }`}>
          {formatTime(currentTime)}
        </h1>
      </div>

      {phase === 'end' && resultTier && (
        <ResultModal
          metricLabel="MEASURED TIME"
          metricValue={formatTime(finalTime)}
          score={resultScore}
          maxScore={maxScoreForStage(1)}
          tone={resultTier.id === 'bare' ? 'failed' : 'success'}
          tiers={STAGE1_CONFIG.accuracyTiers.map((t) => ({
            label: t.label,
            rangeLabel: t.maxError === Infinity ? '그 외' : `±${t.maxError.toFixed(2)}초`,
            points: t.points,
            isCurrent: resultTier.id === t.id,
            color: t.color,
          }))}
        />
      )}
    </div>
  );
}
