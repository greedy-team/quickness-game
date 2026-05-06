import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
import { ASSETS } from '../../assets.js';
import './TitlePage.css';

export default function TitlePage() {
  const navigate = useNavigate();
  const startGame = useGameStore((s) => s.startGame);

  const handleStart = () => {
    startGame();
    navigate('/opening');
  };

  const handleOpenRanking = () => {
    navigate('/ranking');
  };

  return (
    <div
      className="title-page"
      style={{ backgroundImage: `url(${ASSETS.images.cutsceneOpening})` }}
    >
      <h1 className="title-page__title">그린이는 나야, 둘이 될 수 없어</h1>
      <p className="title-page__story">
        야자 후 혼자 남은 학교에 또 다른 내가 나타났다.<br />
        가짜를 없애러 4개의 문을 연다.
      </p>
      <div className="title-page__actions">
        <button type="button" className="title-page__btn" onClick={handleStart}>
          ▶ 시작
        </button>
        <button type="button" className="title-page__btn" onClick={handleOpenRanking}>
          🏆 랭킹 보기
        </button>
      </div>
    </div>
  );
}
