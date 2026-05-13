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
          <p>그린이의 얼굴을 한 &ldquo;가짜&rdquo;가 그린이를 헤치려 합니다.</p>
          <p>그린이 행세를 하는 &ldquo;가짜&rdquo;를 물리치기 위해 4가지 게임을 통과해야합니다.</p>
        </div>
      </div>
    </div>
  );
}
