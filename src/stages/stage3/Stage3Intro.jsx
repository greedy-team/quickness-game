// 인트로 화면 — real/fake 미리보기 + Space 안내.
// standalone 모드에서만 사용. split 모드에서는 호스트가 통합 인트로.
import { ASSETS } from '../../assets.js';
import './Stage3Intro.css';

export default function Stage3Intro() {
  return (
    <div className="stage3-intro">
      <h1 className="stage3-intro__title">⚠️ 기억의 조각이 떨어진다</h1>

      <div className="stage3-intro__group">
        <p className="stage3-intro__label stage3-intro__label--real">✅ 진짜 기억 — 받기 (→)</p>
        <div className="stage3-intro__row">
          {ASSETS.images.memoryReal.map((src) => (
            <img key={src} className="stage3-intro__thumb" src={src} alt="" />
          ))}
        </div>
      </div>

      <div className="stage3-intro__group">
        <p className="stage3-intro__label stage3-intro__label--fake">❌ 가짜 기억 — 피하기 (누르지 않음)</p>
        <div className="stage3-intro__row">
          {ASSETS.images.memoryFake.map((src) => (
            <img key={src} className="stage3-intro__thumb" src={src} alt="" />
          ))}
        </div>
      </div>

      <p className="stage3-intro__cta">▶ 준비되면 [Space] 누르기</p>
    </div>
  );
}
