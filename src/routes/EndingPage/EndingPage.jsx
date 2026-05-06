import { useNavigate } from 'react-router-dom';
import { useGameStore, selectTotalScore } from '../../store.js';
import './EndingPage.css';

export default function EndingPage() {
  const navigate = useNavigate();
  const total = useGameStore(selectTotalScore);

  // TODO(post-skeleton): 엔딩 컷씬 (10s) — PRD §5
  //   - 성공/실패 분기 (PRD §7 엔딩 자산)
  //   - 컷씬 종료 후 자동 또는 수동으로 /ranking 이동
  return (
    <div className="ending-page">
      <h1 className="ending-page__title">[Ending]</h1>
      <p className="ending-page__note">TODO: 엔딩 컷씬</p>
      <p className="ending-page__score">최종 점수: {total}</p>
      <button type="button" onClick={() => navigate('/ranking')}>
        랭킹 보기 → /ranking
      </button>
    </div>
  );
}
