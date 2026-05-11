// Stage 3 entry — sub-stage contract 진입점.
// state machine: idle → running → done
// standalone: 본인 인트로 + Space listen / split: isRunning prop 신호

import { useCallback, useEffect, useRef, useState } from 'react';
import Stage3Intro from './Stage3Intro.jsx';
import Stage3Field from './Stage3Field.jsx';
import ResultModal from '../../components/ResultModal/ResultModal.jsx';
import { ASSETS } from '../../assets.js';
import { BGM_DEFAULTS } from '../../audio/trackRegistry.js';
import { useAudioVolume } from '../../audio/useAudioVolume.js';
import './Stage3Game.css';

export default function Stage3Game({ mode = 'standalone', isRunning, onResult }) {
  // local phase: 'idle' | 'running' | 'result' | 'done'
  const [phase, setPhase] = useState('idle');
  const [resultData, setResultData] = useState(null);
  const audioRef = useRef(null);
  const finishTimeoutRef = useRef(null);
  const bgmVolume = useAudioVolume('bgm');

  // standalone: Space 키로 self-trigger
  useEffect(() => {
    if (mode !== 'standalone') return;
    if (phase !== 'idle') return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setPhase('running');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, phase]);

  // split: isRunning prop watch
  useEffect(() => {
    if (mode !== 'split') return;
    if (isRunning && phase === 'idle') setPhase('running');
  }, [mode, isRunning, phase]);

  // BGM: standalone 모드의 running phase에서만 재생.
  // 라우트 기반 BgmController 대신 phase 기반 로컬 제어 — split 모드에서는
  // 다른 분할과의 오디오 충돌 방지 위해 비활성.
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

  // useAudioStore 의 bgmVolume 변경 시 현재 재생 중인 BGM 에 즉시 반영
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = bgmVolume;
  }, [bgmVolume]);

  // useCallback으로 안정화 — Stage3Field의 useEffect deps에 들어가기 때문.
  // onResult가 안정적이라면 handleFieldDone도 안정적이어야 RAF 루프가 리셋되지 않음.
  const handleFieldDone = useCallback((data) => {
    if (mode === 'split') {
      setResultData(data);
      setPhase('result');
      finishTimeoutRef.current = setTimeout(() => {
        onResult(data.metric);
        finishTimeoutRef.current = null;
      }, 1500);
    } else {
      setPhase('done');
      onResult(data.metric);
    }
  }, [mode, onResult]);

  // finishTimeoutRef cleanup on unmount
  useEffect(() => () => {
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
  }, []);

  const modalProps = (() => {
    if (!resultData) return null;
    const { caughtCount, realCount, totalScore } = resultData;
    const ratio = realCount > 0 ? caughtCount / realCount : 0;
    const isSuccess = ratio >= 0.5;
    let comment;
    if (ratio >= 0.85) comment = '기억의 조각을 모두 모았습니다.';
    else if (ratio >= 0.5) comment = '대부분의 조각을 회수했습니다.';
    else comment = '기억이 흩어져버렸습니다.';
    return {
      headline: isSuccess ? 'MEMORY RECOVERED' : 'PIECES LOST',
      tierComment: comment,
      metricLabel: 'PIECES',
      metricValue: `${caughtCount}/${realCount}`,
      score: totalScore,
      tone: isSuccess ? 'success' : 'failed',
    };
  })();

  return (
    <div className={`stage3-game stage3-game--${mode}`}>
      {phase === 'idle' && mode === 'standalone' && <Stage3Intro />}
      {(phase === 'running' || phase === 'result' || phase === 'done') && (
        <Stage3Field
          isRunning={phase === 'running'}
          onResult={handleFieldDone}
        />
      )}
      {phase === 'result' && mode === 'split' && modalProps && (
        <ResultModal {...modalProps} />
      )}
      {mode === 'standalone' && (
        <audio ref={audioRef} src={ASSETS.sounds.bgmStage3} preload="auto" />
      )}
    </div>
  );
}
