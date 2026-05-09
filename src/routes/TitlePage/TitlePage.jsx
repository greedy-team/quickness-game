import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
// 💡 ASSETS 가져오기는 이제 필요하지 않으므로 주석 처리하거나 제거합니다.
// import { ASSETS } from '../../assets.js'; 
import './TitlePage.css';

export default function TitlePage() {
  const navigate = useNavigate();
  const startGame = useGameStore((s) => s.startGame);

  const handleStart = () => {
    startGame();
    navigate('/hub');
  };

  const handleOpenRanking = () => {
    navigate('/ranking');
  };

  return (
    <div
      className="title-page"
      /* 💡 public 폴더 아래 이미지를 가리키는 올바른 경로 설정 */
      style={{ backgroundImage: 'url(/assets/images/bg_chalkboard.png)' }}
    >
      {/* 시작 버튼: 화살표 방향 수정(▶) 및 텍스트 뒤 배치 */}
      <div className="title-page__action title-page__action--start">
        <button type="button" className="title-page__btn" onClick={handleStart}>
          시작 ▶
        </button>
      </div>
      
      {/* 랭킹 보기 버튼 */}
      <div className="title-page__action title-page__action--ranking">
        <button type="button" className="title-page__btn" onClick={handleOpenRanking}>
          🏆 랭킹 보기
        </button>
      </div>
    </div>
  );
}
