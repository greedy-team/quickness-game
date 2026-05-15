// src/stages/stage4/Stage4TimerPane.jsx
import React, { useState, useEffect, useRef } from 'react';
import './Stage4TimerPane.css';
import { STAGE1_CONFIG } from '../stage1/stage1.config.js';
import { pointsForError, metricFromPoints } from '../common/reactionScoring.js';
import { scoreFromMetric } from '../../scoring.js';
import ResultModal from '../../components/ResultModal/ResultModal.jsx';

export default function Stage4TimerPane({ isRunning, onResult }) {
  const [currentTime, setCurrentTime] = useState(0.000);
  const [phase, setPhase] = useState('running'); // 'running' | 'end'
  const [finalTime, setFinalTime] = useState(0);
  const [resultScore, setResultScore] = useState(0);
  const [resultTier, setResultTier] = useState(null);

  const startTimeRef = useRef(0);
  const requestRef = useRef();
  const phaseRef = useRef('running');
  const finishTimeoutRef = useRef(null);

  // 1단계의 포맷팅 (00:000)
  const formatTime = (elapsed) => {
    const s = Math.floor(elapsed).toString().padStart(2, '0');
    const ms = Math.floor((elapsed % 1) * 1000).toString().padStart(3, '0');
    return `${s}:${ms}`;
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
    setResultScore(score);
    setResultTier(tier);
    setPhase('end');

    finishTimeoutRef.current = setTimeout(() => {
      if (onResult) onResult(metric, { score });
      finishTimeoutRef.current = null;
    }, 1500); // 1.5초 후 4단계 호스트로 완료 신호 전송
  };

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      cancelAnimationFrame(requestRef.current);
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    };
  }, [isRunning]);

  // 💡 1단계와 동일하게 왼쪽 방향키(ArrowLeft)를 눌렀을 때 멈춤!
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
      {/* 💡 1단계 시계 배경 */}
      <div className="s4-timer-bg" />

      {/* 💡 1단계 인게임 뷰 */}
      <div className="s4-timer-content">
        <h1 className={`s4-timer-display ${
          (currentTime > 7.00 && finalTime === 0) ? 'off' : ''
        } ${
          (currentTime > 6.00 && currentTime <= 7.00 && finalTime === 0) ? 'flicker' : ''
        }`}>
          {formatTime(currentTime)}
        </h1>
        <p className="s4-target-hint" style={{ opacity: (currentTime > 7.00 && finalTime === 0) ? 0 : 1 }}>
          TARGET : 10.000s
        </p>
      </div>

      {/* 💡 게임 종료 시 심플하게 점수만 표시 (거대 모달 X) -> 이제 ResultModal 적용 */}
      {phase === 'end' && resultTier && (
        <ResultModal
          metricValue={`${finalTime.toFixed(3)}초`}
          tone={resultTier.id === 'bare' ? 'failed' : 'success'}
          tiers={STAGE1_CONFIG.accuracyTiers.map(t => ({ 
            ...t, 
            isCurrent: resultTier.id === t.id, 
            rangeLabel: t.maxError === Infinity ? '그 외' : `≤ ${t.maxError}s` 
          }))}
          hint={resultTier.id === 'bare' ? "끝까지 집중하세요." : ""} 
        />
      )}
    </div>
  );
}
