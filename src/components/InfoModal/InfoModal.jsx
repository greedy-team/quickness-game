import React from 'react';
import './InfoModal.css';

export default function InfoModal({ onClose }) {
  return (
    <div className="info-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="info-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="info-modal-title"
      >
        <div className="info-modal__header">
          <h2 id="info-modal-title">게임 설명</h2>
          <button type="button" className="info-modal__close" onClick={onClose} aria-label="닫기">×</button>
        </div>
        <div className="info-modal__body">
          <p className="info-modal__horror">그린이는 나야,</p>
          <p className="info-modal__horror">둘이 될 수 없어.</p>
          <ul>
            <li>Stage 1 — 괘종시계: <span className="info-modal__arrow">←</span> 키</li>
            <li>Stage 2 — 반응속도: <span className="info-modal__arrow">↑</span> 키</li>
            <li>Stage 3 — 캐치: <span className="info-modal__arrow">→</span> 키</li>
            <li>Stage 4 — 최종전: <span className="info-modal__arrow">←</span> / <span className="info-modal__arrow">↑</span> / <span className="info-modal__arrow">→</span> 동시</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
