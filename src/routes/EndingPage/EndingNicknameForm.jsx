// 엔딩 컷씬 종료 후 닉네임 입력 폼.
// trim 후 1~8자만 등록 허용. 그 외 문자 검증 없음(정규식 X — 후속 이슈로 분리).
// IME(한글) 조합 중 Enter는 submit 무시 — 조합 끝난 직후 Enter만 동작.

import { useEffect, useRef, useState } from 'react';
import { RANKING_CONFIG } from '../../ranking/ranking.config.js';
import { ENDING_CONFIG } from './ending.config.js';
import { TOTAL_MAX_SCORE } from '../../scoring.js';
import './EndingNicknameForm.css';

export default function EndingNicknameForm({ outcome, totalScore, onSubmit }) {
  const [value, setValue] = useState('');
  const [composing, setComposing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = value.trim();
  const isValid =
    trimmed.length >= RANKING_CONFIG.nicknameMinLength &&
    trimmed.length <= RANKING_CONFIG.nicknameMaxLength;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (composing) return;
    if (!isValid) return;
    onSubmit(trimmed);
  };

  const outcomeLabel = RANKING_CONFIG.outcomeLabels[outcome] ?? outcome;
  const captionByOutcome = ENDING_CONFIG.captions[outcome] ?? '';
  // ENDING_CONFIG.formRevealMs를 CSS custom property로 전달 — 애니메이션 길이의 단일 소스.
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
        maxLength={RANKING_CONFIG.nicknameMaxLength}
        placeholder={`닉네임 (${RANKING_CONFIG.nicknameMinLength}-${RANKING_CONFIG.nicknameMaxLength}자)`}
        autoComplete="off"
        spellCheck={false}
      />

      <button
        type="submit"
        className="ending-nickname__submit"
        disabled={!isValid || composing}
      >
        등록 (Enter)
      </button>
    </form>
  );
}
