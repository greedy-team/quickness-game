// Stage 3 entry — sub-stage contract 진입점.
// state machine: idle → running → result
// standalone: 본인 인트로 + Space listen / split: isRunning prop 신호

import { useCallback, useEffect, useRef, useState } from 'react';
import Stage3Intro from './Stage3Intro.jsx';
import Stage3Field from './Stage3Field.jsx';
import ResultModal from '../../components/ResultModal/ResultModal.jsx';
import { ASSETS } from '../../assets.js';
import { BGM_DEFAULTS } from '../../audio/trackRegistry.js';
import { useAudioVolume } from '../../audio/useAudioVolume.js';
import { STAGE3_CONFIG } from './stage3.config.js';
import './Stage3Game.css';

export default function Stage3Game({ mode = 'standalone', isRunning, onResult }) {
  // local phase: 'idle' | 'running' | 'result'
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
  // standalone/split 모두 결과 모달을 노출해 점수 획득 내역을 보여준 뒤 onResult 호출.
  // raw totalScore를 score로 함께 넘김 — standalone과 Stage4 split 둘 다 누적에 그대로 반영.
  const handleFieldDone = useCallback((data) => {
    setResultData(data);
    setPhase('result');
    // split은 타이머 자동 진행, standalone은 키 입력 대기
    if (mode === 'split') {
      finishTimeoutRef.current = setTimeout(() => {
        onResult(data.metric, { score: data.totalScore });
        finishTimeoutRef.current = null;
      }, 1500);
    }
  }, [mode, onResult]);

  // standalone result phase — Space/Enter 키 입력 시 hub로 이동.
  useEffect(() => {
    if (mode !== 'standalone') return;
    if (phase !== 'result') return;
    if (!resultData) return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        onResult(resultData.metric, { score: resultData.totalScore });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, phase, resultData, onResult]);

  // finishTimeoutRef cleanup on unmount
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

    let comment;
    if (caughtCount === realCount)         comment = '모든 기억을 되찾았습니다.';
    else if (caughtCount >= realCount / 2) comment = '대부분의 조각을 회수했습니다.';
    else                                   comment = '기억이 흩어져버렸습니다.';

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
      metricLabel: 'PIECES',
      metricValue: `${caughtCount}/${realCount}`,
      breakdown,
      score: undefined,
      maxScore: undefined,
      tone: isSuccess ? 'success' : 'failed',
      hint: mode === 'standalone' ? 'Space / Enter 로 계속' : null,
      tierComment: comment,
    };
  })();

  return (
    <div className={`stage3-game stage3-game--${mode}`}>
      {phase === 'idle' && mode === 'standalone' && <Stage3Intro />}
      {(phase === 'running' || phase === 'result') && (
        <Stage3Field
          isRunning={phase === 'running'}
          onResult={handleFieldDone}
        />
      )}
      {phase === 'result' && modalProps && (
        <ResultModal {...modalProps} />
      )}
      {mode === 'standalone' && (
        <audio ref={audioRef} src={ASSETS.sounds.bgmStage3} preload="auto" />
      )}
    </div>
  );
}
