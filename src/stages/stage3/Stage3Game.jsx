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
    finishTimeoutRef.current = setTimeout(() => {
      onResult(data.metric, { score: data.totalScore });
      finishTimeoutRef.current = null;
    }, mode === 'split' ? 1500 : 4000);
  }, [mode, onResult]);

  // standalone result phase — 키 입력 시 대기시간을 건너뛰고 즉시 hub로 이동.
  useEffect(() => {
    if (mode !== 'standalone') return;
    if (phase !== 'result') return;
    if (!resultData) return;

    const skip = () => {
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
      }
      onResult(resultData.metric, { score: resultData.totalScore });
    };
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        skip();
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
    const {
      caughtCount,
      realCount,
      totalScore,
      tierCounts = {},
      fakeCaught = 0,
      realMissed = 0,
    } = resultData;
    const ratio = realCount > 0 ? caughtCount / realCount : 0;
    const isSuccess = ratio >= 0.5;
    let comment;
    if (ratio >= 0.85) comment = '기억의 조각을 모두 모았습니다.';
    else if (ratio >= 0.5) comment = '대부분의 조각을 회수했습니다.';
    else comment = '기억이 흩어져버렸습니다.';

    // 부호 포함 점수 델타 포맷 — 0 은 표시 안 함(놓침은 0점이라 의미가 약하므로 생략).
    const formatDelta = (n) => {
      if (n > 0) return `+${n}`;
      if (n < 0) return `${n}`;
      return null;
    };

    // tier별 캐치 횟수: 0 회는 숨겨 가독성 확보.
    const breakdown = STAGE3_CONFIG.accuracyTiers
      .map((t) => {
        const count = tierCounts[t.id] ?? 0;
        return {
          label: t.label,
          value: `${count}개`,
          delta: formatDelta(count * t.points),
          color: t.color,
          count,
        };
      })
      .filter((row) => row.count > 0)
      .map(({ count, ...row }) => row);

    if (fakeCaught > 0) {
      breakdown.push({
        label: `${STAGE3_CONFIG.fakeLabel} 캐치`,
        value: `${fakeCaught}개`,
        delta: formatDelta(fakeCaught * STAGE3_CONFIG.fakePenalty),
        color: '#FF3333',
      });
    }
    if (realMissed > 0) {
      breakdown.push({
        label: STAGE3_CONFIG.missLabel,
        value: `${realMissed}개`,
        delta: formatDelta(realMissed * STAGE3_CONFIG.missScore),
        color: '#888',
      });
    }

    return {
      headline: isSuccess ? 'MEMORY RECOVERED' : 'PIECES LOST',
      tierComment: comment,
      metricLabel: 'PIECES',
      metricValue: `${caughtCount}/${realCount}`,
      breakdown,
      score: totalScore,
      tone: isSuccess ? 'success' : 'failed',
      hint: mode === 'standalone' ? '아무 키나 눌러 계속...' : null,
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
