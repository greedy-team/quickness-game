// 캐치/페널티 직후 0.4초간 표시되는 텍스트 팝업.
// 부모가 visible/label/points/color/key를 바꿔서 매번 새 인스턴스로 강제 리렌더.
import './ResultPopup.css';

export default function ResultPopup({ visible, label, points, color }) {
  if (!visible) return null;
  const sign = points > 0 ? '+' : '';
  const showPoints = typeof points === 'number';
  return (
    <div className="result-popup" style={{ color }}>
      <span className="result-popup__label">{label}</span>
      {showPoints && (
        <span className="result-popup__points">{sign}{points}</span>
      )}
    </div>
  );
}
