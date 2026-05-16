// src/stages/stage3/ResultPopup.jsx
import './ResultPopup.css';

export default function ResultPopup({ visible, label, points, color }) {
  if (!visible) return null;
  const sign = points > 0 ? '+' : '';
  const showPoints = typeof points === 'number';
  
  return (
    <div className="result-popup-container">
      {/* 💡 --popup-color 변수를 통해 전달받은 색상(ex. 골드, 레드)으로 네온 효과 적용 */}
      <div className="result-popup" style={{ '--popup-color': color }}>
        <span className="result-popup__label" style={{ color: color }}>{label}</span>
        {showPoints && (
          <span className="result-popup__points">{sign}{points}</span>
        )}
      </div>
    </div>
  );
}
