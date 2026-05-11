import React from 'react';
import './ResultModal.css';

export default function ResultModal({
  headline,
  tierComment,
  metricLabel,
  metricValue,
  breakdown,
  score,
  maxScore,
  tone = 'failed',
  hint,
}) {
  // maxScore가 주어지면 `현재 / 최대` 포맷, 없으면 기존 `+N` 포맷 (호환성).
  const scoreText = typeof maxScore === 'number'
    ? `${score} / ${maxScore}점`
    : (typeof score === 'number' && score < 0 ? `${score}점` : `+${score}점`);
  return (
    <div className="result-modal-backdrop">
      <div className={`result-modal result-modal--${tone}`}>
        {headline && <h1 className="result-modal__headline">{headline}</h1>}
        <p className="result-modal__tier">{tierComment}</p>
        {metricValue != null && (
          <p className="result-modal__metric">
            {metricLabel && (
              <span className="result-modal__metric-label">{metricLabel}: </span>
            )}
            {metricValue}
          </p>
        )}
        {breakdown && breakdown.length > 0 && (
          <ul className="result-modal__breakdown">
            {breakdown.map((row) => (
              <li
                key={row.label}
                className="result-modal__breakdown-row"
                style={row.color ? { color: row.color } : undefined}
              >
                <span className="result-modal__breakdown-label">{row.label}</span>
                <span className="result-modal__breakdown-value">{row.value}</span>
                {row.delta && (
                  <span className="result-modal__breakdown-delta">{row.delta}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="result-modal__score">{scoreText}</p>
        {hint && <p className="result-modal__hint">{hint}</p>}
      </div>
    </div>
  );
}
