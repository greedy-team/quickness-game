import { useCallback, useEffect, useRef, useState } from 'react';
import Stage3Intro from './Stage3Intro.jsx';
import Stage3Field from './Stage3Field.jsx';
import ResultModal from '../../components/ResultModal/ResultModal.jsx';
import { ASSETS } from '../../assets.js';
import { BGM_DEFAULTS } from '../../audio/trackRegistry.js';
import { useAudioVolume } from '../../audio/useAudioVolume.js';
import { STAGE3_CONFIG } from './stage3.config.js';
import { useGameStore } from '../../store.js';
import './Stage3Game.css';

export default function Stage3Game({ mode = 'standalone', isRunning, onResult }) {
  // local phase: 'ready' | 'running' | 'result'
  // 💡 카운트다운('countdown', 'go') 단계를 완전히 제거했습니다.
  const [phase, setPhase] = useState('ready');
  const [resultData, setResultData] = useState(null);
  const audioRef = useRef(null);
  const finishTimeoutRef = useRef(null);
  const bgmVolume = useAudioVolume('bgm');

  // 💡 게임 시작 공통 함수 (마우스 클릭 & 키보드 공용)
  // ready 상태에서 즉시 running으로 넘어갑니다.
  const handleStartGame = useCallback(() => {
    if (phase === 'ready') {
      setPhase('running');
    }
  }, [phase]);

  // standalone: Space/Enter 키로 self-trigger
  useEffect(() => {
    if (mode !== 'standalone') return;
    if (phase !== 'ready') return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, phase, handleStartGame]);

  // split: isRunning prop watch
  useEffect(() => {
    if (mode !== 'split') return;
    if (isRunning && phase === 'ready') setPhase('running');
  }, [mode, isRunning, phase]);

  // BGM 제어: running 상태에서만 바로 재생
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (mode === 'standalone' && phase === 'running') {
      audio.volume = bgmVolume;
      audio.loop = BGM_DEFAULTS.loop;
      audio.play().catch(() => {});
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [mode, phase, bgmVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = bgmVolume;
  }, [bgmVolume]);

  useEffect(() => {
    if (phase !== 'running') return undefined;
    if (mode === 'split') return undefined;
    const { setActivePlayStageId } = useGameStore.getState();
    setActivePlayStageId(3);
    return () => setActivePlayStageId(null);
  }, [phase, mode]);

  const handleFieldDone = useCallback((data) => {
    setResultData(data);
    setPhase('result');
    if (mode === 'split') {
      finishTimeoutRef.current = setTimeout(() => {
        onResult(data.metric, { score: data.totalScore });
        finishTimeoutRef.current = null;
      }, 1500);
    }
  }, [mode, onResult]);

  // standalone result phase — Space/Enter 키 입력 시 hub로 이동
  useEffect(() => {
    if (mode !== 'standalone') return;
    if (phase !== 'result') return;
    if (!resultData) return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onResult(resultData.metric, { score: resultData.totalScore });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, phase, resultData, onResult]);

  useEffect(() => () => {
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
  }, []);

  const modalProps = (() => {
    if (!resultData) return null;
    const { caughtCount, missedCount, realCount, totalScore } = resultData;
    const isSuccess = caughtCount >= realCount / 2;

    const breakdown = [];
    if (caughtCount > 0) {
      breakdown.push({
        label: '캐치',
        value: `${caughtCount}개`,
        delta: `+${caughtCount * STAGE3_CONFIG.catchPoints}`,
        color: '#FFD700',
      });
    }
    if (missedCount > 0) {
      breakdown.push({
        label: '놓침',
        value: `${missedCount}개`,
        delta: null,
        color: '#888',
      });
    }

    return {
      metricValue: `${caughtCount} / ${realCount}`,
      breakdown,
      score: totalScore,
      tone: isSuccess ? 'success' : 'failed',
      continueText: mode === 'split' ? null : "ENTER를 눌러 계속",
      onContinue: () => {
        onResult(resultData.metric, { score: resultData.totalScore });
      }
    };
  })();

  return (
    <div className={`stage3-game stage3-game--${mode}`}>
      {mode === 'standalone' && phase === 'running' && (
        <div className="stage-key-hint" style={{display: 'none'}}>노란선에 위치했을 때 → 키를 누르세요</div>
      )}

      {phase === 'ready' && mode === 'standalone' && (
        <Stage3Intro onStart={handleStartGame} />
      )}

      {(phase === 'running' || phase === 'result') && (
        <Stage3Field
          isRunning={phase === 'running'}
          onResult={handleFieldDone}
        />
      )}

      {/* 💡 기존의 s3-split-result 텍스트 창 삭제하고, 무조건 ResultModal이 뜨도록 수정! */}
      {phase === 'result' && modalProps && (
        <ResultModal {...modalProps} />
      )}

      {mode === 'standalone' && (
        <audio ref={audioRef} src={ASSETS.sounds.bgmStage3} preload="auto" />
      )}
    </div>
  );
}
