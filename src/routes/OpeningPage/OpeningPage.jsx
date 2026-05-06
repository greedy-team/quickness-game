import { useNavigate } from 'react-router-dom';
import './OpeningPage.css';

export default function OpeningPage() {
  const navigate = useNavigate();
  // TODO(post-skeleton): 오프닝 컷씬 (15s) — PRD §2, §5
  //   - 야자 후 빈 학교 → 또 다른 나의 출현
  //   - 종료 시 navigate('/hub')
  return (
    <div className="opening-page">
      <h1>[Opening Cutscene]</h1>
      <p>TODO: 오프닝 컷씬 (15s)</p>
      <button type="button" onClick={() => navigate('/hub')}>다음 → /hub (placeholder)</button>
    </div>
  );
}
