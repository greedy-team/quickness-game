import React from 'react';
import { STAGE1_CONFIG } from '../../stages/stage1/stage1.config.js';
import { STAGE2_CONFIG } from '../../stages/stage2/stage2.config.js';
import { STAGE3_CONFIG } from '../../stages/stage3/stage3.config.js';
import { metricFromPoints } from '../../stages/common/reactionScoring.js';
import { scoreFromMetric } from '../../scoring.js';
import './ScoreTable.css';

// stage 별 tier 의 최종 점수 산출.
// perfect tier 는 정밀도 보너스 영향으로 범위로 표기 (worst ~ best).
// 그 외 tier 는 component points 가 고정이라 단일 값.
function tierScoreText(stageId, config, tier) {
  if (tier.id === 'perfect') {
    const worstInTier = scoreFromMetric(stageId, metricFromPoints(tier.points, config));
    const bestInTier  = scoreFromMetric(stageId, 0);
    return `${worstInTier} ~ ${bestInTier}`;
  }
  return `${scoreFromMetric(stageId, metricFromPoints(tier.points, config))}`;
}

function rangeText(arr, i, unitLabel) {
  const t = arr[i];
  const prev = i === 0 ? 0 : arr[i - 1].maxError;
  if (!Number.isFinite(t.maxError)) return `${unitLabel} > ${prev.toFixed(2)}s`;
  if (i === 0) return `${unitLabel} ≤ ${t.maxError.toFixed(2)}s`;
  return `${prev.toFixed(2)} ~ ${t.maxError.toFixed(2)}s`;
}

function reactionTierRows(stageId, config, unitLabel) {
  return config.accuracyTiers.map((t, i, arr) => (
    <tr key={t.id}>
      <td className="score-table__range">{rangeText(arr, i, unitLabel)}</td>
      <td className="score-table__tier" style={{ color: t.color }}>{t.label}</td>
      <td className="score-table__points">{tierScoreText(stageId, config, t)}</td>
    </tr>
  ));
}

function catchTierRows() {
  return STAGE3_CONFIG.accuracyTiers.map((t) => (
    <tr key={t.id}>
      <td className="score-table__range">중심 {(t.maxOffset * 100).toFixed(0)}% 이내</td>
      <td className="score-table__tier" style={{ color: t.color }}>{t.label}</td>
      <td className="score-table__points">{t.points}</td>
    </tr>
  ));
}

export default function ScoreTable({ onClose }) {
  return (
    <div className="score-table-backdrop" onClick={onClose} role="presentation">
      <div className="score-table" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="score-table-title">
        <div className="score-table__header">
          <h2 id="score-table-title">점수 기준</h2>
          <button type="button" className="score-table__close" onClick={onClose} aria-label="닫기">×</button>
        </div>

        <div className="score-table__grid">
          <section className="score-table__section">
            <h3>Stage 1 · 괘종시계 <span className="score-table__key">←</span></h3>
            <p className="score-table__desc">12:00:00 정각에 맞춰 ← 키. 오차가 작을수록 높은 점수.</p>
            <table>
              <tbody>{reactionTierRows(1, STAGE1_CONFIG, '오차')}</tbody>
            </table>
          </section>

          <section className="score-table__section">
            <h3>Stage 2 · 반응속도 <span className="score-table__key">↑</span></h3>
            <p className="score-table__desc">진짜 도플갱어 등장 즉시 ↑ 키. 가짜 캐치 시 실패.</p>
            <table>
              <tbody>{reactionTierRows(2, STAGE2_CONFIG, '반응')}</tbody>
            </table>
          </section>

          <section className="score-table__section">
            <h3>Stage 3 · 캐치 <span className="score-table__key">→</span></h3>
            <p className="score-table__desc">캐치 존 중심에 가까울수록 높은 점수 (per-item).</p>
            <table>
              <tbody>
                {catchTierRows()}
                <tr>
                  <td className="score-table__range">가짜 캐치</td>
                  <td className="score-table__tier" style={{ color: '#FF3333' }}>{STAGE3_CONFIG.fakeLabel}</td>
                  <td className="score-table__points">{STAGE3_CONFIG.fakePenalty}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="score-table__section score-table__section--stage4">
            <h3>Stage 4 · 병렬게임</h3>
            <p className="score-table__desc">Stage 1·2·3 을 동시에 진행. 평균 정확도로 산출.</p>
            <div className="score-table__stage4-summary">
              <div className="score-table__stage4-row">
                <span className="score-table__stage4-label">최대 점수</span>
                <span className="score-table__stage4-value">460</span>
              </div>
              <div className="score-table__stage4-row">
                <span className="score-table__stage4-label">키 입력</span>
                <span className="score-table__stage4-value">← / ↑ / →</span>
              </div>
              <p className="score-table__hint">완벽 영역에서는 정밀도 보너스가 붙어 동점이 거의 발생하지 않습니다.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
