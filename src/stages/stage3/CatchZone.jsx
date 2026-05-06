// 양궁형 캐치 존 — 화면 중앙 가로 띠, 5단 색대.
// 시각 전용 컴포넌트, 입력·점수 로직 없음.
import { STAGE3_CONFIG } from './stage3.config.js';
import './CatchZone.css';

export default function CatchZone() {
  const tiers = STAGE3_CONFIG.accuracyTiers;

  return (
    <div className="catch-zone" aria-hidden="true">
      {/* tier 색대 — 중심으로부터 바깥으로 그라디언트.
          maxOffset이 큰 tier부터 그려서 작은 tier가 위에 쌓이도록. */}
      {[...tiers].reverse().map((tier) => (
        <div
          key={tier.label}
          className={`catch-zone__band catch-zone__band--${tier.label.toLowerCase()}`}
          style={{
            backgroundColor: tier.color,
            height: `${tier.maxOffset * 100}%`,
          }}
        />
      ))}
      {/* 중심선 */}
      <div className="catch-zone__center-line" />
    </div>
  );
}
