import React from 'react';
import './ResultModal.css';

export default function ResultModal({
  headline,
  tierComment,
  metricLabel,
  metricValue,
  score,
  tone = 'failed',
}) {
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
        <p className="result-modal__score">+{score}점</p>
      </div>
    </div>
  );
}
