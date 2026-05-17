// /ranking — 영속 랭킹 보드.
// - 마운트 시 GET /api/leader-board/quickness-game 호출.
// - 사용자 입력 없이는 자동 복귀하지 않는다.
// - Space/Enter 또는 "처음으로" 버튼 → resetGame + navigate('/').
//   단, 우측 상단 ID 조회 input에 포커스가 있을 땐 키 입력을 가로채지 않는다.
// - 우측 상단 input에 userId 입력 + Enter → getUserById로 nickname 조회 후 매칭 행 강조.

import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
import { fetchLeaderboard } from '../../api/leaderboard.js';
import { getUserById } from '../../api/users.js';
import './RankingPage.css';

const ADVANCE_KEYS = new Set(['Space', 'Enter']);
const TEXT_INPUT_TAGS = new Set(['INPUT', 'TEXTAREA']);

export default function RankingPage() {
  const navigate = useNavigate();
  const resetGame = useGameStore((s) => s.resetGame);
  const location = useLocation();
  const myNickname = location.state?.nickname ?? null;
  const myScore = location.state?.score ?? null;

  // null = 로딩 중, [] = 비어있음, [...] = 데이터 있음
  const [entries, setEntries] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // 우측 상단 수동 조회 상태
  const [userIdInput, setUserIdInput] = useState('');
  const [manualHighlight, setManualHighlight] = useState(null); // string | null (nickname)
  const [lookupStatus, setLookupStatus] = useState('idle'); // 'idle' | 'loading' | 'not_found' | 'error' | 'done'
  const lookupCounterRef = useRef(0);

  const goTitle = () => {
    resetGame();
    navigate('/');
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchLeaderboard();
      if (cancelled) return;
      if (result.ok) {
        setEntries(result.rankings);
      } else {
        setEntries([]);
        setErrorMessage(result.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handle = (e) => {
      // input/textarea 포커스 중엔 페이지 단축키 비활성 (입력 충돌 방지)
      if (e.target && TEXT_INPUT_TAGS.has(e.target.tagName)) return;
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        goTitle();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
    // navigate(react-router)와 resetGame(zustand selector)은 안정적 참조라 deps 생략 안전.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLookupSubmit = async (e) => {
    e.preventDefault();
    const trimmed = userIdInput.trim();
    if (trimmed === '') {
      // 빈 입력 → 강조 해제
      setManualHighlight(null);
      setLookupStatus('idle');
      return;
    }

    const myCounter = lookupCounterRef.current + 1;
    lookupCounterRef.current = myCounter;
    setLookupStatus('loading');

    const r = await getUserById(trimmed);

    // 더 최근 요청이 있으면 이 응답은 버린다
    if (myCounter !== lookupCounterRef.current) return;

    if (r.ok && r.user?.nickname) {
      setManualHighlight(r.user.nickname);
      setLookupStatus('done');
    } else if (!r.ok && (r.status === 0 || r.status >= 500)) {
      setManualHighlight(null);
      setLookupStatus('error');
    } else {
      // ok이지만 nickname 없음, 또는 4xx
      setManualHighlight(null);
      setLookupStatus('not_found');
    }
  };

  const isLoading = entries === null;
  const hasError = Boolean(errorMessage);
  const isEmpty = !isLoading && !hasError && entries.length === 0;
  const hasRows = !isLoading && !hasError && entries.length > 0;

  // 매칭 결정: manual 우선, 그 다음 location.state, 둘 다 없으면 매칭 없음.
  const isMine = (entry) => {
    if (manualHighlight != null) return entry.nickname === manualHighlight;
    if (myNickname != null && myScore != null) {
      return entry.nickname === myNickname && entry.score === myScore;
    }
    return false;
  };

  // 조회 상태 메시지 (loading/not_found/error/탑5 밖)
  let lookupMessage = '';
  if (lookupStatus === 'loading') {
    lookupMessage = '조회 중…';
  } else if (lookupStatus === 'not_found') {
    lookupMessage = 'ID를 찾을 수 없습니다';
  } else if (lookupStatus === 'error') {
    lookupMessage = '조회 오류, 잠시 후 다시 시도';
  } else if (
    lookupStatus === 'done'
    && manualHighlight != null
    && hasRows
    && !entries.some((e) => e.nickname === manualHighlight)
  ) {
    lookupMessage = '탑5에 기록이 없습니다';
  }

  return (
    <div className="ranking-page">
      <h1 className="ranking-page__headline">RANKING</h1>

      <form className="ranking-page__lookup" onSubmit={handleLookupSubmit}>
        <input
          type="text"
          className="ranking-page__lookup-input"
          placeholder="유저 ID로 내 행 찾기"
          value={userIdInput}
          onChange={(ev) => setUserIdInput(ev.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {lookupMessage && (
          <p className="ranking-page__lookup-status">{lookupMessage}</p>
        )}
      </form>

      {isLoading && (
        <p className="ranking-page__status">기록을 불러오는 중…</p>
      )}

      {hasError && (
        <p className="ranking-page__status ranking-page__status--error">{errorMessage}</p>
      )}

      {isEmpty && (
        <p className="ranking-page__empty">아직 기록이 없습니다.</p>
      )}

      {hasRows && (
        <ul className="ranking-list">
          {entries.map((e) => {
            const mine = isMine(e);
            const rowClass = mine
              ? 'ranking-list__row ranking-list__row--current'
              : 'ranking-list__row';
            return (
              <li key={e.rank} className={rowClass}>
                <span className="ranking-list__rank">#{e.rank}</span>
                <span className="ranking-list__nickname">{e.nickname}</span>
                <span className="ranking-list__score">{e.score}점</span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="ranking-page__hint">
        Space / Enter 키로 처음 화면으로 돌아갑니다.
      </p>

      <button type="button" className="ranking-page__back" onClick={goTitle}>
        처음으로
      </button>
    </div>
  );
}
