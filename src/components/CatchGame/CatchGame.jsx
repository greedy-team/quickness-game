import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GAME_DURATION_MS,
  FALL_DURATION_MS,
  STAGE_HEIGHT_PX,
  RED_CIRCLE_TOP_PX,
  HIT_RANGE_MAX,
  planSpawnTimes,
  pickRandomType,
  judgeHit,
  getItemY,
  getCatchResult,
} from './catchUtils';
import FallingItem from './FallingItem';
import StarRating from '../TenSecondsGame/StarRating';
import './CatchGame.css';

let nextItemId = 1;

export default function CatchGame() {
  const [phase, setPhase] = useState('idle');
  const [activeItems, setActiveItems] = useState([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [score, setScore] = useState(0);
  const [counts, setCounts] = useState({ perfect: 0, near: 0, fail: 0, miss: 0 });

  const gameStartMsRef = useRef(0);
  const spawnTimeoutsRef = useRef([]);
  const cleanupTimeoutsRef = useRef([]);
  const endTimeoutRef = useRef(null);
  const tickIntervalRef = useRef(null);
  const activeItemsRef = useRef([]);
  const phaseRef = useRef('idle');

  // ref 미러 동기화 (closure stale 방지)
  useEffect(() => { activeItemsRef.current = activeItems; }, [activeItems]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const removeItem = useCallback((id) => {
    setActiveItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const spawnItem = useCallback(() => {
    const id = nextItemId++;
    const spawnAt = performance.now() - gameStartMsRef.current;
    setActiveItems((prev) => [...prev, { id, type: pickRandomType(), spawnAt }]);
    // 화면 밖으로 나가면 miss 카운트 + 제거
    const tid = setTimeout(() => {
      setActiveItems((prev) => {
        const stillThere = prev.some((it) => it.id === id);
        if (stillThere) {
          setCounts((c) => ({ ...c, miss: c.miss + 1 }));
        }
        return prev.filter((it) => it.id !== id);
      });
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
    setScore(0);
    setCounts({ perfect: 0, near: 0, fail: 0, miss: 0 });
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

  // 키보드 입력 (→ : 캐치, Space : 시작)
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (phaseRef.current !== 'running') return;
        const nowSinceStart = performance.now() - gameStartMsRef.current;
        const items = activeItemsRef.current;
        if (items.length === 0) return;  // 활성 아이템 없으면 무시 (페널티 X)

        // 빨간 원과 가장 가까운 활성 아이템 찾기
        let bestId = null;
        let bestDist = Infinity;
        for (const it of items) {
          const elapsed = nowSinceStart - it.spawnAt;
          if (elapsed < 0) continue;
          const y = getItemY(elapsed, STAGE_HEIGHT_PX, FALL_DURATION_MS);
          const dist = Math.abs(y - RED_CIRCLE_TOP_PX);
          if (dist < bestDist) {
            bestDist = dist;
            bestId = it.id;
          }
        }
        if (bestId === null) return;
        if (bestDist > HIT_RANGE_MAX) {
          // 사거리 밖 입력 — fail 카운트만 (점수 0)
          setCounts((c) => ({ ...c, fail: c.fail + 1 }));
          return;
        }
        const result = judgeHit(bestDist);
        setScore((s) => s + result.score);
        setCounts((c) => ({ ...c, [result.kind]: c[result.kind] + 1 }));
        removeItem(bestId);
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (phaseRef.current === 'idle' || phaseRef.current === 'result') {
          startGame();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [removeItem, startGame]);

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
            <p className="catch-subtitle">"흐름을 읽고 잡아내라!"</p>
            <p>하늘에서 떨어지는 장비를 거치대(빨간 원) 위치에서 <b>→ 키</b>로 잡아라!</p>
            <p className="catch-hint">검 ⚔️ · 방패 🛡️ · 포션 🧪 — 정확히 거치대 안에서 잡으면 50점</p>
            <button className="catch-btn catch-btn-primary" onClick={startGame} type="button">
              ▶ 시작 (Space)
            </button>
          </div>
        )}

        {phase === 'running' && (
          <>
            <div className="catch-hud">
              <div className="catch-hud-row">
                <span>남은 시간</span><b>{remainingSec.toFixed(1)}s</b>
              </div>
              <div className="catch-hud-row">
                <span>점수</span><b>{score}</b>
              </div>
            </div>
            <div className="catch-running-hint">→ 키로 거치대에서 잡아라!</div>
          </>
        )}

        {phase === 'result' && (() => {
          const result = getCatchResult(score);
          const totalJudged = counts.perfect + counts.near + counts.fail + counts.miss;
          return (
            <div
              className="catch-panel catch-panel-result"
              style={{ '--catch-result-color': result.color }}
            >
              <div className="catch-grade-badge" data-grade={result.grade}>{result.grade}</div>
              <div className="catch-result-title" style={{ color: result.color }}>{result.title}</div>
              <StarRating count={result.stars} />

              <div className="catch-stats">
                <div className="catch-stat-row">
                  <span>총점</span><span className="catch-stat-value">{score}</span>
                </div>
                <div className="catch-stat-row">
                  <span>완벽 (50점)</span><span>{counts.perfect}</span>
                </div>
                <div className="catch-stat-row">
                  <span>근접 (20점)</span><span>{counts.near}</span>
                </div>
                <div className="catch-stat-row">
                  <span>실패 / 놓침</span><span>{counts.fail + counts.miss}</span>
                </div>
                <div className="catch-stat-row catch-stat-row-highlight">
                  <span>판정 횟수</span><span>{totalJudged}</span>
                </div>
              </div>
              <p className="catch-result-desc">{result.desc}</p>

              <div className="catch-result-btns">
                <button className="catch-btn catch-btn-primary" onClick={startGame} type="button">
                  ▶ 다시 도전 (Space)
                </button>
                <button className="catch-btn catch-btn-ghost" onClick={() => setPhase('idle')} type="button">
                  ↩ 처음으로
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
