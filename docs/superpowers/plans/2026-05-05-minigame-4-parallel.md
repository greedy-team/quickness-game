# 미니게임 4 "결전의 서막" 병렬 진행 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PRD §2.4 명세대로 1·2·3번 미니게임을 좌·중·우 3분할 화면에서 동시 진행하고, 합산 점수 ×2 보너스를 적용한 통합 미니게임 (`minigame_4`)을 구현한다.

**Architecture:** 새 컴포넌트 `ParallelGame`이 마스터 phase('idle' / 'running' / 'result')와 마스터 10초 타이머를 통제한다. 기존 `TenSecondsGame` / `ColorReactionGame` / `CatchGame`에 `embedded` 모드 prop을 추가해, 자체 idle/result 패널과 자체 종료 트리거를 비활성화하고 외부에서 phase를 주입받게 한다. 점수 합산·등급 산정은 `parallelUtils.js`로 분리한다.

**Tech Stack:** React 19, Vite 8, vanilla CSS (테스트 인프라 미도입 → 수동 검증 + console.assert)

**Spec:** `docs/superpowers/specs/2026-05-05-minigame-4-parallel-design.md`

---

## 파일 구조

| Path | 변경 | 책임 |
|---|---|---|
| `src/components/ParallelGame/ParallelGame.jsx` | Create | 마스터 phase / 마스터 타이머 / 점수 합산 / idle·running·result 렌더 |
| `src/components/ParallelGame/ParallelGame.css` | Create | 3분할 grid 레이아웃, idle/result 패널, HUD |
| `src/components/ParallelGame/parallelUtils.js` | Create | `getParallelGrade(totalBonus)` + 등급 메타데이터 + console.assert |
| `src/components/TenSecondsGame/TenSecondsGame.jsx` | Modify | `embedded`, `externalPhase` prop 추가 |
| `src/components/ColorReactionGame/ColorReactionGame.jsx` | Modify | `embedded`, `externalPhase` prop 추가 (embedded 시 대기 2-6초) |
| `src/components/CatchGame/CatchGame.jsx` | Modify | `embedded`, `externalPhase`, `speedMultiplier` prop 추가 |
| `src/App.jsx` | Modify | `state.scene === 'minigame_4'` 분기를 `<ParallelGame />`로 교체 |

---

## Task 1: parallelUtils.js (등급 산정 모듈)

**Files:**
- Create: `src/components/ParallelGame/parallelUtils.js`

- [ ] **Step 1: 디렉터리 생성 및 파일 작성**

```bash
mkdir -p src/components/ParallelGame
```

`src/components/ParallelGame/parallelUtils.js`:

```js
// 미니게임 4 (병렬 진행) — 합산 점수 → 5단계 등급 산정
// 1번 max 100 + 2번 max 100 + 3번 max 300 (SPAWN_COUNT 6 × 50) = 합산 max 500
// × 2 보너스 적용 후 max 1000
export const PARALLEL_MAX_SCORE = 1000;

export const PARALLEL_GRADES = [
  { grade: 'LEGENDARY', threshold: 900, stars: 5, color: '#ffd700', title: '🌟 결전의 영웅', desc: '갑옷 입은 그린이의 모든 능력이 폭발했다.' },
  { grade: 'UNIQUE',    threshold: 750, stars: 4, color: '#ff007f', title: '💎 갑옷의 수호자', desc: '훌륭한 종합 시험. 보스 앞에서도 흔들리지 않으리라.' },
  { grade: 'EPIC',      threshold: 550, stars: 3, color: '#a78bfa', title: '🔮 결전의 전사', desc: '준비는 충분하다. 보스를 향해 나아가자.' },
  { grade: 'RARE',      threshold: 300, stars: 2, color: '#60a5fa', title: '⚔️ 시련의 통과자', desc: '아슬아슬하게 시련을 통과했다.' },
  { grade: 'COMMON',    threshold: 0,   stars: 1, color: '#86efac', title: '🛡️ 새내기 전사', desc: '아직 부족하지만 보스를 향한 첫 발은 뗐다.' },
];

export function getParallelGrade(totalBonus) {
  const score = Math.max(0, totalBonus);
  return PARALLEL_GRADES.find((g) => score >= g.threshold);
}

// 합산 점수 (보너스 적용 전/후) 산출
export function computeFinalScore(scoreLeft, scoreCenter, scoreRight, bonus = 2) {
  const raw = Math.max(0, (scoreLeft ?? 0) + (scoreCenter ?? 0) + (scoreRight ?? 0));
  return { raw, total: raw * bonus };
}

// dev 환경 자체 검증 (console.assert)
if (import.meta.env?.DEV) {
  console.assert(getParallelGrade(1000).grade === 'LEGENDARY', 'parallelUtils: 1000 → LEGENDARY');
  console.assert(getParallelGrade(900).grade === 'LEGENDARY', 'parallelUtils: 900 → LEGENDARY');
  console.assert(getParallelGrade(899).grade === 'UNIQUE',    'parallelUtils: 899 → UNIQUE');
  console.assert(getParallelGrade(750).grade === 'UNIQUE',    'parallelUtils: 750 → UNIQUE');
  console.assert(getParallelGrade(749).grade === 'EPIC',      'parallelUtils: 749 → EPIC');
  console.assert(getParallelGrade(550).grade === 'EPIC',      'parallelUtils: 550 → EPIC');
  console.assert(getParallelGrade(549).grade === 'RARE',      'parallelUtils: 549 → RARE');
  console.assert(getParallelGrade(300).grade === 'RARE',      'parallelUtils: 300 → RARE');
  console.assert(getParallelGrade(299).grade === 'COMMON',    'parallelUtils: 299 → COMMON');
  console.assert(getParallelGrade(0).grade === 'COMMON',      'parallelUtils: 0 → COMMON');
  console.assert(getParallelGrade(-100).grade === 'COMMON',   'parallelUtils: -100 → COMMON (clamp)');
  const f = computeFinalScore(100, 100, 300);
  console.assert(f.raw === 500 && f.total === 1000, 'parallelUtils: max raw 500, total 1000');
  const fNeg = computeFinalScore(100, -20, 300);
  console.assert(fNeg.raw === 380 && fNeg.total === 760, 'parallelUtils: 음수 입력 시 raw 클램프 안 됨 — 380/760');
  // 주의: 음수 클램프는 합산 raw 단계에서. -20+100+300=380. (음수 입력은 합산 결과로 자연 흡수)
}
```

