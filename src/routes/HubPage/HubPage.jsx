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

  const openDoor = (n) => {
    if (n === 4 && !door4Unlocked) return;

    playSfx(ASSETS.sounds.openDoor);
    navigate(`/stage/${n}`);
  };

  return (
    <div className="hub-page">
      <div className="doors-container">
        {[1, 2, 3, 4].map((n) => {
          const locked = n === 4 && !door4Unlocked;
          const cleared = stageResults[n] !== null;
          const label = STAGE_LABELS[n];

          return (
            <button
              key={n}
              type="button"
              className={`hub-page__door ${locked ? 'is-locked' : ''} ${cleared ? 'is-cleared' : ''}`}
              onClick={() => openDoor(n)}
              disabled={locked}
            >
              {/* STAGE 라벨 명판 */}
              <div className="door-plate">
                <span className="plate-label-big">{label}</span>
              </div>

              {/* 문 이미지 */}
              <div className="door-view">
                <img
                  src={cleared ? ASSETS.images.doorClear : ASSETS.images.door}
                  alt=""
                  className="door-img"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
