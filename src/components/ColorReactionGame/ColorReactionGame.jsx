// src/components/ColorReactionGame/ColorReactionGame.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { getReactionResult, getScore } from "./reactionUtils";
import "./ColorReactionGame.css";

export default function ColorReactionGame({ autoStart = false, onComplete, onContinue }) {
  const [phase, setPhase] = useState("idle");
  const [timeLeft, setTimeLeft] = useState(10.00);
  const [reactionTime, setReactionTime] = useState(0);

  const glowStartTimeRef = useRef(null);
  const timeoutIdRef = useRef(null);
  const gameIntervalRef = useRef(null);
  const completedRef = useRef(false);

  const endGame = useCallback((reason, computedScore = null) => {
    clearInterval(gameIntervalRef.current);
    clearTimeout(timeoutIdRef.current);
    setPhase(reason);
    if (!completedRef.current) {
      completedRef.current = true;
      const score = computedScore !== null
        ? computedScore
        : reason === 'early' ? -20
          : reason === 'timeout' ? 0
            : 0;
      onComplete?.(score);
    }
  }, [onComplete]);

  const startGame = useCallback(() => {
    completedRef.current = false;
    setPhase("waiting");
    setTimeLeft(10.00);
    setReactionTime(0);

    gameIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.01) {
          endGame("timeout");
          return 0;
        }
        return prev - 0.01;
      });
    }, 10);

    // 4초 ~ 10초 사이 랜덤한 시간에 눈에 불이 들어옴 (사용자 IDE 변경 반영)
    const randomDelay = Math.random() * 6000 + 4000;
    timeoutIdRef.current = setTimeout(() => {
      setPhase("react");
      glowStartTimeRef.current = performance.now();
    }, randomDelay);
  }, [endGame]);

  // 키보드: ↑ 반응, Space 시작(autoStart=false), Enter 다음으로
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "ArrowUp") {
        e.preventDefault();
        if (phase === "idle") {
          startGame();              // ↑ 키로 시작
        } else if (phase === "waiting") {
          endGame("early");
        } else if (phase === "react") {
          const rTime = performance.now() - glowStartTimeRef.current;
          const ms = Math.floor(rTime);
          setReactionTime(ms);
          endGame("result", getScore(ms));
        }
      } else if ((e.code === "Enter" || e.code === "Space")
                 && ["result", "early", "timeout"].includes(phase)
                 && onContinue) {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, startGame, endGame, autoStart, onContinue]);

  // autoStart: mount 시 한 번
  useEffect(() => {
    if (autoStart) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    return () => {
      clearInterval(gameIntervalRef.current);
      clearTimeout(timeoutIdRef.current);
    };
  }, []);

  const resultData = phase === "result" ? getReactionResult(reactionTime) : null;
  const isGlowing = phase === "react";
  const score = phase === "result" ? getScore(reactionTime)
              : phase === "early"  ? -20
              : phase === "timeout" ? 0
              : null;

  return (
    <div className={`dungeon-world ${isGlowing ? "dungeon-alert" : ""}`}>
      {(phase === "waiting" || phase === "react") && (
        <div className="dungeon-timer">
          남은 시간: {timeLeft.toFixed(2)}s
        </div>
      )}

      <div className={`stone-statue-container ${isGlowing ? "shake-hard" : "breathe-slow"}`}>
        <div className="statue-greenie">
          <div className="greenie-head">
            <div className="greenie-horns">
              <div className="horn left-horn"></div>
              <div className="horn right-horn"></div>
            </div>
            <div className="greenie-eyes">
              <div className={`eye left-eye ${isGlowing ? "eye-glow" : ""}`}></div>
              <div className={`eye right-eye ${isGlowing ? "eye-glow" : ""}`}></div>
            </div>
            <div className="greenie-snout">
              <div className="nostril left-nostril"></div>
              <div className="nostril right-nostril"></div>
            </div>
          </div>
          <div className="greenie-neck">
            <div className="stone-spot spot-1"></div>
            <div className="stone-spot spot-2"></div>
            <div className="stone-spot spot-3"></div>
            <div className="stone-crack crack-1"></div>
            <div className="stone-crack crack-2"></div>
          </div>
        </div>
      </div>

      <div className="dungeon-ui-overlay">
        {phase === "idle" && !autoStart && (
          <div className="dungeon-panel start-panel">
            <h2 className="dungeon-title">🗿 침묵의 석상</h2>
            <p>석상의 눈에 <b>붉은 안광</b>이 서리면 ⬆️키를 누르세요!</p>
            <p className="dungeon-warning">주의: 빛나기 전에 움직이면 즉사합니다.</p>
            <div className="score-rules">
              <div className="score-rules-title">📊 판정 기준 (반응 시간 → 보상)</div>
              <div className="score-rule tier-legendary"><span>⭐⭐⭐⭐⭐ 레전더리 (≤150ms)</span><b>+100점</b></div>
              <div className="score-rule tier-unique"><span>⭐⭐⭐⭐ 유니크 (≤250ms)</span><b>+80점</b></div>
              <div className="score-rule tier-epic"><span>⭐⭐⭐ 에픽 (≤400ms)</span><b>+60점</b></div>
              <div className="score-rule tier-rare"><span>⭐⭐ 레어 (≤600ms)</span><b>+40점</b></div>
              <div className="score-rule tier-common"><span>⭐ 일반 (그 외)</span><b>+20점</b></div>
              <div className="score-rule score-rule-bad"><span>💥 일찍 누름</span><b>-20점</b></div>
              <div className="score-rule score-rule-bad"><span>⏰ 시간 초과</span><b>0점</b></div>
            </div>
            <button className="dungeon-btn start-btn" onClick={startGame}>
              ▶ 던전 입장 (↑ 키)
            </button>
          </div>
        )}

        {phase === "early" && (
          <div className="dungeon-panel error-panel">
            <h2>💥 끔찍한 죽음</h2>
            <p>석상이 빛나기 전에 움직였습니다!</p>
            {score !== null && <p style={{ color: '#fca5a5', fontWeight: 'bold' }}>점수: {score}</p>}
            {onContinue
              ? <button className="dungeon-btn" onClick={onContinue}>다음으로 (Enter / Space)</button>
              : <button className="dungeon-btn" onClick={startGame}>다시 도전 (Space)</button>}
          </div>
        )}

        {phase === "timeout" && (
          <div className="dungeon-panel error-panel">
            <h2>⏰ 시간 초과</h2>
            <p>던전이 무너져 내렸습니다.</p>
            {score !== null && <p style={{ color: '#fbbf24', fontWeight: 'bold' }}>점수: +{score}</p>}
            {onContinue
              ? <button className="dungeon-btn" onClick={onContinue}>다음으로 (Enter / Space)</button>
              : <button className="dungeon-btn" onClick={startGame}>다시 도전 (Space)</button>}
          </div>
        )}

        {phase === "result" && resultData && (
          <div className="dungeon-panel result-panel">
            <h2 style={{ color: resultData.color }}>{resultData.title}</h2>
            <h1 className="reaction-time-text">{reactionTime} ms</h1>
            {score !== null && <p style={{ color: '#fbbf24', fontWeight: 'bold' }}>점수: +{score}</p>}
            <p className="result-desc">{resultData.desc}</p>
            {onContinue
              ? <button className="dungeon-btn" onClick={onContinue}>다음으로 (Enter / Space)</button>
              : <button className="dungeon-btn" onClick={startGame}>다시 도전 (Space)</button>}
          </div>
        )}

        {(phase === "waiting" || phase === "react") && (
          <div className="instruction-toast">
            {phase === "waiting" ? "숨을 죽이고 석상을 주시하십시오..." : "지금입니다! ⬆️ 방향키를 누르세요!!"}
          </div>
        )}
      </div>
    </div>
  );
}
