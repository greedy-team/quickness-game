// src/routes/EndingPage/EndingNicknameForm.jsx
// 엔딩 컷씬 종료 후 userId 입력 폼.
// - 검증: trim 후 1자 이상만 허용 (형식 검증은 백엔드 담당).
// - IME(한글) 조합 중 Enter는 submit 무시 — 조합 끝난 직후 Enter만 동작.
// - isSubmitting 동안 버튼/Enter submit 차단.

import { useEffect, useRef, useState } from 'react';
import { ENDING_CONFIG } from './ending.config.js';
import { TOTAL_MAX_SCORE } from '../../scoring.js';
import { RANKING_CONFIG } from '../../ranking/ranking.config.js';
import './EndingNicknameForm.css';

export default function EndingNicknameForm({
  outcome,
  totalScore,
  isSubmitting = false,
  errorMessage = null,
  onSubmit,
}) {
  const [value, setValue] = useState('');
  const [composing, setComposing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 제출 실패 후 isSubmitting이 false로 돌아오면 input에 다시 포커스 — 재시도 흐름 매끄럽게.
  useEffect(() => {
    if (!isSubmitting) {
      inputRef.current?.focus();
    }
  }, [isSubmitting]);

  const trimmed = value.trim();
  const isValid = trimmed.length >= 1;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (composing) return;
    if (!isValid) return;
    if (isSubmitting) return;
    onSubmit(trimmed);
  };

  const outcomeLabel = RANKING_CONFIG.outcomeLabels[outcome] ?? outcome;
  const captionByOutcome = ENDING_CONFIG.captions[outcome] ?? '';
  const formStyle = { '--ending-nickname-reveal-ms': `${ENDING_CONFIG.formRevealMs}ms` };

  return (
    <form className="ending-nickname" style={formStyle} onSubmit={handleSubmit}>
      <p className="ending-nickname__heading">기록을 남겨주세요</p>
      <p className="ending-nickname__outcome">
        결말 <span className="ending-nickname__outcome-label">{outcomeLabel}</span>
      </p>
      <p className="ending-nickname__caption">{captionByOutcome}</p>
      <p className="ending-nickname__score">점수 {totalScore} / {TOTAL_MAX_SCORE}</p>

      <input
        ref={inputRef}
        className="ending-nickname__input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        placeholder="유저 ID 입력"
        autoComplete="off"
        spellCheck={false}
        disabled={isSubmitting}
      />

      {errorMessage && (
        <p className="ending-nickname__error" role="alert">{errorMessage}</p>
      )}

      <button
        type="submit"
        className="ending-nickname__submit"
        disabled={!isValid || composing || isSubmitting}
      >
        {isSubmitting ? '등록 중…' : '등록 (Enter)'}
      </button>
    </form>
  );
}
