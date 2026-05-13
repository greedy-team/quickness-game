import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Stage2Placeholder.css';
import { STAGE2_CONFIG } from './stage2.config.js';
import { pointsForError, metricFromPoints } from '../common/reactionScoring.js';
import { scoreFromMetric, maxScoreForStage } from '../../scoring.js';
import ResultModal from '../../components/ResultModal/ResultModal.jsx';
import { useAudioVolume } from '../../audio/useAudioVolume.js';
import { useAudioStore } from '../../audio/useAudioStore.js';
import { playSfx } from '../../audio/playSfx.js';

// 💡 1. 사운드 파일 경로 정의
const SOUNDS = {
  BGM: '/assets/sounds/stage2_bgm_static.mp3',         // 사아아 (루프)
  FAKE: '/assets/sounds/stage2_sfx_glitch.mp3',        // 치지직 (훼이크)
  REAL: '/assets/sounds/stage2_sfx_jumpscare.mp3',     // 콰아아앙 (진짜)
  SHUTTER: '/assets/sounds/stage2_sfx_shutter.mp3',    // 찰칵
};

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

  // 💡 2. BGM 오디오 객체를 담아둘 Ref
  const bgmRef = useRef(null);

  // 🚀 [추가] 0.2초 딜레이 소리를 취소하기 위한 전용 Ref
  const jumpscareAudioTimeoutRef = useRef(null);
  // 🚀 [추가] 재생 중인 점프스케어 오디오 인스턴스를 추적하기 위한 Ref
  const realAudioRef = useRef(null);
  const pendingResultRef = useRef(null);

  const syncPhase = (p) => { stateRef.current.phase = p; setPhase(p); };
  const syncGameState = (g) => { stateRef.current.gameState = g; setGameState(g); };

  // 💡 3. 컴포넌트 마운트 시 오디오 객체 및 이미지 프리로드
  useEffect(() => {
    Object.values(BGS).forEach(src => { const img = new Image(); img.src = src; });

    bgmRef.current = new Audio(SOUNDS.BGM);
    bgmRef.current.loop = true;

    return () => {
      const bgm = bgmRef.current;
      if (bgm) { bgm.pause(); bgm.currentTime = 0; }
      // 🚀 [추가] 언마운트 시 예약된 점프스케어 타이머도 취소
      if (jumpscareAudioTimeoutRef.current) {
        clearTimeout(jumpscareAudioTimeoutRef.current);
      }
      if (realAudioRef.current) {
        realAudioRef.current.pause();
        realAudioRef.current = null;
      }
    };
  }, []);

  // 💡 4. BGM 볼륨 (scale 0.5 로 기존 톤 유지)
  const bgmVolume = useAudioVolume('bgm', { scale: 0.5 }); // 기존 0.5 톤 유지

  // 💡 5. 페이즈에 따른 BGM(사아아) 제어
  useEffect(() => {
    const bgm = bgmRef.current;
    if (!bgm) return;

    if (phase === 'PLAY' && isRunning) {
      bgm.volume = bgmVolume;
      bgm.currentTime = 86; // 1분 26초부터 재생 시작
      bgm.play().catch(() => {});
    } else {
      bgm.pause();
    }
  }, [phase, isRunning, bgmVolume]);

  // BGM 볼륨 실시간 동기화
  useEffect(() => {
    const bgm = bgmRef.current;
    if (bgm) bgm.volume = bgmVolume;
  }, [bgmVolume]);

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

    const score = scoreFromMetric(2, metric);
    setReaction({ time: rTime, comment: rComment });
    setResultTier(tier);
    setResultScore(score);
    pendingResultRef.current = { metric, score };
    syncPhase('END');

    // 🚀 [추가] 게임 종료 시 점프스케어 타이머 취소
    if (jumpscareAudioTimeoutRef.current) {
      clearTimeout(jumpscareAudioTimeoutRef.current);
    }

    // 🚀 게임 종료 시 몬스터 소리 완전 정지 (regression fix)
    if (realAudioRef.current) {
      realAudioRef.current.pause();
      realAudioRef.current.currentTime = 0;
      realAudioRef.current = null;
    }

    // split 모드는 타이머로 자동 진행, standalone은 키 입력 대기
    if (mode === 'split') {
      setTimeout(() => {
        if (onResult) onResult(metric, { score });
      }, 1500);
    }
  }, [onResult, mode]);

  const handleShutter = useCallback(() => {
    if (stateRef.current.phase !== 'PLAY' || stateRef.current.isFinished) return;

    // 🚀 [추가] 점프스케어 소리 예약이 있으면 즉시 취소
    if (jumpscareAudioTimeoutRef.current) {
      clearTimeout(jumpscareAudioTimeoutRef.current);
    }

    // 🚀 셔터 누르는 순간 몬스터 소리가 재생 중이면 즉시 정지 (regression fix)
    if (realAudioRef.current) {
      realAudioRef.current.pause();
      realAudioRef.current.currentTime = 0;
      realAudioRef.current = null;
    }

    // 💡 셔터음 재생 (찰칵!)
    playSfx(SOUNDS.SHUTTER, { durationMs: 500 });

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
        
        // 💡 훼이크 이미지 등장 시 효과음 재생 (치지직! 0.4초간)
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
          const audio = new Audio(SOUNDS.REAL);
          // 🚀 파일의 0.5초(공백이 끝나는 지점)부터 바로 쾅! 터지게 설정
          audio.currentTime = 0.5;
          const { sfxVolume, isMuted } = useAudioStore.getState();
          audio.volume = isMuted ? 0 : sfxVolume;
          audio.play().catch(() => {});
          realAudioRef.current = audio;
        }
      }, );

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
      else if (stateRef.current.phase === 'END' && mode !== 'split' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        const r = pendingResultRef.current;
        if (onResult && r) onResult(r.metric, { score: r.score });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleShutter, mode, onResult]);

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

      </div>

      {phase === 'END' && resultTier && (
        <ResultModal
          metricLabel={reaction.time ? 'REACTION TIME' : null}
          metricValue={reaction.time ? `${reaction.time}s` : null}
          score={resultScore}
          maxScore={maxScoreForStage(2)}
          tone={resultTier.id !== 'bare' ? 'success' : 'failed'}
          tiers={STAGE2_CONFIG.accuracyTiers.map((t) => ({
            label: t.label,
            rangeLabel: t.maxError === Infinity ? '그 외' : `${t.maxError.toFixed(2)}초 이내`,
            points: t.points,
            isCurrent: resultTier.id === t.id,
            color: t.color,
          }))}
          hint={mode !== 'split' ? 'Space / Enter 로 계속' : null}
        />
      )}
    </div>
  );
}
