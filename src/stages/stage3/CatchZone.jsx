// 캐치 존 — 화면 중앙 가로 띠 (단순 과녁).
// 시각 전용 컴포넌트, 입력·점수 로직 없음.
import './CatchZone.css';

export default function CatchZone() {
  return (
    <div className="catch-zone" aria-hidden="true">
      <div className="catch-zone__band" />
      <div className="catch-zone__center-line" />
      <div className="catch-zone__key">→</div>
      <div className="catch-zone__hint">황금선 위에서</div>
    </div>
  );
}
