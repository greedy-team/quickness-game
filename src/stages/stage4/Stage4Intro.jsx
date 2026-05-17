// Stage 4 ready 화면 — Stage 1/2/3과 동일한 stage-info-screen 패턴
import React from 'react';
import './Stage4Intro.css';

export default function Stage4Intro({ onStart }) {
  return (
    <div className="stage-info-screen stage4-intro-screen">
      <div className="info-top-section">
        <h1 className="stage-title">4단계: 최종 시련</h1>
      </div>

      <div className="info-middle-section">
        <div className="simple-preview-image stage4-preview-triptych">
          <img src="/assets/images/bg_stage1_clock_example.png" alt="Stage 1 Preview" />
          <img src="/assets/images/bg_stage2_library_fake.png" alt="Stage 2 Preview" />
          <img src="/assets/images/bg_stage3_example.png" alt="Stage 3 Preview" />
        </div>

        <div className="instruction-item">
          <div className="arrow-keys-cluster">
            <div className="arrow-row">
              <div className="key-cap top-active">↑</div>
            </div>
            <div className="arrow-row">
              <div className="key-cap left-active">←</div>
              <div className="key-cap">↓</div>
              <div className="key-cap right-active">→</div>
            </div>
          </div>
          <div className="main-instruction-text">
            3개 시련을 동시에<br/>
            <span className="highlight-key">[←][↑][→] 키</span>로 클리어하세요
          </div>
        </div>
      </div>

      <div className="info-bottom-section">
        <div className="key-icon-wrapper start-btn" onClick={onStart}>
          <span>GAME START</span>
        </div>
        <p className="sub-instruction-text">ENTER 키를 눌러 시작</p>
      </div>
    </div>
  );
}
