import React, { useState, useEffect, useRef } from 'react';
import './Stage1Placeholder.css';
import DialogueBox from '../../components/DialogueBox/DialogueBox';
import { STAGE1_CONFIG } from './stage1.config.js';
import { pointsForError, metricFromPoints } from '../common/reactionScoring.js';
import { scoreFromMetric } from '../../scoring.js';
import { useAudioVolume } from '../../audio/useAudioVolume.js';
import ResultModal from '../../components/ResultModal/ResultModal.jsx';
import { useGameStore } from '../../store.js';

const BGM_PATH = '/assets/sounds/heartbeat_10s.mp3';

const STAGE1_STORY = [
  "평화롭던 일상이 무너졌습니다. 나와 똑같은 얼굴을 한 '가짜'가 내 삶을 훔치려 합니다.",
  "당황하는 순간 주도권은 도플갱어에게 넘어갑니다. 평정심을 유지하며 놈의 주파수를 차단해야 합니다."
];

export default function Stage1Placeholder({ onResult, isRunning = true }) {
  const [phase, setPhase] = useState('ready');
  const [currentTime, setCurrentTime] = useState(0.000);
  const [finalResultTime, setFinalResultTime] = useState(0.000);
  const [isEyesClosed, setIsEyesClosed] = useState(false);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [resultTier, setResultTier] = useState(null);

  const bgmVolume = useAudioVolume('bgm');
  const startTimeRef = useRef(0);
  const requestRef = useRef();
  const pendingMetricRef = useRef(null);
  const bgmRef = useRef(null);
  const bgmCloneRef = useRef(null);

  useEffect(() => {
    if (!bgmRef.current) {
      bgmRef.current = new Audio(BGM_PATH);
      bgmRef.current.loop = true;
      
      bgmCloneRef.current = new Audio(BGM_PATH);
      bgmCloneRef.current.loop = true;
    }
    return () => { 
      if (bgmRef.current) { bgmRef.current.pause(); bgmRef.current = null; } 
      if (bgmCloneRef.current) { bgmCloneRef.current.pause(); bgmCloneRef.current = null; } 
    };
  }, []);

  useEffect(() => {
    if (bgmRef.current) bgmRef.current.volume = bgmVolume;
    if (bgmCloneRef.current) bgmCloneRef.current.volume = bgmVolume;
  }, [bgmVolume]);

  useEffect(() => {
    if (phase !== 'running') return undefined;
    const { setActivePlayStageId } = useGameStore.getState();
    setActivePlayStageId(1);
    return () => setActivePlayStageId(null);
  }, [phase]);

  const formatTime = (elapsed) => {
    const s = Math.floor(elapsed).toString().padStart(2, '0');
    const ms = Math.floor((elapsed % 1) * 1000).toString().padStart(3, '0');
    return `${s}:${ms}`;
  };

  const handleFinish = (time) => {
    if (bgmRef.current) {
      bgmRef.current.pause();
    }
    if (bgmCloneRef.current) {
      bgmCloneRef.current.pause();
    }
    cancelAnimationFrame(requestRef.current);
    setFinalResultTime(time);
    setCurrentTime(time);

    setTimeout(() => {
      setIsEyesClosed(true);
      setTimeout(() => {
        setPhase('result');
      }, 600);
    }, 2000);

    const error = Math.abs(time - STAGE1_CONFIG.targetSec);
    const { tier, points } = pointsForError(error, STAGE1_CONFIG);
    setResultTier(tier);
    const metric = metricFromPoints(points, STAGE1_CONFIG);
    pendingMetricRef.current = metric;
  };

  const animate = () => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    if (elapsed <= STAGE1_CONFIG.timeoutSec) {
      setCurrentTime(elapsed);
      requestRef.current = requestAnimationFrame(animate);
    } else { handleFinish(elapsed); }
  };

  const startGame = () => {
    if (bgmRef.current) {
      bgmRef.current.currentTime = 0.1;
      bgmRef.current.playbackRate = 1.15;
      bgmRef.current.play().catch(() => {});
    }
    if (bgmCloneRef.current) {
      bgmCloneRef.current.currentTime = 0.1;
      bgmCloneRef.current.playbackRate = 1.15;
      bgmCloneRef.current.play().catch(() => {});
    }
    startTimeRef.current = Date.now();
    requestRef.current = requestAnimationFrame(animate);
    setPhase('running');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (phase === 'ready' && (e.code === 'Space' || e.code === 'Enter')) {
        startGame(); 
      }
      if (e.key === 'ArrowLeft' && phase === 'running' && finalResultTime === 0) {
        handleFinish((Date.now() - startTimeRef.current) / 1000);
      }
      if (phase === 'result' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        if (onResult && pendingMetricRef.current !== null) onResult(pendingMetricRef.current);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, finalResultTime, bgmVolume]);

  // 💡 배경 교체 로직 수정 (준비: 복도 / 게임: 시계)
  const getBackgroundImage = () => {
    if (phase === 'result') return null;
    if (phase === 'ready') return '/assets/images/bg_stage1_corridor.webp'; 
    if (phase === 'running') return '/assets/images/bg_stage1_clock.webp'; 
    return currentDialogueIndex === 1 ? '/assets/images/bg_stage1_corridor_그린이.webp' : '/assets/images/bg_stage1_corridor.webp';
  };

  return (
    <div className="stage-wrapper">
      <div className="stage1-bg" style={{backgroundImage: getBackgroundImage() ? `url(${getBackgroundImage()})` : 'none'}} />
      <div className={`eye-lid top ${isEyesClosed ? 'closed' : ''}`} />
      <div className={`eye-lid bottom ${isEyesClosed ? 'closed' : ''}`} />

      {phase === 'story' && (
        <DialogueBox lines={STAGE1_STORY} onLineChange={setCurrentDialogueIndex} onComplete={() => setPhase('ready')} />
      )}

      {phase === 'ready' && (
        <div className="stage-info-screen">
          <div className="info-top-section">
            <h1 className="stage-title">1단계: 10초 게임</h1>
          </div>

          <div className="info-middle-section">
            <img 
              className="simple-preview-image" 
              src="/assets/images/bg_stage1_clock_example.webp" 
              alt="Stage 1 Example" 
            />

            <div className="instruction-item">
              <div className="arrow-keys-cluster">
                <div className="arrow-row">
                  <div className="key-cap">↑</div>
                </div>
                <div className="arrow-row">
                  <div className="key-cap left-active">←</div>
                  <div className="key-cap">↓</div>
                  <div className="key-cap">→</div>
                </div>
              </div>
              <div className="main-instruction-text">
                타이머가 정확히 10초가 되는 순간<br/>
                <span className="highlight-key">[←] 키</span>를 눌러 타이머를 멈추세요
              </div>
            </div>
          </div>

          <div className="info-bottom-section">
            <p className="sub-instruction-text" onClick={() => { if(phase === 'ready') startGame(); }} style={{ cursor: 'pointer' }}>ENTER 키를 눌러 시작</p>
          </div>
        </div>
      )}

      {phase === 'running' && (
        <div className="led-clock-view">
          <h1 className={`led-timer 
            ${(currentTime > 7.00 && finalResultTime === 0) ? 'off' : ''} 
            ${(currentTime > 6.00 && currentTime <= 7.00 && finalResultTime === 0) ? 'flicker' : ''}
          `}>
            {formatTime(currentTime)}
          </h1>
          <p className="target-hint" style={{ opacity: (currentTime > 7.00 && finalResultTime === 0) ? 0 : 1 }}>
            TARGET : 10.000s
          </p>
        </div>
      )}

      {phase === 'result' && resultTier && (
        <ResultModal
          metricValue={`${finalResultTime.toFixed(3)}초`}
          tone={resultTier.id === 'bare' ? 'failed' : 'success'}
          tiers={STAGE1_CONFIG.accuracyTiers.map((t, i, arr) => {
            const target = STAGE1_CONFIG.targetSec;
            const prev = i > 0 ? arr[i - 1] : null;
            const fmt = (v) => v.toFixed(2);
            let rangeLabel;
            if (t.maxError === Infinity) {
              const prevErr = prev ? prev.maxError : 0;
              rangeLabel = `<${fmt(target - prevErr)} 또는 >${fmt(target + prevErr)}s`;
            } else if (prev) {
              const lowFar = fmt(target - t.maxError);
              const lowNear = fmt(target - prev.maxError);
              const highNear = fmt(target + prev.maxError);
              const highFar = fmt(target + t.maxError);
              rangeLabel = `${lowFar}~${lowNear} 또는 ${highNear}~${highFar}s`;
            } else {
              rangeLabel = `${fmt(target - t.maxError)}~${fmt(target + t.maxError)}s`;
            }
            return {
              ...t,
              isCurrent: resultTier.id === t.id,
              rangeLabel,
            };
          })}
          hint="" 
          continueText="ENTER를 눌러 계속"
          onContinue={() => {
            if (onResult && pendingMetricRef.current !== null) onResult(pendingMetricRef.current);
          }}
        />
      )}
    </div>
  );
}
