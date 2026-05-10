import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Stage2Placeholder.css';
import { STAGE2_CONFIG } from './stage2.config.js';
import { pointsForError, metricFromPoints } from '../common/reactionScoring.js';
import { scoreFromMetric } from '../../scoring.js';
import ResultModal from '../../components/ResultModal/ResultModal.jsx';

const BGS = {
  INFO: '/assets/images/bg_stage2_info.png',
  BASE: '/assets/images/bg_stage2_library.png',
  G1: '/assets/images/bg_stage2_library_greenie1.png',
  G2: '/assets/images/bg_stage2_library_greenie2.png',
  G3: '/assets/images/bg_stage2_library_greenie3.png',
  REAL: '/assets/images/greenie_real.png',
};

const TIER_COMMENT = {
  perfect: '인간을 초월한 속도입니다!',
  great:   '완벽한 타이밍입니다.',
  good:    '훌륭한 반응속도입니다.',
  ok:      '간신히 셔터를 눌렀습니다.',
  bare:    '간발의 차이로 놓쳤습니다.',
};

export default function Stage2Placeholder({ onResult, isRunning, mode }) {
  const [phase, setPhase] = useState('MANUAL'); 
  const [gameState, setGameState] = useState('IDLE');
  const [currentBG, setCurrentBG] = useState(BGS.INFO); 
  const [timer, setTimer] = useState(10);
  const [isFlash, setIsFlash] = useState(false);
  const [isAttackFlash, setIsAttackFlash] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  
  const [reaction, setReaction] = useState({ time: null, comment: "" });
  const [resultTier, setResultTier] = useState(null);
  const [resultScore, setResultScore] = useState(0);

  const stateRef = useRef({
    phase: 'MANUAL',
    gameState: 'IDLE',
    isFinished: false,
    attackStartTime: 0 
  });

  const syncPhase = (p) => { stateRef.current.phase = p; setPhase(p); };
  const syncGameState = (g) => { stateRef.current.gameState = g; setGameState(g); };

  useEffect(() => {
    Object.values(BGS).forEach(src => { const img = new Image(); img.src = src; });
  }, []);

  useEffect(() => {
    if (mode === 'split' && isRunning && stateRef.current.phase === 'MANUAL') {
      startGame();
    }
  }, [isRunning, mode]);

  const startGame = () => {
    if (stateRef.current.phase !== 'MANUAL') return;
    
    stateRef.current.isFinished = false;
    syncPhase('PLAY');
    syncGameState('LURKING');
    setCurrentBG(BGS.BASE);
    setTimer(10);
    setIsShaking(false);
    setIsAttackFlash(false);
    setIsFlash(false);
    setReaction({ time: null, comment: "" });
  };

  const handleFinish = useCallback((metric, endState, tier, rTime = null, rComment = "") => {
    stateRef.current.isFinished = true;
    syncGameState(endState);
    setIsShaking(false);

    setReaction({ time: rTime, comment: rComment });
    setResultTier(tier);
    setResultScore(scoreFromMetric(2, metric));
    syncPhase('END');

    setTimeout(() => {
      if (onResult) onResult(metric);
    }, 2000);
  }, [onResult]);

  const handleShutter = useCallback(() => {
    if (stateRef.current.phase !== 'PLAY' || stateRef.current.isFinished) return;

    stateRef.current.isFinished = true;
    setIsFlash(true);
    setIsShaking(false);

    const isSuccess = stateRef.current.gameState === 'JUMPING';
    let finalMetric;
    let finalState;
    let finalTier;
    let rTime = null;
    let comment;

    if (isSuccess) {
      const reactionSec = (performance.now() - stateRef.current.attackStartTime) / 1000;
      const { tier, points } = pointsForError(reactionSec, STAGE2_CONFIG);
      finalMetric = metricFromPoints(points, STAGE2_CONFIG);
      finalState = 'SUCCESS';
      finalTier = tier;
      rTime = reactionSec.toFixed(3);
      comment = TIER_COMMENT[tier.id] ?? tier.label;
    } else {
      // fake 캐치 — reaction time 정의 안 됨, bare tier 직행
      const bareTier = STAGE2_CONFIG.accuracyTiers.find((t) => t.id === 'bare');
      finalMetric = metricFromPoints(bareTier.points, STAGE2_CONFIG);
      finalState = 'FAILED';
      finalTier = bareTier;
      comment = '너무 성급했습니다. 훼이크에 속았습니다.';
    }

    syncGameState(finalState);
    setTimeout(() => {
      setIsFlash(false);
      handleFinish(finalMetric, finalState, finalTier, rTime, comment);
    }, 300);
  }, [handleFinish]);

  useEffect(() => {
    if (phase !== 'PLAY') return;

    const timeouts = [];
    const countdown = setInterval(() => {
      setTimer(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    const attackTime = Math.floor(Math.random() * 3000) + 5000;
    const pool = [BGS.G1, BGS.G2, BGS.G3];
    let selectedFakes = [];
    const fakeCount = Math.random() > 0.5 ? 3 : 2;

    if (fakeCount === 3) {
      selectedFakes = [BGS.G1, BGS.G2, BGS.G3];
    } else {
      const skipIndex = Math.floor(Math.random() * 3);
      selectedFakes = pool.filter((_, index) => index !== skipIndex); 
    }

    const windowStart = 1000; 
    const windowEnd = attackTime - 800; 
    const slice = (windowEnd - windowStart) / selectedFakes.length;

    selectedFakes.forEach((bg, index) => {
      const minTime = windowStart + (slice * index);
      const maxTime = minTime + slice - 300;
      const fakeTime = minTime + Math.random() * (maxTime - minTime);

      const tFake = setTimeout(() => {
        if (stateRef.current.isFinished) return;
        syncGameState('FLICKERING');
        setCurrentBG(bg);
        const tRevert = setTimeout(() => {
          if (!stateRef.current.isFinished && stateRef.current.gameState !== 'JUMPING') {
            setCurrentBG(BGS.BASE);
            syncGameState('LURKING');
          }
        }, 250);
        timeouts.push(tRevert);
      }, fakeTime);
      timeouts.push(tFake);
    });

    const tAttack = setTimeout(() => {
      if (stateRef.current.isFinished) return;
      stateRef.current.attackStartTime = performance.now();
      syncGameState('JUMPING');
      setCurrentBG(BGS.REAL);
      setIsShaking(true);
      setIsAttackFlash(true);

      const tFail = setTimeout(() => {
        if (!stateRef.current.isFinished) {
          const bareTier = STAGE2_CONFIG.accuracyTiers.find((t) => t.id === 'bare');
          const metric = metricFromPoints(bareTier.points, STAGE2_CONFIG);
          handleFinish(metric, 'FAILED', bareTier, null, "반응이 너무 늦었습니다. 놈에게 잡혔습니다.");
        }
      }, STAGE2_CONFIG.attackWindowMs);
      timeouts.push(tFail);
    }, attackTime);
    
    timeouts.push(tAttack);

    return () => {
      clearInterval(countdown);
      timeouts.forEach(clearTimeout);
    };
  }, [phase, handleFinish]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (stateRef.current.phase === 'MANUAL' && (e.code === 'Space' || e.code === 'Enter')) startGame();
      else if (stateRef.current.phase === 'PLAY' && e.key === 'ArrowUp') handleShutter();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleShutter]);

  return (
    <div className={`stage2-wrapper ${isShaking ? 'screen-shake' : ''} ${mode === 'split' ? 'split-mode' : ''}`}>
      
      <div 
        className={`stage2-content ${phase === 'PLAY' ? 'camera-sway' : ''} ${gameState === 'FLICKERING' ? 'flicker-bright' : ''}`} 
        style={{ backgroundImage: `url(${currentBG})` }} 
      />
      
      <div className="camera-viewfinder" />
      <div className={`attack-flash-overlay ${isAttackFlash ? 'active' : ''}`} />
      <div className={`camera-flash ${isFlash ? 'active' : ''}`} />

      <div className="stage2-ui-layer">
        
        {/* 💡 요청하신 첫 번째 이미지의 깔끔한 시작 문구만 복구 */}
        {phase === 'MANUAL' && (
          <div className="start-minimal">
            <p className="start-btn-simple">Space / Enter를 눌러 시험을 시작합니다.</p>
          </div>
        )}

        {phase === 'PLAY' && (
          <div className="camera-hud">
            <div className="hud-top">
              <div className="rec-info"><div className="rec-dot" /><span>REC 00:00:{timer.toString().padStart(2, '0')}</span></div>
              <div className="battery-box"><div className="battery-body"><div className="battery-level" /></div><div className="battery-tip" /></div>
            </div>
            <div className="focus-cross"><div className="cross-h" /><div className="cross-v" /></div>
          </div>
        )}

        {phase === 'END' && mode !== 'split' && (
          <div className="final-message-overlay">
            <div className={resultTier && resultTier.id !== 'bare' ? 'msg-success' : 'msg-failed'}>
              <h1 className="main-msg">{resultTier && resultTier.id !== 'bare' ? "EVIDENCE CAPTURED" : "LOST IN DARKNESS"}</h1>
              <p className="sub-msg">{reaction.comment}</p>
              {reaction.time && <p className="reaction-time">REACTION TIME: {reaction.time}s</p>}
              <p className="result-score">+{resultScore}점</p>
            </div>
            <p className="start-btn" style={{ marginTop: '40px' }}>메인 화면으로 돌아갑니다...</p>
          </div>
        )}
      </div>

      {phase === 'END' && mode === 'split' && resultTier && (
        <ResultModal
          headline={resultTier.id !== 'bare' ? 'EVIDENCE CAPTURED' : 'LOST IN DARKNESS'}
          tierComment={reaction.comment}
          metricLabel={reaction.time ? 'REACTION TIME' : null}
          metricValue={reaction.time ? `${reaction.time}s` : null}
          score={resultScore}
          tone={resultTier.id !== 'bare' ? 'success' : 'failed'}
        />
      )}
    </div>
  );
}
