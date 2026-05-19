import { ASSETS } from '../../assets.js';
import './Stage3Intro.css';

// 💡 부모 컴포넌트(Stage3Game)에서 onStart 이벤트를 받아 마우스 클릭 시에도 시작 가능하게 합니다.
export default function Stage3Intro({ onStart }) {
  return (
    <div className="stage3-intro">
      
      {/* [상단] 타이틀 */}
      <div className="info-top-section">
        <h1 className="stage-title">3단계: 정확도 게임</h1>
      </div>

      {/* [중앙] 메탈릭 프레임과 방향키 설명 */}
      <div className="info-middle-section">
        
        <img 
          className="simple-preview-image" 
          src="/assets/images/bg_stage3_example.png" 
          alt="Stage 3 Example" 
        />

        <div className="instruction-item">
          <div className="arrow-keys-cluster">
            <div className="arrow-row">
              <div className="key-cap">↑</div>
            </div>
            <div className="arrow-row">
              <div className="key-cap">←</div>
              <div className="key-cap">↓</div>
              {/* 💡 3단계의 핵심 방향키인 오른쪽 발광 */}
              <div className="key-cap right-active">→</div>
            </div>
          </div>
          
          <div className="main-instruction-text">
            떨어지는 물건이 원 안에 위치한 순간,<br/>
            <span className="highlight-key">[→] 키</span>를 누르세요.
          </div>
          
        </div>

      </div>

      {/* [하단] 시작 버튼 */}
      <div className="info-bottom-section">
        <p className="sub-instruction-text" onClick={onStart} style={{ cursor: 'pointer' }}>ENTER 키를 눌러 시작</p>
      </div>

    </div>
  );
}