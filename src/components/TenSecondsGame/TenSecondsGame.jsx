// src/components/TenSecondsGame/TenSecondsGame.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { TARGET, getResult, getScore } from "./gameUtils";
import { Clouds, FarBg, Trees } from "./BackgroundElements";
import StarRating from "./StarRating";
import "./TenSecondsGame.css";

export default function TenSecondsGame({
  autoStart = false,
  embedded = false,
  externalPhase,
  onComplete,
  onContinue,
}) {
  const [phase, setPhase] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const [finalTime, setFinalTime] = useState(null);
  const [shake, setShake] = useState(false);

  const startRef = useRef(null);
  const rafRef = useRef(null);
  const completedRef = useRef(false);

  const tick = useCallback(() => {
    const t = (performance.now() - startRef.current) / 1000;
    setElapsed(t);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startGame = useCallback(() => {
    if (phase === "running") return;
    completedRef.current = false;
    startRef.current = performance.now();
    setElapsed(0);
    setFinalTime(null);
    setPhase("running");
    rafRef.current = requestAnimationFrame(tick);
  }, [phase, tick]);

  const stopGame = useCallback(() => {
    if (phase !== "running") return;
    cancelAnimationFrame(rafRef.current);
    const t = (performance.now() - startRef.current) / 1000;
    setFinalTime(t);
    setPhase("result");
    if (!completedRef.current) {
      completedRef.current = true;
      const diff = Math.abs(t - TARGET);
      onComplete?.(getScore(diff));
    }
  }, [phase, onComplete]);

  const resetGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPhase("idle");
    setElapsed(0);
    setFinalTime(null);
    completedRef.current = false;
  }, []);

  // autoStart: mount 시 한 번만
  useEffect(() => {
    if (autoStart) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // embedded 모드: externalPhase 'running' → 자동 시작, 'result' → 미보고 시 0점
  useEffect(() => {
    if (!embedded || !externalPhase) return;
    if (externalPhase === 'running' && phase === 'idle') {
      startGame();
    } else if (externalPhase === 'result' && !completedRef.current) {
      // 사용자가 ← 안 누르고 마스터 타이머가 종료된 케이스 → 0점 보고
      cancelAnimationFrame(rafRef.current);
      setPhase('result');
      completedRef.current = true;
      onComplete?.(0);
    }
  }, [embedded, externalPhase, phase, startGame, onComplete]);

  // 키보드: ← 정지, Space 시작(autoStart=false일 때만), Enter 다음으로(result + onContinue)
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        if (phase === "idle") startGame();      // ← 키로 시작
        else if (phase === "running") stopGame(); // ← 키로 정지
      }
      else if ((e.code === "Enter" || e.code === "Space") && phase === "result" && onContinue) {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, startGame, stopGame, autoStart, onContinue]);

  useEffect(() => {
    setShake(phase === "running" && elapsed >= 9);
  }, [elapsed, phase]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const displayTime = phase === "result" ? (finalTime ?? elapsed) : elapsed;
  const diff = finalTime !== null ? Math.abs(finalTime - TARGET) : null;
  const result = diff !== null ? getResult(diff) : null;
  const score = diff !== null ? getScore(diff) : null;

  let timerUrgency = "";
  if (phase === "running") {
    if (displayTime >= 9) timerUrgency = "urgency-critical";
    else if (displayTime >= 7) timerUrgency = "urgency-warn";
  }

  return (
    <div className={`game-world ${shake ? "world-shake" : ""}`}>
      <Clouds />
      <FarBg />
      <Trees />

      <div className="ground-strip" aria-hidden="true">
        <div className="ground-grass-row" />
        <div className="ground-dirt-row" />
        <div className="ground-sub-row" />
      </div>

      <div className="game-ground-block">
        <div className="grass-top" aria-hidden="true">
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className={`grass-blade grass-blade-${(i % 6) + 1}`} />
          ))}
        </div>

        <div className="game-inner">
          <div className="sign-board">
            <span className="sign-icon">⏱</span>
            <span className="sign-text">10초  맞추기</span>
            <span className="sign-icon">⏱</span>
          </div>
          {!embedded && <p className="sign-subtitle">그린이의 시련 — 정확히 10.00초에 멈춰라!</p>}

          <div className={`timer-board ${timerUrgency}`}>
            <div className="timer-inner">
              <span className="timer-digits">
                {displayTime.toFixed(2)}<span className="timer-unit">s</span>
              </span>
            </div>
            <div className="timer-label">ELAPSED TIME</div>
          </div>

          {!embedded && (
            <div className="controls-area">
              {phase === "idle" && !autoStart && (
                <button className="pixel-btn pixel-btn-green" onClick={startGame}>
                  <span>▶ 시작 (← 키)</span>
                </button>
              )}
              {phase === "running" && (
                <button className="pixel-btn pixel-btn-red" onClick={stopGame}>
                  <span>◼ 정지 (← 방향키)</span>
                </button>
              )}
              {phase === "result" && (
                onContinue ? (
                  <button className="pixel-btn pixel-btn-yellow" onClick={onContinue}>
                    <span>다음으로 (Enter / Space)</span>
                  </button>
                ) : (
                  <div className="result-btns">
                    <button className="pixel-btn pixel-btn-yellow" onClick={startGame}>
                      <span>▶ 다시하기 (Space)</span>
                    </button>
                    <button className="pixel-btn pixel-btn-gray" onClick={resetGame}>
                      <span>↩ 처음으로</span>
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          {!embedded && phase === "idle" && !autoStart && (
            <>
              <p className="hint-text">← 키로 타이머를 시작하고,<br />다시 ← 방향키로 정확히 10.00초에 멈추세요!</p>
              <div className="score-rules">
                <div className="score-rules-title">📊 판정 기준 (오차 → 보상)</div>
                <div className="score-rule tier-legendary"><span>⭐⭐⭐⭐⭐ 레전더리 (±0.05초)</span><b>+100점</b></div>
                <div className="score-rule tier-unique"><span>⭐⭐⭐⭐ 유니크 (±0.1초)</span><b>+80점</b></div>
                <div className="score-rule tier-epic"><span>⭐⭐⭐ 에픽 (±0.2초)</span><b>+60점</b></div>
                <div className="score-rule tier-rare"><span>⭐⭐ 레어 (±0.4초)</span><b>+40점</b></div>
                <div className="score-rule tier-common"><span>⭐ 일반 (그 외)</span><b>+20점</b></div>
              </div>
            </>
          )}
          {!embedded && phase === "running" && (
            <p className="hint-text running-hint">
              {displayTime >= 9 ? "🚨 지금이다! 멈춰!!!" : displayTime >= 7 ? "⚠️ 슬슬 준비해..." : "타이머가 흘러가고 있다..."}
            </p>
          )}

          {!embedded && phase === "result" && result && (
            <div className="result-panel" style={{ "--result-color": result.color }}>
              <div className="result-grade-badge" data-grade={result.grade}>{result.grade}</div>
              <div className="result-title" style={{ color: result.color }}>{result.title}</div>
              <StarRating count={result.stars} />
              <div className="result-stats">
                <div className="stat-row">
                  <span className="stat-label">기록 시간</span>
                  <span className="stat-value">{finalTime.toFixed(3)}s</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">목표 시간</span>
                  <span className="stat-value">10.000s</span>
                </div>
                <div className="stat-row stat-row-highlight">
                  <span className="stat-label">오차</span>
                  <span className="stat-value">{diff < 0.001 ? "PERFECT" : `± ${diff.toFixed(3)}s`}</span>
                </div>
                {score !== null && (
                  <div className="stat-row stat-row-highlight">
                    <span className="stat-label">점수</span>
                    <span className="stat-value">+{score}</span>
                  </div>
                )}
              </div>
              <p className="result-desc">{result.desc}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
