// src/components/TenSecondsGame/TenSecondsGame.jsx

import { useState, useEffect, useRef, useCallback } from "react";
import { TARGET, getResult } from "./gameUtils";
import { Clouds, FarBg, Trees } from "./BackgroundElements";
import StarRating from "./StarRating";
import "./TenSecondsGame.css";

export default function TenSecondsGame() {
  const [phase, setPhase] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const [finalTime, setFinalTime] = useState(null);
  const [shake, setShake] = useState(false);

  const startRef = useRef(null);
  const rafRef = useRef(null);

  const tick = useCallback(() => {
    const t = (performance.now() - startRef.current) / 1000;
    setElapsed(t);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startGame = useCallback(() => {
    if (phase === "running") return;
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
  }, [phase]);

  const resetGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPhase("idle");
    setElapsed(0);
    setFinalTime(null);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") { e.preventDefault(); if (phase !== "running") startGame(); }
      if (e.code === "ArrowLeft") { e.preventDefault(); stopGame(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, startGame, stopGame]);

  useEffect(() => {
    setShake(phase === "running" && elapsed >= 9);
  }, [elapsed, phase]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const displayTime = phase === "result" ? finalTime : elapsed;
  const diff = finalTime !== null ? Math.abs(finalTime - TARGET) : null;
  const result = diff !== null ? getResult(diff) : null;

  let timerUrgency = "";
  if (phase === "running") {
    if (displayTime >= 9) timerUrgency = "urgency-critical";
    else if (displayTime >= 7) timerUrgency = "urgency-warn";
  }

  return (
    <div className={`game-world ${shake ? "world-shake" : ""}`}>
      {/* 분리된 배경 컴포넌트 사용 */}
      <Clouds />
      <FarBg />
      <Trees />

      {/* Ground */}
      <div className="ground-strip" aria-hidden="true">
        <div className="ground-grass-row" />
        <div className="ground-dirt-row" />
        <div className="ground-sub-row" />
      </div>

      {/* UI Block */}
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
          <p className="sign-subtitle">그린이의 시련 — 정확히 10.00초에 멈춰라!</p>

          <div className={`timer-board ${timerUrgency}`}>
            <div className="timer-inner">
              <span className="timer-digits">
                {displayTime.toFixed(2)}<span className="timer-unit">s</span>
              </span>
            </div>
            <div className="timer-label">ELAPSED TIME</div>
          </div>

          <div className="controls-area">
            {phase === "idle" && (
              <button className="pixel-btn pixel-btn-green" onClick={startGame}>
                <span>▶ 시작 (Space)</span>
              </button>
            )}
            {phase === "running" && (
              <button className="pixel-btn pixel-btn-red" onClick={stopGame}>
                <span>◼ 정지 (← 방향키)</span>
              </button>
            )}
            {phase === "result" && (
              <div className="result-btns">
                <button className="pixel-btn pixel-btn-yellow" onClick={startGame}>
                  <span>▶ 다시하기 (Space)</span>
                </button>
                <button className="pixel-btn pixel-btn-gray" onClick={resetGame}>
                  <span>↩ 처음으로</span>
                </button>
              </div>
            )}
          </div>

          {phase === "idle" && (
            <p className="hint-text">Space를 눌러 타이머를 시작하고,<br />← 방향키로 10.00초에 멈추세요!</p>
          )}
          {phase === "running" && (
            <p className="hint-text running-hint">
              {displayTime >= 9 ? "🚨 지금이다! 멈춰!!!" : displayTime >= 7 ? "⚠️ 슬슬 준비해..." : "타이머가 흘러가고 있다..."}
            </p>
          )}

          {phase === "result" && result && (
            <div className="result-panel" style={{ "--result-color": result.color }}>
              <div className="result-grade-badge" data-grade={result.grade}>{result.grade}</div>
              <div className="result-title" style={{ color: result.color }}>{result.title}</div>
              
              {/* 분리된 별점 컴포넌트 사용 */}
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
              </div>
              <p className="result-desc">{result.desc}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}