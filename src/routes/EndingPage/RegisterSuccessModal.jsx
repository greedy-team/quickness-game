// src/routes/EndingPage/RegisterSuccessModal.jsx
// 결과 등록 성공 모달. Enter/Space는 EndingPage에서 처리하고, 본 컴포넌트는 표현만 담당.

import './RegisterSuccessModal.css';

export default function RegisterSuccessModal({ score, onClose }) {
  return (
    <div
      className="register-success-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="register-success-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-success-title"
      >
        <div className="register-success-modal__header">
          <h2 id="register-success-title">기록 등록 완료</h2>
          <button
            type="button"
            className="register-success-modal__close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className="register-success-modal__body">
          <p className="register-success-modal__lead">기록이 등록되었습니다.</p>
          <p className="register-success-modal__score">점수 {score}점</p>
          <p className="register-success-modal__hint">Enter / Space 또는 닫기 버튼으로 랭킹으로 이동합니다.</p>
        </div>
      </div>
    </div>
  );
}
