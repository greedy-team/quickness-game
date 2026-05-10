// src/routes/stage4/Stage4TimerPane.jsx
import React, { useState, useEffect, useRef } from 'react';
import './Stage4TimerPane.css';
import { STAGE1_CONFIG } from '../stage1/stage1.config.js';
import { pointsForError, metricFromPoints } from '../common/reactionScoring.js';

export default function Stage4TimerPane({ isRunning, onResult }) {
  const [currentTime, setCurrentTime] = useState(0.00);
  const startTimeRef = useRef(0);
  const requestRef = useRef();

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
    cancelAnimationFrame(requestRef.current);
    const error = Math.abs(time - STAGE1_CONFIG.targetSec);
    const { points } = pointsForError(error, STAGE1_CONFIG);
    const metric = metricFromPoints(points, STAGE1_CONFIG);
    if (onResult) onResult(metric);
  };

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isRunning]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && isRunning) {
        handleFinish((Date.now() - startTimeRef.current) / 1000);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning]);

  return (
    <div className="s4-timer-pane">
      {/* ── 🛠️ 배경 이미지 레이어 추가 ── */}
      <div className="s4-timer-bg" />
      
      <div className="s4-timer-content">
        <h1 className={`s4-timer-display ${
          currentTime > 8.00 ? 'off' : 
          currentTime > 7.00 ? 'flicker' : ''
        }`}>
          {formatTime(currentTime)}
        </h1>
      </div>
    </div>
  );
}
