// 캐치/미스/페널티 직후 0.4초간 표시되는 텍스트 팝업.
// 부모가 visible/label/color/key를 바꿔서 매번 새 인스턴스로 강제 리렌더.
import './ResultPopup.css';

export default function ResultPopup({ visible, label, color }) {
  if (!visible) return null;
  return (
    <div className="result-popup" style={{ color }}>
      {label}
    </div>
  );
}
