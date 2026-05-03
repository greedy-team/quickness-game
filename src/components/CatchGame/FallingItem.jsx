import { ITEM_EMOJI, FALL_DURATION_MS } from './catchUtils';

export default function FallingItem({ type, fallDurationMs = FALL_DURATION_MS, speedMultiplier = 1 }) {
  const duration = fallDurationMs / speedMultiplier;
  return (
    <div
      className="catch-falling-item"
      style={{ animationDuration: `${duration}ms` }}
    >
      <span className="catch-item-emoji">{ITEM_EMOJI[type] ?? '?'}</span>
    </div>
  );
}
