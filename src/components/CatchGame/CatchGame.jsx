import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GAME_DURATION_MS,
  FALL_DURATION_MS,
  STAGE_HEIGHT_PX,
  RED_CIRCLE_TOP_RATIO,
  HIT_RANGE_MAX,
  ITEM_VISUAL_HEIGHT_PX,
  FAIL_PENALTY,
  SPAWN_COUNT,
  planSpawnTimes,
  pickRandomType,
  judgeHit,
  getItemY,
  getCatchResult,
} from './catchUtils';

const MAX_INPUTS = SPAWN_COUNT;
import FallingItem from './FallingItem';
import StarRating from '../TenSecondsGame/StarRating';
import './CatchGame.css';

let nextItemId = 1;

export default function CatchGame({
  autoStart = false,
  embedded = false,
  externalPhase,
  speedMultiplier = 1,
  onComplete,
  onContinue,
}) {
  const [phase, setPhase] = useState('idle');
  const [activeItems, setActiveItems] = useState([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [score, setScore] = useState(0);
  const [counts, setCounts] = useState({ perfect: 0, near: 0, fail: 0, miss: 0 });
  const [feedback, setFeedback] = useState(null);
  const [inputCount, setInputCount] = useState(0);
  const inputCountRef = useRef(0);

  const fallDurationMsEffective = FALL_DURATION_MS / speedMultiplier;

  const gameStartMsRef = useRef(0);
  const spawnTimeoutsRef = useRef([]);
  const cleanupTimeoutsRef = useRef([]);
  const endTimeoutRef = useRef(null);
  const tickIntervalRef = useRef(null);
  const activeItemsRef = useRef([]);
  const phaseRef = useRef('idle');
  const feedbackTimeoutRef = useRef(null);
  const feedbackIdRef = useRef(0);
  const scoreRef = useRef(0);
  const completedRef = useRef(false);
  // World scene에서 → 키로 진입했을 때, 그 키 입력이 즉시 캐치로 인식되지 않도록
  // 첫 keyup이 발생할 때까지 ArrowRight keydown 무시
  const rightKeyArmedRef = useRef(false);

  useEffect(() => { activeItemsRef.current = activeItems; }, [activeItems]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // ArrowRight keyup 한 번 발생할 때까지 캐치 입력 잠금 (mount 시 진입 키 잔류 방지)
  useEffect(() => {
    const onKeyUp = (e) => {
      if (e.code === 'ArrowRight') rightKeyArmedRef.current = true;
    };
    window.addEventListener('keyup', onKeyUp);
    return () => window.removeEventListener('keyup', onKeyUp);
  }, []);

  const removeItem = useCallback((id) => {
    setActiveItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const showFeedback = useCallback((kind, label) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    const id = ++feedbackIdRef.current;
    setFeedback({ kind, label, id });
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback((prev) => (prev && prev.id === id ? null : prev));
      feedbackTimeoutRef.current = null;
    }, 600);
  }, []);

  const spawnItem = useCallback(() => {
    const id = nextItemId++;
    const spawnAt = performance.now() - gameStartMsRef.current;
    setActiveItems((prev) => [...prev, { id, type: pickRandomType(), spawnAt }]);
    const tid = setTimeout(() => {
      setActiveItems((prev) => {
        const stillThere = prev.some((it) => it.id === id);
        if (stillThere) {
          setCounts((c) => ({ ...c, miss: c.miss + 1 }));
          showFeedback('miss', 'MISS');
        }
        return prev.filter((it) => it.id !== id);
      });
    }, fallDurationMsEffective + 300);
    cleanupTimeoutsRef.current.push(tid);
  }, [showFeedback, fallDurationMsEffective]);

  const cleanupTimers = useCallback(() => {
    spawnTimeoutsRef.current.forEach(clearTimeout);
    cleanupTimeoutsRef.current.forEach(clearTimeout);
    spawnTimeoutsRef.current = [];
    cleanupTimeoutsRef.current = [];
    if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current);
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    endTimeoutRef.current = null;
    tickIntervalRef.current = null;
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = null;
  }, []);

  const startGame = useCallback(() => {
    cleanupTimers();
    setActiveItems([]);
    setElapsedMs(0);
    setScore(0);
    scoreRef.current = 0;
    setCounts({ perfect: 0, near: 0, fail: 0, miss: 0 });
    setFeedback(null);
    setInputCount(0);
    inputCountRef.current = 0;
    completedRef.current = false;
    gameStartMsRef.current = performance.now();
    setPhase('running');

    const schedule = planSpawnTimes(
      GAME_DURATION_MS,
      undefined,
      undefined,
      undefined,
      undefined,
      fallDurationMsEffective,
    );
    spawnTimeoutsRef.current = schedule.map((t) => setTimeout(spawnItem, t));

    tickIntervalRef.current = setInterval(() => {
      setElapsedMs(performance.now() - gameStartMsRef.current);
    }, 100);

    if (!embedded) {
      endTimeoutRef.current = setTimeout(() => {
        cleanupTimers();
        setPhase('result');
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.(scoreRef.current);
        }
      }, GAME_DURATION_MS);
    }
  }, [cleanupTimers, spawnItem, onComplete, embedded, fallDurationMsEffective]);

  // 키보드: → 캐치, Space 시작(autoStart=false), Enter 다음으로
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (phaseRef.current === 'idle') {
          startGame();              // → 키로 시작
          return;
        }
        if (phaseRef.current !== 'running') return;

        const nowSinceStart = performance.now() - gameStartMsRef.current;
        const items = activeItemsRef.current;
        if (items.length === 0) return;

        let bestId = null;
        let bestDist = Infinity;
        const circleCenterY = RED_CIRCLE_TOP_RATIO * STAGE_HEIGHT_PX;
        for (const it of items) {
          const elapsed = nowSinceStart - it.spawnAt;
          if (elapsed < 0) continue;
          // getItemY는 이모지 div의 top edge → 시각 center로 보정
          const itemCenterY = getItemY(elapsed, STAGE_HEIGHT_PX, fallDurationMsEffective) + ITEM_VISUAL_HEIGHT_PX / 2;
          const dist = Math.abs(itemCenterY - circleCenterY);
          if (dist < bestDist) { bestDist = dist; bestId = it.id; }
        }
        if (bestId === null) return;

        // 한 번의 의미 있는 → 입력 = 기회 1회 차감
        inputCountRef.current += 1;
        setInputCount(inputCountRef.current);

        if (bestDist > HIT_RANGE_MAX) {
          setScore((s) => s + FAIL_PENALTY);
          setCounts((c) => ({ ...c, fail: c.fail + 1 }));
          showFeedback('fail', `FAIL ${FAIL_PENALTY}`);
        } else {
          const result = judgeHit(bestDist);
          setScore((s) => s + result.score);
          setCounts((c) => ({ ...c, [result.kind]: c[result.kind] + 1 }));
          const label = result.kind === 'perfect' ? 'PERFECT +50'
                      : result.kind === 'near'    ? 'GOOD +20'
                      :                              `FAIL ${FAIL_PENALTY}`;
          showFeedback(result.kind, label);
          removeItem(bestId);
        }

        // 기회 5번 모두 소진 → 즉시 종료
        if (inputCountRef.current >= MAX_INPUTS) {
          cleanupTimers();
          setPhase('result');
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete?.(scoreRef.current);
          }
        }
      } else if ((e.code === 'Enter' || e.code === 'Space')
                 && phaseRef.current === 'result'
                 && onContinue) {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [removeItem, startGame, showFeedback, autoStart, onContinue, cleanupTimers, onComplete]);

  useEffect(() => () => cleanupTimers(), [cleanupTimers]);

  // autoStart: mount 후 600ms grace 뒤 시작 (사용자가 진입 키 떼고 준비할 시간)
  useEffect(() => {
    if (!autoStart) return undefined;
    const t = setTimeout(() => startGame(), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // embedded 모드: externalPhase 'running' → 자동 시작, 'result' → 누적 점수로 보고
  useEffect(() => {
    if (!embedded || !externalPhase) return;
    if (externalPhase === 'running' && phaseRef.current === 'idle') {
      startGame();
    } else if (externalPhase === 'result' && !completedRef.current) {
      cleanupTimers();
      setPhase('result');
      completedRef.current = true;
      onComplete?.(scoreRef.current);
    }
  }, [embedded, externalPhase, startGame, cleanupTimers, onComplete]);

  const remainingSec = Math.max(0, (GAME_DURATION_MS - elapsedMs) / 1000);

  return (
    <div className="catch-stage">
      <div className="catch-bg" aria-hidden="true" />
      <div className="catch-light-beam" aria-hidden="true" />
      <div className="catch-pillar catch-pillar-left" aria-hidden="true" />
      <div className="catch-pillar catch-pillar-right" aria-hidden="true" />
      <div className="catch-altar-platform" aria-hidden="true" />
      <div className="catch-circle" aria-hidden="true">
        <div className="catch-target-inner" />
      </div>

      {phase === 'running' && activeItems.map((item) => (
        <FallingItem key={item.id} type={item.type} speedMultiplier={speedMultiplier} />
      ))}

      {phase === 'running' && feedback && (
        <div
          key={feedback.id}
          className={`catch-feedback catch-feedback-${feedback.kind}`}
          aria-hidden="true"
        >
          {feedback.label}
        </div>
      )}

      <div className="catch-ui-overlay">
        {!embedded && phase === 'idle' && !autoStart && (
          <div className="catch-panel catch-panel-start">
            <h2 className="catch-title">⚔️ 장비 드롭의 시련</h2>
            <p className="catch-subtitle">"흐름을 읽고 잡아내라!"</p>
            <p>신이 내려주는 장비를 제단(빨간 원) 위치에서 <b>→ 키</b>로 잡아라!</p>
            <p className="catch-hint">검 ⚔️ · 방패 🛡️ · 포션 🧪 · 10초 / 기회 5번</p>
            <div className="score-rules">
              <div className="score-rules-title">📊 판정 기준 (1회 캐치당)</div>
              <div className="score-rule tier-legendary"><span>⭐⭐⭐⭐⭐ PERFECT (정중앙)</span><b>+50점</b></div>
              <div className="score-rule tier-rare"><span>⭐⭐ NEAR (근접)</span><b>+20점</b></div>
              <div className="score-rule score-rule-bad"><span>FAIL (잘못 누름)</span><b>{FAIL_PENALTY}점</b></div>
              <div className="score-rule score-rule-bad"><span>MISS (놓침)</span><b>0점</b></div>
              <div className="score-rules-title" style={{ marginTop: 8 }}>🏆 누적 등급 (5개 만점 250)</div>
              <div className="score-rule tier-legendary"><span>⭐⭐⭐⭐⭐ 레전더리</span><b>≥230점</b></div>
              <div className="score-rule tier-unique"><span>⭐⭐⭐⭐ 유니크</span><b>≥180점</b></div>
              <div className="score-rule tier-epic"><span>⭐⭐⭐ 에픽</span><b>≥130점</b></div>
              <div className="score-rule tier-rare"><span>⭐⭐ 레어</span><b>≥80점</b></div>
              <div className="score-rule tier-common"><span>⭐ 일반</span><b>&lt;80점</b></div>
            </div>
            <button className="catch-btn catch-btn-primary" onClick={startGame} type="button">
              ▶ 시작 (→ 키)
            </button>
          </div>
        )}

        {phase === 'running' && (
          <>
            <div className="catch-hud">
              {!embedded && (
                <div className="catch-hud-row">
                  <span>남은 시간</span><b>{remainingSec.toFixed(1)}s</b>
                </div>
              )}
              <div className="catch-hud-row">
                <span>점수</span><b>{score}</b>
              </div>
              <div className="catch-hud-row">
                <span>기회</span><b>{Math.max(0, MAX_INPUTS - inputCount)} / {MAX_INPUTS}</b>
              </div>
            </div>
            {!embedded && <div className="catch-running-hint">→ 키로 거치대에서 잡아라!</div>}
          </>
        )}

        {!embedded && phase === 'result' && (() => {
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
                <div className="catch-stat-row"><span>총점</span><span className="catch-stat-value">{score >= 0 ? `+${score}` : score}</span></div>
                <div className="catch-stat-row"><span>완벽 (+50)</span><span>{counts.perfect}</span></div>
                <div className="catch-stat-row"><span>근접 (+20)</span><span>{counts.near}</span></div>
                <div className="catch-stat-row"><span>실패 ({FAIL_PENALTY})</span><span>{counts.fail}</span></div>
                <div className="catch-stat-row"><span>놓침 (0)</span><span>{counts.miss}</span></div>
                <div className="catch-stat-row catch-stat-row-highlight"><span>판정 횟수</span><span>{totalJudged}</span></div>
              </div>
              <p className="catch-result-desc">{result.desc}</p>

              <div className="catch-result-btns">
                {onContinue ? (
                  <button className="catch-btn catch-btn-primary" onClick={onContinue} type="button">
                    다음으로 (Enter / Space)
                  </button>
                ) : (
                  <>
                    <button className="catch-btn catch-btn-primary" onClick={startGame} type="button">
                      ▶ 다시 도전 (Space)
                    </button>
                    <button className="catch-btn catch-btn-ghost" onClick={() => setPhase('idle')} type="button">
                      ↩ 처음으로
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
