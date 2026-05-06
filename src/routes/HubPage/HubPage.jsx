import { useNavigate } from 'react-router-dom';
import { useGameStore, selectIsDoor4Unlocked } from '../../store.js';
import { ASSETS } from '../../assets.js';
import './HubPage.css';

export default function HubPage() {
  const navigate = useNavigate();
  const stageResults = useGameStore((s) => s.stageResults);
  const door4Unlocked = useGameStore(selectIsDoor4Unlocked);

  return (
    <div
      className="hub-page"
      style={{ backgroundImage: `url(${ASSETS.images.hubCorridor})` }}
    >
      {[1, 2, 3].map((n) => {
        const cleared = stageResults[n] !== null;
        return (
          <button
            key={n}
            type="button"
            className={`hub-page__door hub-page__door--${n}`}
            onClick={() => navigate(`/stage/${n}`)}
            aria-label={`문 ${n}${cleared ? ' (클리어)' : ''}`}
          >
            <img
              src={cleared ? ASSETS.images.doorClear : ASSETS.images.door}
              alt=""
            />
          </button>
        );
      })}

      <button
        type="button"
        className={`hub-page__door hub-page__door--4 ${door4Unlocked ? '' : 'is-locked'}`}
        onClick={() => navigate('/stage/4')}
        disabled={!door4Unlocked}
        aria-disabled={!door4Unlocked}
        aria-label={`문 4${door4Unlocked ? '' : ' (잠김)'}`}
      >
        <img src={ASSETS.images.door} alt="" />
      </button>
    </div>
  );
}