- [ ] **Step 2: 브라우저 콘솔로 self-test 확인**

```bash
npm run dev
```
브라우저 DevTools 콘솔 → `import.meta.env.DEV` 환경에서 console.assert 통과 (실패 시 빨간 에러).
빠른 검증: `import { getParallelGrade } from './components/ParallelGame/parallelUtils'; getParallelGrade(900);`
Expected: 콘솔에 assert 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/components/ParallelGame/parallelUtils.js
git commit -m "feat: parallelUtils 등급 산정 모듈 추가 #16"
```

---

## Task 2: TenSecondsGame embedded 모드 추가

**Files:**
- Modify: `src/components/TenSecondsGame/TenSecondsGame.jsx`

**목표 동작:**
- `embedded={true}` + `externalPhase="running"` → mount 시 자동 시작 (기존 autoStart 경로 재사용)
- `externalPhase="result"` 수신 → `cleanup` 호출 + 자체 idle/result 패널 렌더 안 함 + ← 안 눌렀으면 score=0으로 onComplete
- ← 키 입력은 그대로 동작 (자체 stopGame이 onComplete(score) 호출)

- [ ] **Step 1: 함수 시그니처 + 외부 phase 동기화 effect 추가**

`src/components/TenSecondsGame/TenSecondsGame.jsx` 7-9행 (function signature) 교체:

```jsx
export default function TenSecondsGame({
  autoStart = false,
  embedded = false,
  externalPhase,
  onComplete,
  onContinue,
}) {
  const [phase, setPhase] = useState("idle");
```

- [ ] **Step 2: external phase 동기화 effect 추가 (autoStart effect 아래)**

`src/components/TenSecondsGame/TenSecondsGame.jsx` 56행 근처 `useEffect(() => { if (autoStart) ... })` 바로 아래에 추가:

```jsx
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, externalPhase]);
```

- [ ] **Step 3: render 분기에 embedded 가드 추가**

`src/components/TenSecondsGame/TenSecondsGame.jsx` 95-209행의 `return (...)` 블록에서 controls-area / hint / score-rules / result-panel을 embedded 모드일 때 숨긴다. 95행부터 끝까지의 JSX를 다음과 같이 교체:

```jsx
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
```

- [ ] **Step 4: 단독 모드 회귀 확인**

```bash
npm run dev
```
브라우저: 콘솔에서 `dispatch({ type: 'GO_TO_SCENE', payload: 'minigame_1' })` 또는 World scene에서 1번 stage 진입 → 기존 idle/result 패널 + ← 키 동작 정상.

- [ ] **Step 5: 커밋**

```bash
git add src/components/TenSecondsGame/TenSecondsGame.jsx
git commit -m "feat: TenSecondsGame embedded 모드 추가 #16"
```

---

## Task 3: ColorReactionGame embedded 모드 추가 + 대기 단축

**Files:**
- Modify: `src/components/ColorReactionGame/ColorReactionGame.jsx`

**목표 동작:**
- `embedded={true}` + `externalPhase="running"` → 자동 시작 + 대기 시간 **2-6초 랜덤** (단독 모드는 4-10초 유지)
- `externalPhase="result"` 수신 → cleanup, 자체 패널 숨김, 미보고 시 0점 처리
- 자체 10초 카운트다운(`gameIntervalRef`)은 embedded 모드에서 비활성

- [ ] **Step 1: 함수 시그니처 변경**

`src/components/ColorReactionGame/ColorReactionGame.jsx` 6행 교체:

```jsx
export default function ColorReactionGame({
  autoStart = false,
  embedded = false,
  externalPhase,
  onComplete,
  onContinue,
}) {
```

- [ ] **Step 2: startGame 함수에서 embedded 분기 추가**

`src/components/ColorReactionGame/ColorReactionGame.jsx` 31-53행 (`startGame` 콜백)을 다음과 같이 교체:

```jsx
  const startGame = useCallback(() => {
    completedRef.current = false;
    setPhase("waiting");
    setTimeLeft(10.00);
    setReactionTime(0);

    // embedded 모드는 자체 10초 카운트다운 비활성 (마스터 타이머가 통제)
    if (!embedded) {
      gameIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0.01) {
            endGame("timeout");
            return 0;
          }
          return prev - 0.01;
        });
      }, 10);
    }

    // 단독: 4-10초, embedded: 2-6초 (마스터 10초 안에 react 윈도우 보장)
    const minDelay = embedded ? 2000 : 4000;
    const maxDelay = embedded ? 6000 : 10000;
    const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;
    timeoutIdRef.current = setTimeout(() => {
      setPhase("react");
      glowStartTimeRef.current = performance.now();
    }, randomDelay);
  }, [endGame, embedded]);
