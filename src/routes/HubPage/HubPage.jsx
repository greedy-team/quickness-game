import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, selectIsDoor4Unlocked } from '../../store.js';
import { ASSETS } from '../../assets.js';
import { playSfx } from '../../audio/playSfx.js';
import './HubPage.css';

const STAGE_LABELS = {
  1: 'STAGE 1',
  2: 'STAGE 2',
  3: 'STAGE 3',
  4: 'FINAL STAGE'
};

export default function HubPage() {
  const navigate = useNavigate();
  const stageResults = useGameStore((s) => s.stageResults);
  const door4Unlocked = useGameStore(selectIsDoor4Unlocked);
  const [showLockedToast, setShowLockedToast] = useState(false);

  const openDoor = (n) => {
    if (n === 4 && !door4Unlocked) {
      setShowLockedToast(true);
      setTimeout(() => setShowLockedToast(false), 2000);
      return;
    }
    playSfx(ASSETS.sounds.openDoor);
    navigate(`/stage/${n}`);
  };

  return (
    <div className="hub-page">
      <div className="doors-container">
        {[1, 2, 3, 4].map((n) => {
          const locked = n === 4 && !door4Unlocked;
          const cleared = stageResults[n] !== null;
          
          // 💡 이미지 경로 결정
          let doorSrc = ASSETS.images.door;
          if (n === 4 && locked) {
            doorSrc = '/assets/images/door_stage4.png';
          } else if (cleared) {
            doorSrc = ASSETS.images.doorClear;
          }

          return (
            <button
              key={n}
              className={`hub-page__door ${locked ? 'is-locked' : ''}`}
              onClick={() => openDoor(n)}
            >
              <div className="door-plate">
                <span className="plate-label-big">{STAGE_LABELS[n]}</span>
              </div>
              <div className="door-view">
                <img src={doorSrc} alt="" className="door-img" />
              </div>
            </button>
          );
        })}
      </div>

      {showLockedToast && (
        <div className="locked-toast">이전 스테이지를 모두 클리어해야 합니다!</div>
      )}
    </div>
  );
}
