import { useNavigate } from 'react-router-dom';
import { ASSETS } from '../../assets.js';
import './OpeningPage.css';

export default function OpeningPage() {
  const navigate = useNavigate();
  // TODO(post-skeleton): 오프닝 컷씬 (15s) — PRD §2, §5
  //   - 야자 후 빈 학교 → 또 다른 나의 출현
  //   - 종료 시 자동 navigate('/hub')
  return (
    <div
      className="opening-page"
      style={{ backgroundImage: `url(${ASSETS.images.cutsceneOpening})` }}
    >
      <button
        type="button"
        className="opening-page__next"
        onClick={() => navigate('/hub')}
      >
        다음 →
      </button>
    </div>
  );
}
