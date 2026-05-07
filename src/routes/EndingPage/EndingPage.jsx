// /ending/:outcome — Stage 4 종료 직후 StagePage가 누적 점수로 outcome을 결정해
// /ending/alive 또는 /ending/silhouette로 navigate. EndingPage는 outcome을 prop으로 받아
// 그에 맞는 컷씬을 렌더한다 (라우트 자체가 분기 — URL이 결말의 단일 진실 공급원).
// state machine: entered → reveal → hold → leaving → /ranking
//
// timing 파라미터는 ENDING_CONFIG에서 조정.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, selectTotalScore } from '../../store.js';
import { ENDING_CONFIG } from './ending.config.js';
import EndingCutscene from './EndingCutscene.jsx';
import './EndingPage.css';

const ADVANCE_KEYS = new Set(['Space', 'Enter']);

export default function EndingPage({ outcome }) {
  const navigate = useNavigate();
  const totalScore = useGameStore(selectTotalScore);

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
        outcome={outcome}
        phase={phase}
        totalScore={totalScore}
      />
    </div>
  );
}
