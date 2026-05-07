// /ending — Stage 4 종료 후 누적 점수 기반 성공/실패 컷씬 분기.
// state machine: entered → reveal → hold → leaving → /ranking
//
// timing 파라미터는 ENDING_CONFIG에서 조정.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, selectTotalScore, selectEndingOutcome } from '../../store.js';
import { ENDING_CONFIG } from './ending.config.js';
import EndingCutscene from './EndingCutscene.jsx';
import './EndingPage.css';

const ADVANCE_KEYS = new Set(['Space', 'Enter']);

export default function EndingPage() {
  const navigate = useNavigate();
  const totalScore = useGameStore(selectTotalScore);

  // outcome은 마운트 시 한 번만 평가 — 진행 중 store가 바뀌어도 결말은 고정.
  const outcomeAtMount = useMemo(
    () => selectEndingOutcome(useGameStore.getState()),
    [],
  );

  const [phase, setPhase] = useState('entered'); // entered | reveal | hold | leaving

  // entered → reveal (즉시)
  useEffect(() => {
    if (phase !== 'entered') return undefined;
    const id = requestAnimationFrame(() => setPhase('reveal'));
    return () => cancelAnimationFrame(id);
  }, [phase]);

  // reveal → hold (revealMs 후)
  useEffect(() => {
    if (phase !== 'reveal') return undefined;
    const id = setTimeout(() => setPhase('hold'), ENDING_CONFIG.revealMs);
    return () => clearTimeout(id);
  }, [phase]);

  // hold → leaving (holdMs 후 자동)
  useEffect(() => {
    if (phase !== 'hold') return undefined;
    const id = setTimeout(() => setPhase('leaving'), ENDING_CONFIG.holdMs);
    return () => clearTimeout(id);
  }, [phase]);

  // leaving → /ranking (leaveMs 후)
  useEffect(() => {
    if (phase !== 'leaving') return undefined;
    const id = setTimeout(() => navigate('/ranking'), ENDING_CONFIG.leaveMs);
    return () => clearTimeout(id);
  }, [phase, navigate]);

  // 키 입력으로 즉시 leaving 진입 (이미 leaving이면 무시)
  useEffect(() => {
    if (phase === 'leaving') return undefined;
    const handle = (e) => {
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        setPhase('leaving');
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [phase]);

  return (
    <div className="ending-page">
      <EndingCutscene
        outcome={outcomeAtMount}
        phase={phase}
        totalScore={totalScore}
      />
    </div>
  );
}
