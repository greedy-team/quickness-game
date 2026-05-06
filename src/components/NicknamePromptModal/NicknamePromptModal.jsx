import { useState, useCallback } from 'react';
import { rankingRepository } from '../../ranking/rankingRepository';
import './NicknamePromptModal.css';

export const MAX_NICKNAME_LENGTH = 16; // 백엔드 도입 시 정책에 맞춰 조정

export default function NicknamePromptModal({ score, onRegistered }) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmed = nickname.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const entry = await rankingRepository.register({ nickname: trimmed, score });
      onRegistered?.(entry.id);
    } catch (e) {
      console.error('[nickname] 등록 실패', e);
      setError('등록에 실패했습니다. 다시 시도해주세요.');
      setSubmitting(false);
    }
  }, [canSubmit, trimmed, score, onRegistered]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="nickname-modal-stage">
      <div className="nickname-modal-panel">
        <h1 className="nickname-modal-title">🏆 보스 처치!</h1>
        <p className="nickname-modal-score">최종 점수: <b>{score}</b></p>
        <p className="nickname-modal-prompt">랭킹에 등록할 닉네임을 입력하세요</p>

        <input
          className="nickname-modal-input"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={MAX_NICKNAME_LENGTH}
          placeholder={`최대 ${MAX_NICKNAME_LENGTH}자`}
          autoFocus
          disabled={submitting}
        />

        {error && <p className="nickname-modal-error">{error}</p>}

        <button
          type="button"
          className="nickname-modal-submit"
          onClick={submit}
          disabled={!canSubmit}
        >
          {submitting ? '등록 중...' : '등록 (Enter)'}
        </button>
      </div>
    </div>
  );
}
