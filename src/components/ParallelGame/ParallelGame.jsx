import { useState, useEffect, useRef, useCallback } from 'react';
import TenSecondsGame from '../TenSecondsGame/TenSecondsGame';
import ColorReactionGame from '../ColorReactionGame/ColorReactionGame';
import CatchGame from '../CatchGame/CatchGame';
import StarRating from '../TenSecondsGame/StarRating';
import { getParallelGrade, computeFinalScore } from './parallelUtils';
import './ParallelGame.css';

const MASTER_DURATION_MS = 15_000;

export default function ParallelGame({ onComplete, onContinue }) {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'running' | 'result'
  const [elapsedMs, setElapsedMs] = useState(0);
  const [scoreLeft, setScoreLeft] = useState(null);
  const [scoreCenter, setScoreCenter] = useState(null);
  const [scoreRight, setScoreRight] = useState(null);

  const startMsRef = useRef(0);
  const rafRef = useRef(null);
  const masterCompleteRef = useRef(false);
  const resultCompleteRef = useRef(false);

  const startMaster = useCallback(() => {
    masterCompleteRef.current = false;
    resultCompleteRef.current = false;
    setScoreLeft(null);
    setScoreCenter(null);
    setScoreRight(null);
    setElapsedMs(0);
    setPhase('running');
    startMsRef.current = performance.now();
  }, []);

  // 키보드: idle → Space/Enter 시작, result → Space/Enter 다음으로
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (phase === 'idle') {
        e.preventDefault();
        startMaster();
      } else if (phase === 'result') {
        e.preventDefault();
        onContinue?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, startMaster, onContinue]);

  // 마스터 타이머: phase 'running' 진입 시 RAF 루프
  useEffect(() => {
    if (phase !== 'running') return undefined;
    const tick = () => {
      const now = performance.now() - startMsRef.current;
      setElapsedMs(now);
      if (now >= MASTER_DURATION_MS) {
        if (!masterCompleteRef.current) {
          masterCompleteRef.current = true;
          setPhase('result');
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  // result 진입 시점: 모든 영역 onComplete 보고 후 합산하여 1회 onComplete 호출
  // 각 sub-game이 externalPhase='result'를 받으면 즉시 onComplete?.(score|0)을 호출하도록
  // Tasks 2-4에서 보장됨 — null이 영구히 남는 경우는 없다.
  useEffect(() => {
    if (phase !== 'result') return;
    if (resultCompleteRef.current) return;
    if (scoreLeft === null || scoreCenter === null || scoreRight === null) return;
    resultCompleteRef.current = true;
    const { total } = computeFinalScore(scoreLeft, scoreCenter, scoreRight);
    onComplete?.(total);
  }, [phase, scoreLeft, scoreCenter, scoreRight, onComplete]);

  return (
    <div className="parallel-stage">
      {phase === 'idle' && (
        <div className="parallel-idle-panel">
          <h1 className="parallel-title">⚔️ 결전의 서막</h1>
          <p className="parallel-subtitle">갑옷을 두른 그린이, 모든 시련을 한 번에</p>
          <div className="parallel-area-cards">
            <div className="parallel-area-card">
              <div className="parallel-area-icon">⏱</div>
              <div className="parallel-area-name">10초 맞추기</div>
              <div className="parallel-area-key">← 키</div>
            </div>
            <div className="parallel-area-card">
              <div className="parallel-area-icon">🗿</div>
              <div className="parallel-area-name">침묵의 석상</div>
              <div className="parallel-area-key">↑ 키</div>
            </div>
            <div className="parallel-area-card">
              <div className="parallel-area-icon">⚔️</div>
              <div className="parallel-area-name">장비 캐치</div>
              <div className="parallel-area-key">→ 키 (속도 1.5×)</div>
            </div>
          </div>
          <p className="parallel-bonus-note">3영역 합산 점수 <b>× 2배 보너스</b></p>
          <div className="score-rules parallel-grade-rules">
            <div className="score-rules-title">🏆 등급 (보너스 적용 후 점수)</div>
            <div className="score-rule tier-legendary"><span>🌟 레전더리</span><b>≥ 900점</b></div>
            <div className="score-rule tier-unique"><span>💎 유니크</span><b>≥ 750점</b></div>
            <div className="score-rule tier-epic"><span>🔮 에픽</span><b>≥ 550점</b></div>
            <div className="score-rule tier-rare"><span>⚔️ 레어</span><b>≥ 300점</b></div>
            <div className="score-rule tier-common"><span>🛡️ 일반</span><b>&lt; 300점</b></div>
          </div>
          <button type="button" className="parallel-start-btn" onClick={startMaster}>
            ▶ 결전 시작 (Space / Enter)
          </button>
        </div>
      )}
      {(phase === 'running' || phase === 'result') && (
        <>
          <div className="parallel-master-hud">
            <span className="parallel-master-title">⚔️ 결전의 서막</span>
            <span className="parallel-master-timer">
              남은 시간 {Math.max(0, (MASTER_DURATION_MS - elapsedMs) / 1000).toFixed(1)}s
            </span>
          </div>
          <div className="parallel-grid">
            <div className="parallel-area parallel-area-left">
              <div className="parallel-area-key-badge">← 10초 맞추기</div>
              <div className="parallel-area-inner">
                <TenSecondsGame
                  embedded
                  externalPhase={phase}
                  onComplete={(score) => setScoreLeft(score)}
                />
              </div>
              {phase === 'running' && scoreLeft !== null && (
                <div className="parallel-area-done-overlay">
                  <div className="parallel-area-done-icon">✅</div>
                  <div className="parallel-area-done-label">완료</div>
                  <div className="parallel-area-done-score">+{scoreLeft}</div>
                  <div className="parallel-area-done-wait">다른 영역 대기 중…</div>
                </div>
              )}
            </div>
            <div className="parallel-area parallel-area-center">
              <div className="parallel-area-key-badge">↑ 색상 반응</div>
              <div className="parallel-area-inner">
                <ColorReactionGame
                  embedded
                  externalPhase={phase}
                  onComplete={(score) => setScoreCenter(score)}
                />
              </div>
              {phase === 'running' && scoreCenter !== null && (
                <div className="parallel-area-done-overlay">
                  <div className="parallel-area-done-icon">✅</div>
                  <div className="parallel-area-done-label">완료</div>
                  <div className="parallel-area-done-score">{scoreCenter >= 0 ? `+${scoreCenter}` : scoreCenter}</div>
                  <div className="parallel-area-done-wait">다른 영역 대기 중…</div>
                </div>
              )}
            </div>
            <div className="parallel-area parallel-area-right">
              <div className="parallel-area-key-badge">→ 캐치 (1.5×)</div>
              <div className="parallel-area-inner">
                <CatchGame
                  embedded
                  externalPhase={phase}
                  speedMultiplier={1.5}
                  onComplete={(score) => setScoreRight(score)}
                />
              </div>
              {phase === 'running' && scoreRight !== null && (
                <div className="parallel-area-done-overlay">
                  <div className="parallel-area-done-icon">✅</div>
                  <div className="parallel-area-done-label">완료</div>
                  <div className="parallel-area-done-score">{scoreRight >= 0 ? `+${scoreRight}` : scoreRight}</div>
                  <div className="parallel-area-done-wait">다른 영역 대기 중…</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {phase === 'result' && (() => {
        const l = scoreLeft ?? 0;
        const c = scoreCenter ?? 0;
        const r = scoreRight ?? 0;
        const { raw, total } = computeFinalScore(l, c, r);
        const grade = getParallelGrade(total);
        return (
          <div className="parallel-result-overlay">
            <div
              className="parallel-result-panel"
              style={{ '--parallel-result-color': grade.color }}
            >
              <div className="parallel-grade-badge" data-grade={grade.grade}>{grade.grade}</div>
              <div className="parallel-result-title" style={{ color: grade.color }}>{grade.title}</div>
              <StarRating count={grade.stars} />

              <div className="parallel-stats">
                <div className="parallel-stat-row"><span>좌 (10초 맞추기)</span><b>+{l}</b></div>
                <div className="parallel-stat-row"><span>중 (색상 반응)</span><b>{c >= 0 ? `+${c}` : c}</b></div>
                <div className="parallel-stat-row"><span>우 (캐치 1.5×)</span><b>{r >= 0 ? `+${r}` : r}</b></div>
                <div className="parallel-stat-divider" />
                <div className="parallel-stat-row"><span>합산</span><b>+{raw}</b></div>
                <div className="parallel-stat-row"><span>× 2 보너스</span><b>+{total}</b></div>
                <div className="parallel-stat-divider" />
                <div className="parallel-stat-row parallel-stat-row-highlight">
                  <span>최종 점수</span><b>+{total}</b>
                </div>
              </div>
              <p className="parallel-result-desc">{grade.desc}</p>
              <button type="button" className="parallel-continue-btn" onClick={onContinue}>
                다음으로 (Enter / Space)
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
