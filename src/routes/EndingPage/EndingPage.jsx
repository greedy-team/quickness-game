// /ending/:outcome — Stage 4 종료 직후 컷씬 → 닉네임 입력 → 랭킹 진입의 호스트.
// state machine: entered → reveal → hold → leaving → register → outro → /ranking
//
// 키 정책:
// - reveal/hold:  Space/Enter → leaving 즉시 진입
// - leaving:      추가 스킵 없음 (짧은 fade)
// - register:     윈도우 keydown listener OFF, 폼 내부 Enter만 submit
// - outro:        Space/Enter → /ranking 즉시 진입

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, selectTotalScore } from '../../store.js';
import { ENDING_CONFIG } from './ending.config.js';
import { appendRankingEntry } from '../../ranking/rankingStore.js';
import EndingCutscene from './EndingCutscene.jsx';
import EndingNicknameForm from './EndingNicknameForm.jsx';
import './EndingPage.css';

const ADVANCE_KEYS = new Set(['Space', 'Enter']);

export default function EndingPage({ outcome }) {
  const navigate = useNavigate();
  const totalScore = useGameStore(selectTotalScore);

  const [phase, setPhase] = useState('entered'); // entered | reveal | hold | leaving | register | outro
  const [highlightId, setHighlightId] = useState(null);

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

  // leaving → register (leaveMs 후, 컷씬 페이드아웃 완료)
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

  // 컷씬 단계 키 입력 — reveal/hold만 leaving으로 즉시 진입
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

  // outro 단계 키 입력 — 즉시 /ranking
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

  const handleNicknameSubmit = (nickname) => {
    // 폼이 빈 입력을 차단하므로 throw는 도달 불가하지만, 방어적 try/catch로
    // 예상치 못한 실패에도 사용자가 컷씬에 갇히지 않고 outro로 진행하게 한다.
    try {
      const entry = appendRankingEntry({ nickname, score: totalScore, outcome });
      setHighlightId(entry.id);
    } catch (err) {
      console.warn('[EndingPage] appendRankingEntry 실패 — 등록 없이 진행', err);
    }
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
          onSubmit={handleNicknameSubmit}
        />
      )}
      {phase === 'outro' && <div className="ending-page__outro" />}
    </div>
  );
}
