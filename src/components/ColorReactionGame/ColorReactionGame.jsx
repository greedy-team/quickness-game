import { useState, useEffect, useRef, useCallback } from "react";
import { getReactionResult } from "./reactionUtils";
import "./ColorReactionGame.css";

export default function ColorReactionGame() {
  // phase: idle(대기), waiting(석상 대기중), react(안광 켜짐!), result(결과), early(너무 빨리 누름), timeout(시간초과)
  const [phase, setPhase] = useState("idle");
  const [timeLeft, setTimeLeft] = useState(10.00);
  const [reactionTime, setReactionTime] = useState(0);

  const glowStartTimeRef = useRef(null);
  const timeoutIdRef = useRef(null);
  const gameIntervalRef = useRef(null);

  // 게임 초기화 및 시작
  const startGame = useCallback(() => {
    setPhase("waiting");
    setTimeLeft(10.00);
    setReactionTime(0);

    // 10초 전체 제한 시간 타이머
    gameIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.01) {
          endGame("timeout");
          return 0;
        }
        return prev - 0.01;
      });
    }, 10);

    // 2초 ~ 6초 사이 랜덤한 시간에 눈에 불이 들어옴
    const randomDelay = Math.random() * 4000 + 2000;
    timeoutIdRef.current = setTimeout(() => {
      setPhase("react");
      glowStartTimeRef.current = performance.now();
    }, randomDelay);
  }, []);

  const endGame = useCallback((reason) => {
    clearInterval(gameIntervalRef.current);
    clearTimeout(timeoutIdRef.current);
    setPhase(reason);
  }, []);

  // 키보드 이벤트 (위쪽 방향키 ⬆️)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "ArrowUp") {
        e.preventDefault();
        if (phase === "waiting") {
          endGame("early"); // 눈에서 불이 나기 전에 누름 (실패)
        } else if (phase === "react") {
          const rTime = performance.now() - glowStartTimeRef.current;
          setReactionTime(Math.floor(rTime)); // ms 단위로 정수화
          endGame("result");
        }
      } else if (e.code === "Space") {
        e.preventDefault();
        if (["idle", "result", "early", "timeout"].includes(phase)) {
          startGame();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, startGame, endGame]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      clearInterval(gameIntervalRef.current);
      clearTimeout(timeoutIdRef.current);
    };
  }, []);

  const resultData = phase === "result" ? getReactionResult(reactionTime) : null;
  const isGlowing = phase === "react";

  return (
    <div className={`dungeon-world ${isGlowing ? "dungeon-alert" : ""}`}>
      {/* 10초 제한 시간 UI (상단) */}
      {(phase === "waiting" || phase === "react") && (
        <div className="dungeon-timer">
          남은 시간: {timeLeft.toFixed(2)}s
        </div>
      )}

      {/* 돌석상 그린이 CSS 아트 영역 */}
      <div className={`stone-statue-container ${isGlowing ? "shake-hard" : "breathe-slow"}`}>
        <div className="statue-greenie">
          {/* 머리 부분 */}
          <div className="greenie-head">
            <div className="greenie-horns">
              <div className="horn left-horn"></div>
              <div className="horn right-horn"></div>
            </div>
            
            <div className="greenie-eyes">
              {/* 안광 효과 */}
              <div className={`eye left-eye ${isGlowing ? "eye-glow" : ""}`}></div>
              <div className={`eye right-eye ${isGlowing ? "eye-glow" : ""}`}></div>
            </div>
            
            <div className="greenie-snout">
              <div className="nostril left-nostril"></div>
              <div className="nostril right-nostril"></div>
            </div>
          </div>
          
          {/* 목 부분 (점박이 포함) */}
          <div className="greenie-neck">
            <div className="stone-spot spot-1"></div>
            <div className="stone-spot spot-2"></div>
            <div className="stone-spot spot-3"></div>
            <div className="stone-crack crack-1"></div>
            <div className="stone-crack crack-2"></div>
          </div>
        </div>
      </div>

      {/* 게임 상태별 UI */}
      <div className="dungeon-ui-overlay">
        {phase === "idle" && (
          <div className="dungeon-panel start-panel">
            <h2 className="dungeon-title">🗿 침묵의 석상</h2>
            <p>석상의 눈에 <b>붉은 안광</b>이 서리면 ⬆️키를 누르세요!</p>
            <p className="dungeon-warning">주의: 빛나기 전에 움직이면 즉사합니다.</p>
            <button className="dungeon-btn start-btn" onClick={startGame}>
              ▶ 던전 입장 (Space)
            </button>
          </div>
        )}

        {phase === "early" && (
          <div className="dungeon-panel error-panel">
            <h2>💥 끔찍한 죽음</h2>
            <p>석상이 빛나기 전에 움직였습니다!</p>
            <button className="dungeon-btn" onClick={startGame}>다시 도전 (Space)</button>
          </div>
        )}

        {phase === "timeout" && (
          <div className="dungeon-panel error-panel">
            <h2>⏰ 시간 초과</h2>
            <p>던전이 무너져 내렸습니다.</p>
            <button className="dungeon-btn" onClick={startGame}>다시 도전 (Space)</button>
          </div>
        )}

        {phase === "result" && resultData && (
          <div className="dungeon-panel result-panel">
            <h2 style={{ color: resultData.color }}>{resultData.title}</h2>
            <h1 className="reaction-time-text">{reactionTime} ms</h1>
            <p className="result-desc">{resultData.desc}</p>
            <button className="dungeon-btn" onClick={startGame}>다시 도전 (Space)</button>
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