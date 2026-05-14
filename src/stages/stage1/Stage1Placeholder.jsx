import React, { useState, useEffect, useRef } from 'react';
import './Stage1Placeholder.css';
import DialogueBox from '../../components/DialogueBox/DialogueBox';
import { STAGE1_CONFIG } from './stage1.config.js';
import { pointsForError, metricFromPoints } from '../common/reactionScoring.js';
import { scoreFromMetric, maxScoreForStage } from '../../scoring.js';
import { useAudioVolume } from '../../audio/useAudioVolume.js';
import ResultModal from '../../components/ResultModal/ResultModal.jsx';

// 💡 경로 앞에 /를 붙여서 public 폴더 기준임을 명시
const BGM_PATH = '/assets/sounds/heartbeat_10s.mp3';

const STAGE1_STORY = [
  "평화롭던 일상이 무너졌습니다. 나와 똑같은 얼굴을 한 '가짜'가 내 삶을 훔치려 합니다.",
  "당황하는 순간 주도권은 도플갱어에게 넘어갑니다. 평정심을 유지하며 놈의 주파수를 차단해야 합니다."
];

const TIER_COMMENT = {
  perfect: '완벽한 정각. 도플갱어의 주파수가 끊어졌습니다.',
  great:   '거의 정확한 타이밍. 가짜의 형체가 흐려집니다.',
  good:    '준수한 타이밍. 도플갱어를 잠시 밀어냈습니다.',
  ok:      '간발의 차이로 도플갱어를 막아냈습니다.',
  bare:    '타이밍이 어긋났습니다. 도플갱어와 눈이 마주쳤습니다.',
};

export default function Stage1Placeholder({ mode = 'standalone', isRunning = true, onResult }) {
  const [phase, setPhase] = useState('STORY');
  const [currentTime, setCurrentTime] = useState(0.00);
  const [finalResultTime, setFinalResultTime] = useState(0.00);
  const [isEyesClosed, setIsEyesClosed] = useState(false);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [resultTier, setResultTier] = useState(null);
  const [resultScore, setResultScore] = useState(0);

  const bgmVolume = useAudioVolume('bgm');

  const startTimeRef = useRef(0);
  const requestRef = useRef();
  const pendingMetricRef = useRef(null);
  
  // 💡 오디오 객체를 안전하게 한 번만 생성
  const bgmRef = useRef(null);
  useEffect(() => {
    bgmRef.current = new Audio(BGM_PATH);
    bgmRef.current.loop = true;

    return () => {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
    };
  }, []);

  // useAudioStore 의 bgmVolume 변경 시 현재 재생 중인 heartbeat 에 즉시 반영
  useEffect(() => {
    const bgm = bgmRef.current;
    if (bgm) bgm.volume = bgmVolume;
  }, [bgmVolume]);

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
    return <><span className="hour-min-text">{hourMin}</span>{secMs}</>;
  };

  // 💡 BGM 제어 로직 최적화 (상태 변화 시 정지만 담당)
  useEffect(() => {
    if (phase !== 'CHIMING' || !isRunning) {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current.currentTime = 0;
      }
    }
  }, [phase, isRunning]);

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
    setResultScore(scoreFromMetric(1, metric));
    pendingMetricRef.current = metric;
  };

  useEffect(() => {
    if (phase === 'CHIMING' && isRunning) {
      startTimeRef.current = Date.now();
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [phase, isRunning]);

  // 💡 입력 처리: 0.1초 딜레이 제거 및 재생 안정화
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (phase === 'MANUAL' && (e.code === 'Space' || e.code === 'Enter')) {
        const bgm = bgmRef.current;
        if (bgm) {
          bgm.currentTime = 0.1;
          bgm.volume = bgmVolume;
          // play() 성공 여부를 확인하지 않고 그냥 실행하여 지연 최소화
          bgm.playbackRate = 1.15;
          bgm.play().catch(() => {});
        }
        setPhase('CHIMING');
      }
      if (e.key === 'ArrowLeft' && phase === 'CHIMING') {
        handleFinish((Date.now() - startTimeRef.current) / 1000);
      }
      if (phase === 'END' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        if (onResult && pendingMetricRef.current !== null) onResult(pendingMetricRef.current);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, bgmVolume]);

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

      {(phase === 'MANUAL' || phase === 'CHIMING') && (
        <div className="stage-key-hint">10초에 정확히 ← 키를 누르세요</div>
      )}

      {phase === 'MANUAL' && (
        <div className="manual-overlay">
          <p className="start-instruction">Space / Enter를 눌러 시험을 시작합니다.</p>
        </div>
      )}

      {phase === 'CHIMING' && (
        <div className="led-clock-view">
          <h1 className={`led-timer ${currentTime > 8.00 ? 'off' : currentTime > 7.00 ? 'flicker' : ''}`}>
            {formatTime(currentTime)}
          </h1>
          <p className={`target-hint ${currentTime > 8.00 ? 'off' : ''}`}>TARGET : 12:00:00.00</p>
        </div>
      )}

      {phase === 'END' && resultTier && (
        <ResultModal
          metricValue={`${finalResultTime.toFixed(2)}초`}
          tone={resultTier.id === 'bare' ? 'failed' : 'success'}
          tiers={STAGE1_CONFIG.accuracyTiers.map((t, i, arr) => {
            let rangeLabel;
            if (t.maxError === Infinity) {
              rangeLabel = '그 외';
            } else if (i === 0) {
              rangeLabel = `${(STAGE1_CONFIG.targetSec - t.maxError).toFixed(2)}~${(STAGE1_CONFIG.targetSec + t.maxError).toFixed(2)}초`;
            } else {
              const prevMax = arr[i - 1].maxError;
              rangeLabel = `${(STAGE1_CONFIG.targetSec - t.maxError).toFixed(2)}~${(STAGE1_CONFIG.targetSec - prevMax).toFixed(2)} 또는 ${(STAGE1_CONFIG.targetSec + prevMax).toFixed(2)}~${(STAGE1_CONFIG.targetSec + t.maxError).toFixed(2)}초`;
            }
            return { label: t.label, rangeLabel, points: t.points, isCurrent: resultTier.id === t.id, color: t.color };
          })}
          hint="Space / Enter 로 계속"
        />
      )}
    </div>
  );
}
