// Stage 4 ready 화면 — Stage 1/2/3과 동일한 stage-info-screen 패턴
import React from 'react';
import './Stage4Intro.css';

export default function Stage4Intro({ onStart }) {
  return (
    <div className="stage-info-screen stage4-intro-screen">
      <div className="info-top-section">
        <h1 className="stage-title">4단계: 통합 게임</h1>
      </div>

      <div className="info-middle-section">
        <div className="simple-preview-image stage4-preview-triptych">
          <img src="/assets/images/bg_stage1_clock_example.webp" alt="Stage 1 Preview" />
          <img src="/assets/images/bg_stage2_library_fake.webp" alt="Stage 2 Preview" />
          <img src="/assets/images/bg_stage3_example.webp" alt="Stage 3 Preview" />
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
          <div className="main-instruction-text" style={{ textAlign: 'left', paddingLeft: '10px' }}>
            10초 게임 : <span className="highlight-key">[←] 키</span><br/>
            순발력 게임 : <span className="highlight-key">[↑] 키</span><br/>
            정확도 게임 : <span className="highlight-key">[→] 키</span><br/>
            <span style={{ display: 'block', marginTop: '10px', textAlign: 'center', fontWeight: 'bold' }}>세 게임이 동시에 진행됩니다.</span>
          </div>
        </div>
      </div>

      <div className="info-bottom-section">
        <p className="sub-instruction-text" onClick={onStart} style={{ cursor: 'pointer' }}>ENTER 키를 눌러 시작</p>
      </div>
    </div>
  );
}