```

- [ ] **Step 3: external phase 동기화 effect 추가**

`src/components/ColorReactionGame/ColorReactionGame.jsx` 81-85행 (`autoStart` effect) 아래에 추가:

```jsx
  // embedded 모드: externalPhase 'running' → 자동 시작, 'result' → 미보고 시 0점
  useEffect(() => {
    if (!embedded || !externalPhase) return;
    if (externalPhase === 'running' && phase === 'idle') {
      startGame();
    } else if (externalPhase === 'result' && !completedRef.current) {
      // waiting 중이거나 react 못 누른 상태에서 마스터가 종료 → 0점
      clearInterval(gameIntervalRef.current);
      clearTimeout(timeoutIdRef.current);
      setPhase('timeout');
      completedRef.current = true;
      onComplete?.(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, externalPhase]);
```

- [ ] **Step 4: 자체 패널 숨김 (return JSX 수정)**

`src/components/ColorReactionGame/ColorReactionGame.jsx` 101-198행의 return 블록에서 `dungeon-ui-overlay` 내부 패널들을 embedded일 때 숨긴다. 135행부터 시작하는 `<div className="dungeon-ui-overlay">` 블록 내부를 다음과 같이 교체:

```jsx
      <div className="dungeon-ui-overlay">
        {!embedded && phase === "idle" && !autoStart && (
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

        {!embedded && phase === "early" && (
          <div className="dungeon-panel error-panel">
            <h2>💥 끔찍한 죽음</h2>
            <p>석상이 빛나기 전에 움직였습니다!</p>
            {score !== null && <p style={{ color: '#fca5a5', fontWeight: 'bold' }}>점수: {score}</p>}
            {onContinue
              ? <button className="dungeon-btn" onClick={onContinue}>다음으로 (Enter / Space)</button>
              : <button className="dungeon-btn" onClick={startGame}>다시 도전 (Space)</button>}
          </div>
        )}

        {!embedded && phase === "timeout" && (
          <div className="dungeon-panel error-panel">
            <h2>⏰ 시간 초과</h2>
            <p>던전이 무너져 내렸습니다.</p>
            {score !== null && <p style={{ color: '#fbbf24', fontWeight: 'bold' }}>점수: +{score}</p>}
            {onContinue
              ? <button className="dungeon-btn" onClick={onContinue}>다음으로 (Enter / Space)</button>
              : <button className="dungeon-btn" onClick={startGame}>다시 도전 (Space)</button>}
          </div>
        )}

        {!embedded && phase === "result" && resultData && (
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
```

추가로 101-107행 `dungeon-timer` 표시도 embedded일 때 숨긴다:

```jsx
      {!embedded && (phase === "waiting" || phase === "react") && (
        <div className="dungeon-timer">
          남은 시간: {timeLeft.toFixed(2)}s
        </div>
      )}
```

- [ ] **Step 5: 단독 모드 회귀 확인**

```bash
npm run dev
```
World scene에서 2번 stage 진입 → 기존 idle/result 패널 + ↑ 키 동작 정상. 4-10초 대기 시간 유지.

- [ ] **Step 6: 커밋**

```bash
git add src/components/ColorReactionGame/ColorReactionGame.jsx
git commit -m "feat: ColorReactionGame embedded 모드 + 대기 단축 추가 #16"
```

---

## Task 4: CatchGame embedded 모드 + speedMultiplier 추가

**Files:**
- Modify: `src/components/CatchGame/CatchGame.jsx`

**목표 동작:**
- `embedded={true}` + `externalPhase="running"` → 자동 시작
- `externalPhase="result"` → cleanup + 미보고 시 현재 누적 점수로 onComplete
- `speedMultiplier=1.5` → 낙하 시간 단축 (`FALL_DURATION_MS / 1.5`), `planSpawnTimes` fallMs 인자 갱신, → 키 거리 판정도 동일 effective duration 사용
- `FallingItem`에 `speedMultiplier` prop 전달 (기존 컴포넌트가 이미 지원)

- [ ] **Step 1: 함수 시그니처 변경 + effective fall duration 계산**

`src/components/CatchGame/CatchGame.jsx` 21행 교체:

```jsx
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

  const fallDurationMsEffective = FALL_DURATION_MS / speedMultiplier;
```

- [ ] **Step 2: spawnItem cleanup timeout, planSpawnTimes 호출, → 키 거리 판정에 effective duration 적용**

`src/components/CatchGame/CatchGame.jsx` 71-86행 (`spawnItem` 콜백) 교체:

```jsx
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
```

`src/components/CatchGame/CatchGame.jsx` 113-114행 (planSpawnTimes 호출) 교체:

```jsx
    const schedule = planSpawnTimes(
      GAME_DURATION_MS,
      undefined,
      undefined,
      undefined,
      undefined,
      fallDurationMsEffective,
    );
    spawnTimeoutsRef.current = schedule.map((t) => setTimeout(spawnItem, t));
```

`src/components/CatchGame/CatchGame.jsx` 152행 (getItemY 호출) 교체:

```jsx
          const itemCenterY = getItemY(elapsed, STAGE_HEIGHT_PX, fallDurationMsEffective) + ITEM_VISUAL_HEIGHT_PX / 2;
```

- [ ] **Step 3: external phase 동기화 effect 추가 + endTimeoutRef 비활성**

`src/components/CatchGame/CatchGame.jsx` 120-127행 (endTimeoutRef setTimeout) 교체 — embedded일 때 자체 종료 비활성:

```jsx
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
```

`startGame` 의존성 배열에 `embedded` 추가:

```jsx
  }, [cleanupTimers, spawnItem, onComplete, embedded]);
```

`src/components/CatchGame/CatchGame.jsx` 184-189행 (autoStart effect) 아래에 추가:

```jsx
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, externalPhase]);
```

- [ ] **Step 4: FallingItem에 speedMultiplier 전달**

`src/components/CatchGame/CatchGame.jsx` 204-206행 교체:

```jsx
      {phase === 'running' && activeItems.map((item) => (
        <FallingItem key={item.id} type={item.type} speedMultiplier={speedMultiplier} />
      ))}
```

- [ ] **Step 5: 자체 패널 숨김 (return JSX의 catch-ui-overlay 영역)**

`src/components/CatchGame/CatchGame.jsx` 218-297행 (`catch-ui-overlay`)에서 idle / result 패널 + 시작 버튼을 embedded일 때 숨긴다. `<div className="catch-ui-overlay">` 블록 내부 시작 부분(218행)부터 끝(297행)까지 교체:

```jsx
      <div className="catch-ui-overlay">
        {!embedded && phase === 'idle' && !autoStart && (
          <div className="catch-panel catch-panel-start">
            <h2 className="catch-title">⚔️ 장비 드롭의 시련</h2>
            <p className="catch-subtitle">"흐름을 읽고 잡아내라!"</p>
            <p>신이 내려주는 장비를 제단(빨간 원) 위치에서 <b>→ 키</b>로 잡아라!</p>
            <p className="catch-hint">검 ⚔️ · 방패 🛡️ · 포션 🧪 (10초 동안 5개 등장)</p>
            <div className="score-rules">
              <div className="score-rules-title">📊 판정 기준 (1회 캐치당)</div>
              <div className="score-rule tier-legendary"><span>⭐⭐⭐⭐⭐ PERFECT (정중앙)</span><b>+50점</b></div>
              <div className="score-rule tier-rare"><span>⭐⭐ NEAR (근접)</span><b>+20점</b></div>
              <div className="score-rule score-rule-bad"><span>FAIL / MISS</span><b>0점</b></div>
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

        {!embedded && phase === 'running' && (
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
                <div className="catch-stat-row"><span>총점</span><span className="catch-stat-value">+{score}</span></div>
                <div className="catch-stat-row"><span>완벽 (50점)</span><span>{counts.perfect}</span></div>
                <div className="catch-stat-row"><span>근접 (20점)</span><span>{counts.near}</span></div>
                <div className="catch-stat-row"><span>실패 / 놓침</span><span>{counts.fail + counts.miss}</span></div>
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
```

- [ ] **Step 6: 단독 모드 회귀 확인 (속도 1× 유지 확인)**

```bash
npm run dev
```
World scene에서 3번 stage 진입 → 기존 낙하 속도(`FALL_DURATION_MS=2000ms`) + idle/result 패널 + → 키 동작 정상.

- [ ] **Step 7: 커밋**

```bash
git add src/components/CatchGame/CatchGame.jsx
git commit -m "feat: CatchGame embedded 모드 + speedMultiplier 추가 #16"
```

---

## Task 5: ParallelGame.jsx — idle phase + 마스터 phase 골격

**Files:**
- Create: `src/components/ParallelGame/ParallelGame.jsx`

**목표 동작:**
- mount 시 phase 'idle'
- Space/Enter → phase 'running'
- (running/result 렌더는 Task 6, 7에서 추가)

- [ ] **Step 1: 컴포넌트 골격 작성 (idle phase만)**

`src/components/ParallelGame/ParallelGame.jsx`:

```jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import TenSecondsGame from '../TenSecondsGame/TenSecondsGame';
import ColorReactionGame from '../ColorReactionGame/ColorReactionGame';
import CatchGame from '../CatchGame/CatchGame';
import StarRating from '../TenSecondsGame/StarRating';
import {
  PARALLEL_MAX_SCORE,
  getParallelGrade,
  computeFinalScore,
} from './parallelUtils';
import './ParallelGame.css';

const MASTER_DURATION_MS = 10_000;

export default function ParallelGame({ onComplete, onContinue }) {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'running' | 'result'
  const [elapsedMs, setElapsedMs] = useState(0);
  const [scoreLeft, setScoreLeft] = useState(null);
  const [scoreCenter, setScoreCenter] = useState(null);
  const [scoreRight, setScoreRight] = useState(null);

  const startMsRef = useRef(0);
  const rafRef = useRef(null);
  const masterCompleteRef = useRef(false);

  const startMaster = useCallback(() => {
    masterCompleteRef.current = false;
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
              <div className="parallel-area-max">최대 100점</div>
            </div>
            <div className="parallel-area-card">
              <div className="parallel-area-icon">🗿</div>
              <div className="parallel-area-name">침묵의 석상</div>
              <div className="parallel-area-key">↑ 키</div>
              <div className="parallel-area-max">최대 100점</div>
            </div>
            <div className="parallel-area-card">
              <div className="parallel-area-icon">⚔️</div>
              <div className="parallel-area-name">장비 캐치</div>
              <div className="parallel-area-key">→ 키 (속도 1.5×)</div>
              <div className="parallel-area-max">최대 300점</div>
            </div>
          </div>
          <p className="parallel-bonus-note">3영역 합산 점수 <b>× 2배 보너스</b> → 최대 {PARALLEL_MAX_SCORE}점</p>
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
    </div>
  );
}
```

- [ ] **Step 2: App.jsx에 임시 라우팅 (Task 9에서 정식화)** — 여기서는 잠시 직접 import해 idle 패널만 검증

수동 검증을 위해 잠시 App.jsx 67행 (`{state.scene === 'minigame_4' && ...}` 분기)를 다음으로 임시 교체:

```jsx
import ParallelGame from './components/ParallelGame/ParallelGame';
// ...
      {state.scene === 'minigame_4' && (
        <ParallelGame
          onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
          onContinue={() => {
            dispatch({ type: 'SET_WORLD_STAGE', payload: 5 });
            dispatch({ type: 'GO_TO_SCENE', payload: 'boss_fight' });
          }}
        />
      )}
```

- [ ] **Step 3: 브라우저로 idle 패널 확인**

```bash
npm run dev
```
World scene에서 4번 stage 진입 → 결전의 서막 idle 패널 표시. Space/Enter → phase 변화 (아직 running UI 미구현이라 빈 화면이 정상).

- [ ] **Step 4: 커밋**

```bash
git add src/components/ParallelGame/ParallelGame.jsx src/App.jsx
git commit -m "feat: ParallelGame idle phase 골격 + App 라우팅 #16"
```

---

## Task 6: ParallelGame running phase — 3분할 grid + 마스터 타이머

**Files:**
- Modify: `src/components/ParallelGame/ParallelGame.jsx`

**목표 동작:**
- phase 'running' 시 RAF 루프로 elapsedMs 갱신, 10초 도달 시 phase 'result' 전환
- 3분할 grid에 1·2·3번 게임을 embedded로 렌더
- 상단 HUD에 "남은 시간 X.Xs" 표시

- [ ] **Step 1: RAF 루프 effect 추가**

`src/components/ParallelGame/ParallelGame.jsx`의 `useEffect` (키보드 listener) 아래에 추가:

```jsx
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
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);
```

- [ ] **Step 2: running phase 렌더 추가**

`src/components/ParallelGame/ParallelGame.jsx`의 `return` 블록에서 `{phase === 'idle' && ...}` 다음에 추가:

```jsx
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
              <TenSecondsGame
                embedded
                externalPhase={phase}
                onComplete={(score) => setScoreLeft(score)}
              />
            </div>
            <div className="parallel-area parallel-area-center">
              <ColorReactionGame
                embedded
                externalPhase={phase}
                onComplete={(score) => setScoreCenter(score)}
              />
            </div>
            <div className="parallel-area parallel-area-right">
              <CatchGame
                embedded
                externalPhase={phase}
                speedMultiplier={1.5}
                onComplete={(score) => setScoreRight(score)}
              />
            </div>
          </div>
        </>
      )}
```

- [ ] **Step 3: 브라우저 확인 (running 동작)**

```bash
npm run dev
```
4번 stage 진입 → idle → Space → 3분할 동시 진행 (스타일 미적용이라 레이아웃은 깨질 수 있음, 동작만 확인). ←/↑/→ 키 입력 시 각 영역 반응.
콘솔에서 `setScoreLeft`, `setScoreCenter`, `setScoreRight` 호출이 onComplete로 들어오는지 React DevTools로 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/components/ParallelGame/ParallelGame.jsx
git commit -m "feat: ParallelGame running phase + 마스터 타이머 #16"
```

---

## Task 7: ParallelGame result phase — 합산 + 등급 + onContinue

**Files:**
- Modify: `src/components/ParallelGame/ParallelGame.jsx`

**목표 동작:**
- phase 'result' 진입 시점에 미보고 영역(null)은 0으로 확정 → totalRaw, totalBonus 계산 → onComplete(totalBonus) 1회 호출
- 결과 패널에 영역별 점수 + 합산 + 보너스 + 등급 + StarRating 표시

- [ ] **Step 1: result 합산 effect 추가**

`src/components/ParallelGame/ParallelGame.jsx`의 RAF effect 아래에 추가:

```jsx
  const resultCompleteRef = useRef(false);

  // result 진입 시점: 미보고 영역 0 처리 + onComplete 1회 호출
  useEffect(() => {
    if (phase !== 'result') return;
    if (resultCompleteRef.current) return;
    resultCompleteRef.current = true;
    const l = scoreLeft ?? 0;
    const c = scoreCenter ?? 0;
    const r = scoreRight ?? 0;
    const { total } = computeFinalScore(l, c, r);
    onComplete?.(total);
  }, [phase, scoreLeft, scoreCenter, scoreRight, onComplete]);
```

> **주의**: onComplete가 호출되는 시점에는 마스터 phase=result로 인해 각 sub-component도 externalPhase=result를 받아 자체 onComplete를 호출 중일 수 있다. 그러나 sub-component는 `completedRef` 가드로 1회 한정이므로 race condition은 최종 score 값에 영향이 없다. setState batching으로 마지막 setScore* 호출이 반영된 시점의 effect 발화를 사용한다.

- [ ] **Step 2: result 패널 렌더 추가**

`src/components/ParallelGame/ParallelGame.jsx`의 `return` 블록에서 `{(phase === 'running' || phase === 'result') && ...}` 블록 **뒤에** 추가:

```jsx
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
                <div className="parallel-stat-row"><span>우 (캐치 1.5×)</span><b>+{r}</b></div>
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
```

- [ ] **Step 3: 브라우저 동작 확인 (result 진입)**

```bash
npm run dev
```
4번 stage 진입 → Space → 10초 후 result 패널 등장 → 점수/등급 표시. Enter/Space → boss_fight 씬 전환. (스타일은 다음 Task에서 정리)

- [ ] **Step 4: 커밋**

```bash
git add src/components/ParallelGame/ParallelGame.jsx
git commit -m "feat: ParallelGame result phase + 합산/등급 표시 #16"
```

---

## Task 8: ParallelGame.css — 3분할 grid + idle/result 패널 스타일

**Files:**
- Create: `src/components/ParallelGame/ParallelGame.css`

- [ ] **Step 1: CSS 작성**

`src/components/ParallelGame/ParallelGame.css`:

```css
/* 미니게임 4 — 결전의 서막 (병렬 진행) */

.parallel-stage {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 60%, #0f172a 100%);
  color: #e2e8f0;
  overflow: hidden;
}

/* ─── Idle 패널 ─────────────────────────────── */
.parallel-idle-panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 40px;
  text-align: center;
}
.parallel-title {
  font-size: 56px;
  margin: 0;
  color: #fbbf24;
  text-shadow: 2px 2px 0 #000, 0 0 16px rgba(251, 191, 36, 0.5);
}
.parallel-subtitle {
  font-size: 22px;
  color: #94a3b8;
  margin: 0 0 8px;
}
.parallel-area-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: min(900px, 90%);
}
.parallel-area-card {
  background: rgba(15, 23, 42, 0.7);
  border: 2px solid #475569;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.parallel-area-icon  { font-size: 40px; }
.parallel-area-name  { font-size: 18px; font-weight: 700; }
.parallel-area-key   { font-size: 14px; color: #fbbf24; }
.parallel-area-max   { font-size: 13px; color: #94a3b8; }

.parallel-bonus-note {
  font-size: 18px;
  color: #fbbf24;
  margin: 0;
}
.parallel-grade-rules {
  width: min(560px, 90%);
}
.parallel-start-btn {
  margin-top: 12px;
  padding: 14px 32px;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(180deg, #fbbf24, #d97706);
  color: #1f2937;
  border: 3px solid #92400e;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 4px 0 #78350f;
}
.parallel-start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #78350f;
}
.parallel-start-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #78350f;
}

/* ─── Running phase: HUD + 3분할 grid ─────── */
.parallel-master-hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 32px;
  background: rgba(15, 23, 42, 0.85);
  border-bottom: 3px solid #fbbf24;
  z-index: 10;
}
.parallel-master-title  { font-size: 22px; font-weight: 700; color: #fbbf24; }
.parallel-master-timer  { font-size: 22px; font-weight: 700; color: #f1f5f9; font-variant-numeric: tabular-nums; }

.parallel-grid {
  position: absolute;
  top: 64px;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0;
}
.parallel-area {
  position: relative;
  overflow: hidden;
  border-right: 2px solid rgba(251, 191, 36, 0.3);
}
.parallel-area:last-child { border-right: none; }

/* sub-component의 stage가 자기 영역에 맞도록 강제 */
.parallel-area > * {
  width: 100%;
  height: 100%;
}

/* ─── Result 패널 ─────────────────────────── */
.parallel-result-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  z-index: 20;
}
.parallel-result-panel {
  background: linear-gradient(180deg, #1e293b, #0f172a);
  border: 3px solid var(--parallel-result-color, #fbbf24);
  border-radius: 16px;
  padding: 32px 40px;
  max-width: 520px;
  text-align: center;
  box-shadow: 0 0 40px var(--parallel-result-color, #fbbf24);
}
.parallel-grade-badge {
  display: inline-block;
  padding: 6px 18px;
  background: var(--parallel-result-color);
  color: #1f2937;
  font-weight: 700;
  border-radius: 999px;
  font-size: 14px;
  letter-spacing: 1px;
  margin-bottom: 12px;
}
.parallel-result-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 12px;
}
.parallel-stats {
  margin: 20px 0 16px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.parallel-stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 16px;
}
.parallel-stat-row b { color: #fbbf24; }
.parallel-stat-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
  margin: 4px 0;
}
.parallel-stat-row-highlight {
  font-size: 20px;
  font-weight: 700;
}
.parallel-stat-row-highlight b { color: var(--parallel-result-color); }
.parallel-result-desc {
  margin: 8px 0 16px;
  color: #cbd5e1;
}
.parallel-continue-btn {
  padding: 12px 28px;
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(180deg, #fbbf24, #d97706);
  color: #1f2937;
  border: 3px solid #92400e;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 4px 0 #78350f;
}
.parallel-continue-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #78350f;
}
.parallel-continue-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #78350f;
}
```

- [ ] **Step 2: 브라우저로 레이아웃 확인**

```bash
npm run dev
```
4번 stage 진입 → idle 패널 카드 3개 + 등급표 + 시작 버튼 정상 → Space → 상단 HUD + 3분할 grid (각 영역에 sub 게임이 자기 영역으로 채워짐) → 10초 후 result 패널 (등급별 색상 적용) → Enter → boss_fight.

- [ ] **Step 3: 커밋**

```bash
git add src/components/ParallelGame/ParallelGame.css
git commit -m "style: ParallelGame 3분할 grid + idle/result 패널 #16"
```

---

## Task 9: App.jsx 정식 라우팅 (Task 5에서 이미 적용 시 confirm only)

**Files:**
- Modify: `src/App.jsx`

> Task 5 Step 2에서 이미 라우팅을 교체했다면 이 Task는 검증 + 커밋만 진행. 별개 커밋이 필요하지 않으면 건너뛰어도 됨.

- [ ] **Step 1: import 및 분기 확인**

`src/App.jsx` 상단 import에 `ParallelGame`이 포함되어 있는지 확인:

```jsx
import ParallelGame from './components/ParallelGame/ParallelGame';
```

`state.scene === 'minigame_4'` 분기가 다음 형태인지 확인 (60-66행 근처):

```jsx
      {state.scene === 'minigame_4' && (
        <ParallelGame
          onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
          onContinue={() => {
            dispatch({ type: 'SET_WORLD_STAGE', payload: 5 });
            dispatch({ type: 'GO_TO_SCENE', payload: 'boss_fight' });
          }}
        />
      )}
```

기존 `<PlaceholderScene title="⚔️ 미니게임 4: 병렬 진행" ...>`은 제거되었어야 함.

- [ ] **Step 2: lint 통과 확인**

```bash
npm run lint
```
Expected: 신규/수정 파일에 lint 에러 없음.

- [ ] **Step 3: Task 5에서 미커밋이면 커밋, 이미 커밋되었으면 skip**

```bash
git status
# 변경이 있다면:
git add src/App.jsx
git commit -m "feat: App.jsx minigame_4 placeholder → ParallelGame 라우팅 #16"
```

---

## Task 10: 수동 테스트 시나리오 검증

**Files:** (테스트 전용, 코드 변경 없음)

- [ ] **Step 1: 시나리오 1 — 만점 근접 (레전더리)**

브라우저에서 World scene → 4번 stage 진입 → Space로 시작.
- 좌: 10.0초 정확히 ← 누름 (최대 100점)
- 중: glow 후 빠르게 ↑ 누름 (≤150ms 목표 → 100점)
- 우: 6개 모두 perfect (300점)
- Expected: result 패널에 합산 500, ×2=1000, 🌟 LEGENDARY 등급, gold 색상

- [ ] **Step 2: 시나리오 2 — 1번 미입력 (유니크)**

4번 stage 재진입 → Space → 좌(←) 안 누름, 중·우 만점.
- 좌 0 + 중 100 + 우 300 = 400 → ×2 = 800
- Expected: 💎 UNIQUE 등급. 좌 영역 점수 표시 +0.

- [ ] **Step 3: 시나리오 3 — 2번 일찍 누름 (유니크)**

4번 stage 재진입 → Space → 중(↑) phase 'waiting'에서 미리 누름 → -20점. 좌·우 만점.
- 좌 100 + 중 -20 + 우 300 = 380 → ×2 = 760
- Expected: 💎 UNIQUE 등급, 중 영역 점수 표시 -20 (음수 표시 확인). 합산은 380 (음수 클램프 미적용 — 합산이 양수이므로 그대로).

- [ ] **Step 4: 시나리오 4 — 모두 0점 (일반)**

4번 stage 재진입 → Space → 아무 키도 안 누르고 10초 흐르게 둠.
- 좌 0 + 중 0 + 우 0 = 0 → ×2 = 0
- Expected: 🛡️ COMMON 등급 (green 색상)

- [ ] **Step 5: 시나리오 5 — 동시 키 입력**

4번 stage 재진입 → Space → ←↑→ 동시 누르기 시도.
- Expected: 각 영역이 독립적으로 자기 키만 반응. 좌는 stop, 중은 react/early, 우는 caught 동작.

- [ ] **Step 6: 시나리오 6 — 씬 전환**

result 패널에서 Enter 키 (또는 "다음으로" 버튼 클릭).
- Expected: `boss_fight` 씬으로 전환 (Placeholder 화면 표시).

- [ ] **Step 7: 단독 모드 회귀**

각 미니게임 단독 진입 (1·2·3번 stage)에서 기존 동작 정상 동작 확인:
- 1번: ←로 시작/정지, idle/result 패널 정상
- 2번: ↑로 react, 4-10초 대기 유지, idle/result 패널 정상
- 3번: → 캐치, 낙하 속도 1× (느린 기존 속도) 유지, idle/result 패널 정상

- [ ] **Step 8: 콘솔 console.assert 검증**

DevTools 콘솔에서 빨간색 assert 에러가 없는지 확인 (parallelUtils의 dev self-test).

- [ ] **Step 9: 커밋 (선택, 변경 없으면 skip)**

수동 테스트는 커밋 없음. 시나리오 결과는 PR 본문에 기재.

---

## 완료 기준

- [ ] Task 1-9 코드 변경 모두 커밋됨
- [ ] Task 10 수동 시나리오 6개 모두 통과
- [ ] `npm run lint` 통과
- [ ] 단독 모드 미니게임 1·2·3번 회귀 없음
- [ ] App.jsx의 `minigame_4` 분기가 더 이상 PlaceholderScene을 렌더하지 않음

---

## 참고

- 스펙: `docs/superpowers/specs/2026-05-05-minigame-4-parallel-design.md`
- 이슈: `.issues/20260505_기능추가_미니게임4_병렬_진행_구현.md`
- 선행 스펙: `docs/superpowers/specs/2026-05-04-scene-routing-design.md`, `2026-05-04-minigame-stage-expand-design.md`
