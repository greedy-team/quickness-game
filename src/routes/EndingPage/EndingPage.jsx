// /ending/:outcome — Stage 4 종료 직후 컷씬 → userId 입력 → 등록 → 랭킹 진입의 호스트.
// state machine: entered → reveal → hold → leaving → register → success → outro → /ranking
//
// 키 정책:
// - reveal/hold:  Space/Enter → leaving 즉시 진입
// - leaving:      추가 스킵 없음 (짧은 fade)
// - register:     윈도우 keydown listener OFF, 폼 내부 Enter만 submit
// - success:      Space/Enter → outro 즉시 진입
// - outro:        Space/Enter → /ranking 즉시 진입

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, selectTotalScore } from '../../store.js';
import { submitResult } from '../../api/result.js';
import { ENDING_CONFIG } from './ending.config.js';
import EndingCutscene from './EndingCutscene.jsx';
import EndingNicknameForm from './EndingNicknameForm.jsx';
import RegisterSuccessModal from './RegisterSuccessModal.jsx';
import './EndingPage.css';

const ADVANCE_KEYS = new Set(['Space', 'Enter']);

export default function EndingPage({ outcome }) {
  const navigate = useNavigate();
  const totalScore = useGameStore(selectTotalScore);

  const [phase, setPhase] = useState('entered');
  const [highlightId, setHighlightId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [submittedScore, setSubmittedScore] = useState(null);

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

  // hold → leaving: 키 입력으로만 진행

  // leaving → register (leaveMs 후)
  useEffect(() => {
    if (phase !== 'leaving') return undefined;
    const id = setTimeout(() => setPhase('register'), ENDING_CONFIG.leaveMs);
    return () => clearTimeout(id);
  }, [phase]);

  // outro → /ranking (outroMs 후)
  useEffect(() => {
    if (phase !== 'outro') return undefined;
    const id = setTimeout(
      () => navigate('/ranking', { state: { highlightId } }),
      ENDING_CONFIG.outroMs,
    );
    return () => clearTimeout(id);
  }, [phase, navigate, highlightId]);

  // reveal/hold 키 입력 — leaving 진입
  useEffect(() => {
    if (phase !== 'reveal' && phase !== 'hold') return undefined;
    const handle = (e) => {
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        setPhase('leaving');
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [phase]);

  // success 키 입력 — outro 즉시 진입
  useEffect(() => {
    if (phase !== 'success') return undefined;
    const handle = (e) => {
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        setPhase('outro');
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [phase]);

  // outro 키 입력 — 즉시 /ranking
  useEffect(() => {
    if (phase !== 'outro') return undefined;
    const handle = (e) => {
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        navigate('/ranking', { state: { highlightId } });
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [phase, navigate, highlightId]);

  const handleUserIdSubmit = async (userId) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await submitResult({ userId, score: totalScore });

    if (result.ok) {
      setSubmittedScore(totalScore);
      setHighlightId(userId);
      setIsSubmitting(false);
      setPhase('success');
      return;
    }

    setErrorMessage(result.message);
    setIsSubmitting(false);
  };

  const handleSuccessModalClose = () => {
    setPhase('outro');
  };

  return (
    <div className="ending-page">
      {(phase === 'entered'
        || phase === 'reveal'
        || phase === 'hold'
        || phase === 'leaving') && (
        <EndingCutscene
          outcome={outcome}
          phase={phase}
          totalScore={totalScore}
        />
      )}
      {phase === 'register' && (
        <EndingNicknameForm
          outcome={outcome}
          totalScore={totalScore}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onSubmit={handleUserIdSubmit}
        />
      )}
      {phase === 'success' && (
        <RegisterSuccessModal
          score={submittedScore ?? totalScore}
          onClose={handleSuccessModalClose}
        />
      )}
      {phase === 'outro' && <div className="ending-page__outro" />}
    </div>
  );
}
