// 단일 낙하 아이템. 부모(Stage3Field)가 위치·종류 결정, 본인은 시각 표시만.
import './FallingItem.css';

export default function FallingItem({ src, kind, leftPercent, topPercent }) {
  return (
    <img
      className={`falling-item falling-item--${kind}`}
      src={src}
      alt=""
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
      }}
      aria-hidden="true"
    />
  );
}
