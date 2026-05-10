import React, { useState, useEffect, useRef } from 'react';
import './Stage1Placeholder.css';
import DialogueBox from '../../components/DialogueBox/DialogueBox';
import { STAGE1_CONFIG } from './stage1.config.js';
import { pointsForError, metricFromPoints } from '../common/reactionScoring.js';

const STAGE1_STORY = [
  "평화롭던 일상이 무너졌습니다. 나와 똑같은 얼굴을 한 '가짜'가 내 삶을 훔치려 합니다.",
  "당황하는 순간 주도권은 도플갱어에게 넘어갑니다. 평정심을 유지하며 놈의 주파수를 차단해야 합니다."
];

export default function Stage1Placeholder({ mode = 'standalone', isRunning = true, onResult }) {
  const [phase, setPhase] = useState('STORY');
  const [currentTime, setCurrentTime] = useState(0.00);
  const [finalResultTime, setFinalResultTime] = useState(0.00);
  const [isEyesClosed, setIsEyesClosed] = useState(false);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [resultTier, setResultTier] = useState(null);
  const startTimeRef = useRef(0);
  const requestRef = useRef();

  // ── 배경 이미지 결정 로직 ──
  const getBackgroundImage = () => {
    if (phase === 'END') return null; 
    if (phase === 'MANUAL') return '/assets/images/bg_stage1_info.png';
    if (phase === 'CHIMING') return '/assets/images/bg_stage1_clock.png'; 
    switch (currentDialogueIndex) {
      case 1: return '/assets/images/bg_stage1_corridor_그린이.png';
      default: return '/assets/images/bg_stage1_corridor.png';
    }
  };

  const bgImage = getBackgroundImage();
  const bgStyle = bgImage ? { backgroundImage: `url(${bgImage})` } : {};

  // ── 시간 포맷 변환 ──
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
      <>
        <span className="hour-min-text">{hourMin}</span>{secMs}
      </>
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
    setFinalResultTime(time);
    setIsEyesClosed(true);
    setPhase('END');

    const error = Math.abs(time - STAGE1_CONFIG.targetSec);
    const { tier, points } = pointsForError(error, STAGE1_CONFIG);
    setResultTier(tier);
    const metric = metricFromPoints(points, STAGE1_CONFIG);
    setTimeout(() => { if (onResult) onResult(metric); }, 4500);
  };

  useEffect(() => {
    if (phase === 'CHIMING' && isRunning) {
      startTimeRef.current = Date.now();
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [phase, isRunning]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (phase === 'MANUAL' && (e.code === 'Space' || e.code === 'Enter')) {
        setPhase('CHIMING');
      }
      if (e.key === 'ArrowLeft' && phase === 'CHIMING') {
        handleFinish((Date.now() - startTimeRef.current) / 1000);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  return (
    <div className="stage-wrapper">
      <div className="stage1-bg" style={bgStyle} />
      
      <div className={`eye-lid top ${isEyesClosed ? 'closed' : ''}`} />
      <div className={`eye-lid bottom ${isEyesClosed ? 'closed' : ''}`} />

      {phase === 'STORY' && (
        <DialogueBox 
          lines={STAGE1_STORY} 
          onLineChange={(idx) => setCurrentDialogueIndex(idx)}
          onComplete={() => setPhase('MANUAL')} 
        />
      )}

      {/* ── 🛠️ MANUAL 단계: 위치 및 배경 수정 반영 ── */}
      {phase === 'MANUAL' && (
        <div className="manual-overlay">
          <p className="start-instruction">Space / Enter를 눌러 시험을 시작합니다.</p>
        </div>
      )}

      {phase === 'CHIMING' && (
        <div className="led-clock-view">
          <h1 className={`led-timer ${
            currentTime > 8.00 ? 'off' : 
            currentTime > 7.00 ? 'flicker' : ''
          }`}>
            {formatTime(currentTime)}
          </h1>
          <p className={`target-hint ${currentTime > 8.00 ? 'off' : ''}`}>TARGET : 12:00:00.00</p>
        </div>
      )}

      {phase === 'END' && (
        <div className="result-overlay immersive">
          <div className="result-container">
            <div className="result-time-display">
              <h1 className="result-val">{formatTime(finalResultTime)}</h1>
              <span className="result-label">MEASURED TIME</span>
            </div>
            <p className="result-story-text">
              {resultTier && (resultTier.id === 'perfect' || resultTier.id === 'great')
                ? `정확히 12시 정각. 도플갱어의 주파수를 완벽히 차단했습니다. 가짜의 형체가 일그러집니다.`
                : `타이밍이 어긋났습니다. 도플갱어와 눈이 마주쳤습니다.`}
            </p>
            <div className="loading-bar-wrap"><div className="loading-bar-inner" /></div>
          </div>
        </div>
      )}
    </div>
  );
}
