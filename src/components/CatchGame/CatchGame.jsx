import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GAME_DURATION_MS,
  FALL_DURATION_MS,
  planSpawnTimes,
  pickRandomType,
} from './catchUtils';
import FallingItem from './FallingItem';
import './CatchGame.css';

let nextItemId = 1;

export default function CatchGame() {
  const [phase, setPhase] = useState('idle');
  const [activeItems, setActiveItems] = useState([]);  // [{ id, type, spawnAt }]
  const [elapsedMs, setElapsedMs] = useState(0);

  const gameStartMsRef = useRef(0);
  const spawnTimeoutsRef = useRef([]);
  const cleanupTimeoutsRef = useRef([]);
  const endTimeoutRef = useRef(null);
  const tickIntervalRef = useRef(null);

  const spawnItem = useCallback(() => {
    const id = nextItemId++;
    const spawnAt = performance.now() - gameStartMsRef.current;
    setActiveItems((prev) => [...prev, { id, type: pickRandomType(), spawnAt }]);
    // 화면 밖으로 나간 후 자동 제거
    const tid = setTimeout(() => {
      setActiveItems((prev) => prev.filter((it) => it.id !== id));
    }, FALL_DURATION_MS + 300);
    cleanupTimeoutsRef.current.push(tid);
  }, []);

  const cleanupTimers = useCallback(() => {
    spawnTimeoutsRef.current.forEach(clearTimeout);
    cleanupTimeoutsRef.current.forEach(clearTimeout);
    spawnTimeoutsRef.current = [];
    cleanupTimeoutsRef.current = [];
    if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current);
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    endTimeoutRef.current = null;
    tickIntervalRef.current = null;
  }, []);

  const startGame = useCallback(() => {
    cleanupTimers();
    setActiveItems([]);
    setElapsedMs(0);
    gameStartMsRef.current = performance.now();
    setPhase('running');

    const schedule = planSpawnTimes();
    spawnTimeoutsRef.current = schedule.map((t) => setTimeout(spawnItem, t));

    tickIntervalRef.current = setInterval(() => {
      setElapsedMs(performance.now() - gameStartMsRef.current);
    }, 100);

    endTimeoutRef.current = setTimeout(() => {
      cleanupTimers();
      setPhase('result');
    }, GAME_DURATION_MS);
  }, [cleanupTimers, spawnItem]);

  // 컴포넌트 unmount 시 cleanup
  useEffect(() => () => cleanupTimers(), [cleanupTimers]);

  const remainingSec = Math.max(0, (GAME_DURATION_MS - elapsedMs) / 1000);

  return (
    <div className="catch-stage">
      <div className="catch-bg" aria-hidden="true" />
      <div className="catch-greenie" aria-hidden="true" />
      <div className="catch-circle" aria-hidden="true" />

      {phase === 'running' && activeItems.map((item) => (
        <FallingItem key={item.id} type={item.type} />
      ))}

      <div className="catch-ui-overlay">
        {phase === 'idle' && (
          <div className="catch-panel catch-panel-start">
            <h2 className="catch-title">⚔️ 장비 드롭의 시련</h2>
            <p>하늘에서 떨어지는 장비를 거치대(빨간 원) 위치에서 <b>→ 키</b>로 잡아라!</p>
            <button className="catch-btn catch-btn-primary" onClick={startGame} type="button">
              ▶ 시작 (Space)
            </button>
          </div>
        )}

        {phase === 'running' && (
          <div className="catch-hud">
            <div>남은 시간: {remainingSec.toFixed(1)}s</div>
          </div>
        )}

        {phase === 'result' && (
          <div className="catch-panel">
            <h2>임시 결과 (Task 5·6에서 완성)</h2>
            <button className="catch-btn" onClick={startGame} type="button">다시 도전</button>
          </div>
        )}
      </div>
    </div>
  );
}
