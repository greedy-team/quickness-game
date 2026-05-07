// 4번 게임 종료 직후 풀스크린 점프스케어 — Stage4Host의 jumpscare phase 동안만 마운트.
// SFX는 호스트(Stage4Host)가 merging phase 진입 시점에 시작 → 이미지보다 먼저 들리도록.
import { ASSETS } from '../../assets.js';
import './Stage4JumpscareOverlay.css';

export default function Stage4JumpscareOverlay() {
  return (
    <div className="stage4-jumpscare-overlay">
      <div className="stage4-jumpscare-overlay__wobble">
        <img
          className="stage4-jumpscare-overlay__image"
          src={ASSETS.images.cutsceneJumpscare}
          alt="갑자기 나타난 또다른 나"
          draggable={false}
        />
      </div>
    </div>
  );
}
