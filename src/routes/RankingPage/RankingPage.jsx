import { useNavigate } from 'react-router-dom';
import { useGameStore, selectTotalScore } from '../../store.js';
import './RankingPage.css';

export default function RankingPage() {
  const navigate = useNavigate();
  const resetGame = useGameStore((s) => s.resetGame);
  const total = useGameStore(selectTotalScore);

  // TODO(post-skeleton): 랭킹 보드 — PRD §6 ("부스 일일 랭킹"), §11
  //   - 닉네임 입력 모달 + 점수 등록
  //   - localStorage 기반 영속화
  //   - TOP 10 표시 + 본인 결과 하이라이트

  const handleBackToTitle = () => {
    resetGame();
    navigate('/');
  };

  return (
    <div className="ranking-page">
      <h1 className="ranking-page__title">[Ranking Board]</h1>
      <p className="ranking-page__note">TODO: 랭킹 보드 (닉네임 + TOP 10)</p>
      <p className="ranking-page__score">현재 점수: {total}</p>
      <button type="button" onClick={handleBackToTitle}>
        처음으로 → /  (resetGame)
      </button>
    </div>
  );
}
