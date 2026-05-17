import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Stage2Placeholder.css';
import { STAGE2_CONFIG } from './stage2.config.js';
import { pointsForError, metricFromPoints } from '../common/reactionScoring.js';
import { scoreFromMetric } from '../../scoring.js';
import ResultModal from '../../components/ResultModal/ResultModal.jsx';
import { useGameStore } from '../../store.js';
import { useAudioVolume } from '../../audio/useAudioVolume.js';
import { playSfx } from '../../audio/playSfx.js';

const SOUNDS = {
  BGM: '/assets/sounds/stage2_bgm_static.mp3',
  FAKE: '/assets/sounds/stage2_sfx_glitch.mp3',
  REAL: '/assets/sounds/stage2_sfx_jumpscare.mp3',
  SHUTTER: '/assets/sounds/stage2_sfx_shutter.mp3',
};

const BGS = {
  INFO: '/assets/images/bg_stage2_info.png',
  BASE: '/assets/images/bg_stage2_library.png', 
  FAKE: '/assets/images/bg_stage2_library_fake.png',
  REAL: '/assets/images/greenie_real.png',
};

export default function Stage2Placeholder({ onResult, isRunning, mode }) {
  const [phase, setPhase] = useState('MANUAL'); 
  const [gameState, setGameState] = useState('IDLE');
  const [currentBG, setCurrentBG] = useState(BGS.BASE); 
  const [timer, setTimer] = useState(10);
  const [isFlash, setIsFlash] = useState(false);
  const [isAttackFlash, setIsAttackFlash] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  
  const [reaction, setReaction] = useState({ time: null, comment: "" });
  const [resultTier, setResultTier] = useState(null);

  const bgmVolume = useAudioVolume('bgm');
  const sfxVolume = useAudioVolume('sfx');

  const stateRef = useRef({
    phase: 'MANUAL',
    gameState: 'IDLE',
    isFinished: false,
    attackStartTime: 0
  });

  const audioRefs = useRef({
    bgm: null,
    real: null,
    realClone: null,
  });

  const jumpscareAudioTimeoutRef = useRef(null);
  // 💡 메트릭을 저장해둘 ref (엔터 누르면 반환하기 위해)
  const pendingMetricRef = useRef(null);

  const syncPhase = (p) => { stateRef.current.phase = p; setPhase(p); };
  const syncGameState = (g) => { stateRef.current.gameState = g; setGameState(g); };

  useEffect(() => {
    Object.values(BGS).forEach(src => { const img = new Image(); img.src = src; });

    audioRefs.current.bgm = new Audio(SOUNDS.BGM);
    audioRefs.current.bgm.loop = true;
    audioRefs.current.real = new Audio(SOUNDS.REAL);
    audioRefs.current.realClone = new Audio(SOUNDS.REAL);

    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) { audio.pause(); audio.currentTime = 0; }
      });
      if (jumpscareAudioTimeoutRef.current) {
        clearTimeout(jumpscareAudioTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const bgm = audioRefs.current.bgm;
    if (!bgm) return;

    if (phase === 'PLAY' && isRunning) {
      bgm.currentTime = 86;
      bgm.play().catch(() => {});
    } else {
      bgm.pause();
    }
  }, [phase, isRunning]);

  useEffect(() => {
    const bgm = audioRefs.current.bgm;
    if (bgm) bgm.volume = bgmVolume * 0.5;
  }, [bgmVolume]);

  const sfxVolumeRef = useRef(sfxVolume);
  useEffect(() => { sfxVolumeRef.current = sfxVolume; }, [sfxVolume]);

  useEffect(() => {
    if (mode === 'split' && isRunning && stateRef.current.phase === 'MANUAL') {
      startGame();
    }
  }, [isRunning, mode]);

  useEffect(() => {
    if (phase !== 'PLAY') return undefined;
    if (mode === 'split') return undefined;
    const { setActivePlayStageId } = useGameStore.getState();
    setActivePlayStageId(2);
    return () => setActivePlayStageId(null);
  }, [phase, mode]);

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
    
    // 💡 2초 뒤 자동 반환 로직을 지우고 metric만 기억
    pendingMetricRef.current = metric;
    syncPhase('END');

    if (audioRefs.current.real) {
      audioRefs.current.real.pause();
      audioRefs.current.real.currentTime = 0;
    }
    if (audioRefs.current.realClone) {
      audioRefs.current.realClone.pause();
      audioRefs.current.realClone.currentTime = 0;
    }

    // 💡 split 모드에서는 엔터를 기다리지 않고 1.5초 후 자동 반환
    if (mode === 'split' && onResult) {
      setTimeout(() => {
        onResult(metric, { score: scoreFromMetric(1, metric) });
      }, 1500);
    }
  }, [mode, onResult]);

  const handleShutter = useCallback(() => {
    if (stateRef.current.phase !== 'PLAY' || stateRef.current.isFinished) return;

    if (audioRefs.current.real) {
      audioRefs.current.real.pause();
      audioRefs.current.real.currentTime = 0;
    }
    if (audioRefs.current.realClone) {
      audioRefs.current.realClone.pause();
      audioRefs.current.realClone.currentTime = 0;
    }
    if (jumpscareAudioTimeoutRef.current) {
      clearTimeout(jumpscareAudioTimeoutRef.current);
    }

    playSfx(SOUNDS.SHUTTER, { scale: 1.0, durationMs: 500 });

    stateRef.current.isFinished = true;
    setIsFlash(true);
    setIsShaking(false);

    const isSuccess = stateRef.current.gameState === 'JUMPING';
    let finalMetric;
    let finalState;
    let finalTier;
    let rTime = null;

    if (isSuccess) {
      const reactionSec = (performance.now() - stateRef.current.attackStartTime) / 1000;
      const { tier, points } = pointsForError(reactionSec, STAGE2_CONFIG);
      finalMetric = metricFromPoints(points, STAGE2_CONFIG);
      finalState = 'SUCCESS';
      finalTier = tier;
      rTime = reactionSec.toFixed(3);
    } else {
      const bareTier = STAGE2_CONFIG.accuracyTiers.find((t) => t.id === 'bare');
      finalMetric = metricFromPoints(bareTier.points, STAGE2_CONFIG);
      finalState = 'FAILED';
      finalTier = bareTier;
    }

    syncGameState(finalState);
    setTimeout(() => {
      setIsFlash(false);
      handleFinish(finalMetric, finalState, finalTier, rTime, "");
    }, 300);
  }, [handleFinish]);

  useEffect(() => {
    if (phase !== 'PLAY') return;

    const timeouts = [];
    const countdown = setInterval(() => {
      setTimer(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    const attackTime = Math.floor(Math.random() * 3000) + 5000;
    const fakeCount = Math.random() > 0.5 ? 3 : 2;
    const selectedFakes = Array(fakeCount).fill(BGS.FAKE);

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
        playSfx(SOUNDS.FAKE, { scale: 0.8, durationMs: 400 });

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
      
      jumpscareAudioTimeoutRef.current = setTimeout(() => {
        if (!stateRef.current.isFinished) {
          const realAudio = audioRefs.current.real;
          const realClone = audioRefs.current.realClone;
          if (realAudio) {
            realAudio.currentTime = 0.5;
            realAudio.volume = sfxVolumeRef.current;
            realAudio.play().catch(() => {});
          }
          if (realClone) {
            realClone.currentTime = 0.5;
            realClone.volume = sfxVolumeRef.current;
            realClone.play().catch(() => {});
          }
        }
      }, 0);

      const tFail = setTimeout(() => {
        if (!stateRef.current.isFinished) {
          const bareTier = STAGE2_CONFIG.accuracyTiers.find((t) => t.id === 'bare');
          const metric = metricFromPoints(bareTier.points, STAGE2_CONFIG);
          handleFinish(metric, 'FAILED', bareTier, null, "");
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
      if (stateRef.current.phase === 'MANUAL' && (e.code === 'Space' || e.code === 'Enter')) {
        startGame();
      } else if (stateRef.current.phase === 'PLAY' && e.key === 'ArrowUp') {
        handleShutter();
      } 
      // 💡 게임 종료(END) 시 스페이스나 엔터 누르면 Result 넘기기
      else if (stateRef.current.phase === 'END' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        if (onResult && pendingMetricRef.current !== null) {
          onResult(pendingMetricRef.current);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleShutter, onResult]);

  return (
    <div className={`stage2-wrapper ${isShaking ? 'screen-shake' : ''} ${mode === 'split' ? 'split-mode' : ''}`}>
      
      <div 
        className={`stage2-content ${phase === 'PLAY' ? 'camera-sway' : ''} ${gameState === 'FLICKERING' ? 'flicker-bright' : ''}`} 
        style={{ backgroundImage: `url(${currentBG})` }} 
      />
      
      {phase === 'MANUAL' && (
        <div className="stage-info-screen">
          <div className="info-top-section">
            <h1 className="stage-title">2단계: 반응 게임</h1>
          </div>

          <div className="info-middle-section">
            <img 
              className="simple-preview-image" 
              src="/assets/images/bg_stage2_library_fake.png" 
              alt="Stage 2 Example" 
            />

            <div className="instruction-item">
              <div className="arrow-keys-cluster">
                <div className="arrow-row">
                  <div className="key-cap top-active">↑</div>
                </div>
                <div className="arrow-row">
                  <div className="key-cap">←</div>
                  <div className="key-cap">↓</div>
                  <div className="key-cap">→</div>
                </div>
              </div>
              
              <div className="main-instruction-text">
                그린이가 눈 앞에 크게 나타나는 순간<br/>
                <span className="highlight-key">[↑] 키</span>를 눌러 플래시를 터뜨리세요
              </div>
              <p className="warning-text">※ 주의: 왼쪽 이미지와 같은 훼이크에 속지 마세요!</p>
            </div>
          </div>

          <div className="info-bottom-section">
            <div className="key-icon-wrapper start-btn" onClick={() => { if(phase === 'MANUAL') startGame(); }}>
              <span>GAME START</span>
            </div>
            <p className="sub-instruction-text">ENTER 키를 눌러 시작</p>
          </div>
        </div>
      )}

      {phase === 'PLAY' && (
        <>
          <div className="camera-viewfinder" />
          <div className={`attack-flash-overlay ${isAttackFlash ? 'active' : ''}`} />
          <div className={`camera-flash ${isFlash ? 'active' : ''}`} />

          <div className="stage2-ui-layer">
            <div className="camera-hud">
              <div className="hud-top">
                <div className="rec-info"><div className="rec-dot" /><span>REC 00:00:{timer.toString().padStart(2, '0')}</span></div>
                <div className="battery-box"><div className="battery-body"><div className="battery-level" /></div><div className="battery-tip" /></div>
              </div>
              <div className="focus-cross"><div className="cross-h" /><div className="cross-v" /></div>
            </div>
          </div>
        </>
      )}

      {/* 💡 1단계와 동일한 규격의 통합 ResultModal 연동 */}
      {phase === 'END' && resultTier && (
        <ResultModal
          metricValue={reaction.time ? `${reaction.time}초` : 'FAIL'}
          tone={resultTier.id === 'bare' ? 'failed' : 'success'}
          tiers={STAGE2_CONFIG.accuracyTiers.map((t, idx, arr) => {
            const prevMax = idx === 0 ? 0 : arr[idx - 1].maxError;
            return {
              ...t,
              isCurrent: resultTier.id === t.id,
              rangeLabel: t.maxError === Infinity
                ? '그 외'
                : `${prevMax.toFixed(2)}s~${t.maxError.toFixed(2)}s`,
            };
          })}
          hint={resultTier.id === 'bare' ? "훼이크에 속지 말고 끝까지 집중하세요." : ""} 
          continueText={mode === 'split' ? null : "ENTER를 눌러 계속"}
          onContinue={() => {
            if (onResult && pendingMetricRef.current !== null) {
              onResult(pendingMetricRef.current);
            }
          }}
        />
      )}
    </div>
  );
}
