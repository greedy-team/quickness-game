# 점수 표시 UI (만점·생존선) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `HudOverlay` 좌측 하단에 누적 점수와 만점(1540), 생존선(700)을 동시에 보여주고, 700 통과 시 막대 색이 빨강→금색으로 바뀌도록 한다. `ScoreTable` 모달에도 `만점 / 생존선` 요약 한 줄을 추가한다.

**Architecture:**
- 만점은 `STAGE_SCORE_TIERS`에서 파생되는 `TOTAL_MAX_SCORE` 단일 상수로 묶어 `src/scoring.js`에서 export. `HudOverlay`와 `ScoreTable`이 이 상수와 기존 `ENDING_SUCCESS_CUTOFF`를 import해서 사용.
- 막대는 CSS만으로 표현(외부 라이브러리 미사용). 채움 폭은 인라인 스타일 percent, 색 전환은 `--alive` 모디파이어 클래스로 토글.
- 가시성 규칙은 기존 `HIDDEN_ROUTES`와 동일하게 유지.

**Tech Stack:** React 19, zustand 5, React Router 7, Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-05-11-score-display-design.md`

---

## File Structure

**Modify:**
- `src/scoring.js` — `TOTAL_MAX_SCORE` 상수 추가 export
- `src/scoring.test.js` — `TOTAL_MAX_SCORE` 단언 추가
- `src/components/HudOverlay/HudOverlay.jsx` — 점수 블록을 헤더 + 막대 + 틱 구조로 확장
- `src/components/HudOverlay/HudOverlay.css` — 막대·채움·틱·라벨 클래스 신규
- `src/components/HudOverlay/ScoreTable.jsx` — 헤더 아래 요약 라인 추가
- `src/components/HudOverlay/ScoreTable.css` — 요약 라인 스타일 신규

**Create:**
- `src/components/HudOverlay/__tests__/HudOverlay.test.jsx` — HUD 점수 막대 동작 테스트
- `src/components/HudOverlay/__tests__/ScoreTable.test.jsx` — 모달 요약 라인 노출 테스트

---

## Task 1: `TOTAL_MAX_SCORE` 상수 도입 (TDD)

**Files:**
- Modify: `src/scoring.js`
- Test: `src/scoring.test.js`

- [ ] **Step 1.1: Write the failing tests**

`src/scoring.test.js`의 import 행에 `TOTAL_MAX_SCORE`를 추가하고, `STAGE_SCORE_TIERS` describe 블록 끝에 단언 두 개를 추가한다.

```js
import {
  STAGE_SCORE_TIERS,
  PERFECT_HEADROOM,
  ENDING_SUCCESS_CUTOFF,
  TOTAL_MAX_SCORE,
  scoreFromMetric,
  endingOutcomeFromTotal,
} from './scoring.js';
```

`STAGE_SCORE_TIERS` describe 블록 안에 추가:

```js
  it('TOTAL_MAX_SCORE 는 모든 스테이지 perfect tier + PERFECT_HEADROOM 의 합 (1540)', () => {
    expect(TOTAL_MAX_SCORE).toBe(1540);
  });

  it('TOTAL_MAX_SCORE 는 ENDING_SUCCESS_CUTOFF 보다 크다', () => {
    expect(TOTAL_MAX_SCORE).toBeGreaterThan(ENDING_SUCCESS_CUTOFF);
  });
```

- [ ] **Step 1.2: Run the tests to verify they fail**

Run: `npm run test:run -- src/scoring.test.js`
Expected: 새로 추가한 두 테스트가 FAIL — `TOTAL_MAX_SCORE` is undefined.

- [ ] **Step 1.3: Implement `TOTAL_MAX_SCORE` export**

`src/scoring.js`의 `ENDING_SUCCESS_CUTOFF` 정의 바로 위에 추가한다.

```js
/**
 * 가능한 최대 누적 점수 (모든 스테이지 metric=0 가정).
 * STAGE_SCORE_TIERS / PERFECT_HEADROOM 에서 파생되는 단일 진실 공급원.
 * 현재 값: Stage 1·2·3 = 360, Stage 4 = 460 → 합 1540.
 */
export const TOTAL_MAX_SCORE = Object.values(STAGE_SCORE_TIERS).reduce(
  (sum, tiers) => sum + tiers[0].points + PERFECT_HEADROOM,
  0,
);
```

- [ ] **Step 1.4: Run the tests to verify they pass**

Run: `npm run test:run -- src/scoring.test.js`
Expected: 전체 PASS (기존 + 신규 2개).

- [ ] **Step 1.5: Commit**

```bash
git add src/scoring.js src/scoring.test.js
git commit -m "feat(scoring): TOTAL_MAX_SCORE 상수 도입

STAGE_SCORE_TIERS · PERFECT_HEADROOM 에서 자동 계산되는 만점 상수.
HUD / ScoreTable 이 단일 진실 공급원으로 사용한다."
```

---

## Task 2: `HudOverlay` 막대 + 분기점 틱 (TDD)

**Files:**
- Modify: `src/components/HudOverlay/HudOverlay.jsx`
- Modify: `src/components/HudOverlay/HudOverlay.css`
- Create: `src/components/HudOverlay/__tests__/HudOverlay.test.jsx`

> 테스트는 `useLocation()`을 사용하는 컴포넌트라 `MemoryRouter`로 감싸고, zustand 스토어는 `useGameStore.setState(...)`로 직접 주입한다.

- [ ] **Step 2.1: Write the failing tests**

`src/components/HudOverlay/__tests__/HudOverlay.test.jsx` 신규 생성.

```jsx
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HudOverlay from '../HudOverlay.jsx';
import { useGameStore } from '../../../store.js';

function renderHud({ path = '/hub' } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <HudOverlay />
    </MemoryRouter>,
  );
}

function setTotalScore(score) {
  // Stage 1 의 score 슬롯에만 점수를 넣어 selectTotalScore 가 그대로 score 를 반환하게 한다.
  useGameStore.setState({
    stageResults: { 1: { metric: 0, score }, 2: null, 3: null, 4: null },
  });
}

describe('HudOverlay 점수 막대', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  afterEach(() => {
    cleanup();
    useGameStore.getState().resetGame();
  });

  it('total=0 일 때 채움 폭은 0%, alive 클래스 없음', () => {
    setTotalScore(0);
    const { container } = renderHud();
    const fill = container.querySelector('.hud-overlay__bar-fill');
    expect(fill).not.toBeNull();
    expect(fill.style.width).toBe('0%');
    expect(fill.className).not.toContain('hud-overlay__bar-fill--alive');
  });

  it('total=699 → 채움 폭 ≈ 45.4%, alive 클래스 없음', () => {
    setTotalScore(699);
    const { container } = renderHud();
    const fill = container.querySelector('.hud-overlay__bar-fill');
    const pct = parseFloat(fill.style.width);
    expect(pct).toBeGreaterThan(45);
    expect(pct).toBeLessThan(45.5);
    expect(fill.className).not.toContain('hud-overlay__bar-fill--alive');
  });

  it('total=700 → 채움 폭 ≈ 45.5%, alive 클래스 있음 (생존선 정확 통과)', () => {
    setTotalScore(700);
    const { container } = renderHud();
    const fill = container.querySelector('.hud-overlay__bar-fill');
    const pct = parseFloat(fill.style.width);
    expect(pct).toBeGreaterThanOrEqual(45.4);
    expect(pct).toBeLessThanOrEqual(45.6);
    expect(fill.className).toContain('hud-overlay__bar-fill--alive');
  });

  it('total=1540 → 채움 폭 100%, alive 클래스 있음', () => {
    setTotalScore(1540);
    const { container } = renderHud();
    const fill = container.querySelector('.hud-overlay__bar-fill');
    expect(fill.style.width).toBe('100%');
    expect(fill.className).toContain('hud-overlay__bar-fill--alive');
  });

  it('만점 텍스트(/ 1540)와 생존선 라벨(700)이 노출된다', () => {
    setTotalScore(0);
    renderHud();
    expect(screen.getByText(/\/\s*1540/)).toBeInTheDocument();
    expect(screen.getByText(/생존선 700/)).toBeInTheDocument();
  });

  it('점수 블록 클릭 시 ScoreTable 모달이 열린다 (회귀 보호)', async () => {
    setTotalScore(250);
    const user = userEvent.setup();
    renderHud();
    await user.click(screen.getByRole('button', { name: /점수 기준 보기/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('/ (타이틀) 라우트에서는 HUD 가 렌더되지 않는다', () => {
    setTotalScore(0);
    const { container } = renderHud({ path: '/' });
    expect(container.querySelector('.hud-overlay')).toBeNull();
  });
});
```

- [ ] **Step 2.2: Run the tests to verify they fail**

Run: `npm run test:run -- src/components/HudOverlay/__tests__/HudOverlay.test.jsx`
Expected: 막대 관련 테스트가 FAIL — `.hud-overlay__bar-fill` 요소가 존재하지 않음. 라우트/모달 회귀 테스트는 PASS 가능.

- [ ] **Step 2.3: Implement `HudOverlay.jsx`**

`src/components/HudOverlay/HudOverlay.jsx` 전체를 다음으로 교체.

```jsx
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useGameStore, selectTotalScore, selectClearedCount } from '../../store.js';
import { TOTAL_MAX_SCORE, ENDING_SUCCESS_CUTOFF } from '../../scoring.js';
import ScoreTable from './ScoreTable.jsx';
import './HudOverlay.css';

const HIDDEN_ROUTES = new Set(['/', '/ranking']);

const CUTOFF_PCT = (ENDING_SUCCESS_CUTOFF / TOTAL_MAX_SCORE) * 100;

export default function HudOverlay() {
  const { pathname } = useLocation();
  const total = useGameStore(selectTotalScore);
  const cleared = useGameStore(selectClearedCount);
  const [tableOpen, setTableOpen] = useState(false);

  useEffect(() => {
    if (!tableOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setTableOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tableOpen]);

  if (HIDDEN_ROUTES.has(pathname)) return null;

  const fillPct = Math.min(100, (total / TOTAL_MAX_SCORE) * 100);
  const isAlive = total >= ENDING_SUCCESS_CUTOFF;
  const fillClass = isAlive
    ? 'hud-overlay__bar-fill hud-overlay__bar-fill--alive'
    : 'hud-overlay__bar-fill';

  return (
    <div className="hud-overlay" aria-hidden="false">
      <button
        type="button"
        className="hud-overlay__score"
        onClick={() => setTableOpen((v) => !v)}
        aria-label={`점수 기준 보기 — 현재 ${total}점, 목표 ${ENDING_SUCCESS_CUTOFF}점 ${isAlive ? '통과' : '미도달'}`}
      >
        <span className="hud-overlay__score-line">
          SCORE {total}
          <span className="hud-overlay__score-max"> / {TOTAL_MAX_SCORE}</span>
        </span>
        <span className="hud-overlay__bar" role="presentation">
          <span className={fillClass} style={{ width: `${fillPct}%` }} />
          <span className="hud-overlay__bar-tick" style={{ left: `${CUTOFF_PCT}%` }} />
          <span className="hud-overlay__bar-tick-label" style={{ left: `${CUTOFF_PCT}%` }}>
            생존선 {ENDING_SUCCESS_CUTOFF}
          </span>
        </span>
      </button>
      <div className="hud-overlay__progress">{cleared} / 4</div>
      {tableOpen && <ScoreTable onClose={() => setTableOpen(false)} />}
    </div>
  );
}
```

- [ ] **Step 2.4: Implement `HudOverlay.css`**

`src/components/HudOverlay/HudOverlay.css` 전체를 다음으로 교체.

```css
.hud-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;
}

.hud-overlay__score,
.hud-overlay__progress {
  position: absolute;
  bottom: 22px;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.75);
}

.hud-overlay__score {
  left: 28px;
  pointer-events: auto;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  background: rgba(255, 204, 0, 0.08);
  border: 1px solid rgba(255, 204, 0, 0.45);
  color: #ffcc00;
  font: inherit;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.75);
  cursor: pointer;
  padding: 10px 18px 18px;
  border-radius: 4px;
  transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s;
  box-shadow: 0 0 12px rgba(255, 204, 0, 0.12);
}

.hud-overlay__score:hover {
  background: rgba(255, 204, 0, 0.18);
  border-color: rgba(255, 204, 0, 0.8);
  box-shadow: 0 0 18px rgba(255, 204, 0, 0.28);
  transform: translateY(-1px);
}

.hud-overlay__score:active {
  transform: translateY(0);
}

.hud-overlay__score:focus-visible {
  outline: 2px solid rgba(255, 204, 0, 0.85);
  outline-offset: 3px;
}

.hud-overlay__score-line {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}

.hud-overlay__score-line::after {
  content: "▾";
  font-size: 0.85em;
  color: rgba(255, 204, 0, 0.85);
  letter-spacing: 0;
  margin-left: 4px;
  transform: translateY(-1px);
}

.hud-overlay__score-max {
  color: rgba(255, 204, 0, 0.55);
  font-weight: 600;
  font-size: 1.05rem;
}

.hud-overlay__bar {
  position: relative;
  display: block;
  width: 280px;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 204, 0, 0.25);
  border-radius: 2px;
  overflow: visible;
}

.hud-overlay__bar-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #7a1818, #c43232);
  transition: width 0.25s ease, background 0.3s ease;
}

.hud-overlay__bar-fill--alive {
  background: linear-gradient(90deg, #ffae00, #ffcc00);
}

.hud-overlay__bar-tick {
  position: absolute;
  top: -4px;
  width: 2px;
  height: 16px;
  background: #ff4444;
  box-shadow: 0 0 6px rgba(255, 68, 68, 0.8);
  transform: translateX(-50%);
}

.hud-overlay__bar-tick-label {
  position: absolute;
  top: 14px;
  transform: translateX(-50%);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  color: #ff6666;
  white-space: nowrap;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.85);
  font-weight: 600;
  pointer-events: none;
}

.hud-overlay__progress {
  right: 28px;
  pointer-events: none;
  color: rgba(255, 255, 255, 0.92);
}
```

- [ ] **Step 2.5: Run the tests to verify they pass**

Run: `npm run test:run -- src/components/HudOverlay/__tests__/HudOverlay.test.jsx`
Expected: 모든 테스트 PASS.

- [ ] **Step 2.6: Run dev server and eyeball the HUD**

Run: `npm run dev`
브라우저에서 hub 또는 stage 라우트 진입 후 좌측 하단 SCORE 막대가 노출되는지, 700 통과 시 빨강→금색으로 바뀌는지 확인. 점수가 0이면 빨강, 임의로 점수를 부여(예: devtools에서 `useGameStore.setState`)해 700/1540 경계 확인.

- [ ] **Step 2.7: Commit**

```bash
git add src/components/HudOverlay/HudOverlay.jsx src/components/HudOverlay/HudOverlay.css src/components/HudOverlay/__tests__/HudOverlay.test.jsx
git commit -m "feat(hud): 점수 막대와 생존선 분기점 표시

HudOverlay 점수 블록에 0→1540 진행 막대와 700 지점 빨간 틱을 추가.
700 통과 시 막대 색이 빨강→금색으로 전환되어 삶/죽음 상태를 표시한다."
```

---

## Task 3: `ScoreTable` 만점·생존선 요약 라인 (TDD)

**Files:**
- Modify: `src/components/HudOverlay/ScoreTable.jsx`
- Modify: `src/components/HudOverlay/ScoreTable.css`
- Create: `src/components/HudOverlay/__tests__/ScoreTable.test.jsx`

- [ ] **Step 3.1: Write the failing test**

`src/components/HudOverlay/__tests__/ScoreTable.test.jsx` 신규 생성.

```jsx
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ScoreTable from '../ScoreTable.jsx';

describe('ScoreTable', () => {
  afterEach(() => {
    cleanup();
  });

  it('헤더 아래에 만점·생존선 요약 라인이 노출된다', () => {
    render(<ScoreTable onClose={() => {}} />);
    expect(screen.getByText(/만점\s*1540/)).toBeInTheDocument();
    expect(screen.getByText(/생존선\s*700/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3.2: Run the test to verify it fails**

Run: `npm run test:run -- src/components/HudOverlay/__tests__/ScoreTable.test.jsx`
Expected: FAIL — `만점 1540` 텍스트가 DOM에 없음.

- [ ] **Step 3.3: Update `ScoreTable.jsx`**

`src/components/HudOverlay/ScoreTable.jsx` 상단 import 블록에 상수 두 개를 추가한다.

```jsx
import { STAGE1_CONFIG } from '../../stages/stage1/stage1.config.js';
import { STAGE2_CONFIG } from '../../stages/stage2/stage2.config.js';
import { STAGE3_CONFIG } from '../../stages/stage3/stage3.config.js';
import { metricFromPoints } from '../../stages/common/reactionScoring.js';
import { scoreFromMetric, TOTAL_MAX_SCORE, ENDING_SUCCESS_CUTOFF } from '../../scoring.js';
import './ScoreTable.css';
```

그리고 모달 헤더 직후, `score-table__grid` 직전 위치에 요약 라인을 삽입한다.

```jsx
        <div className="score-table__header">
          <h2 id="score-table-title">점수 기준</h2>
          <button type="button" className="score-table__close" onClick={onClose} aria-label="닫기">×</button>
        </div>

        <div className="score-table__summary">
          만점 {TOTAL_MAX_SCORE} · 생존선 {ENDING_SUCCESS_CUTOFF}
        </div>

        <div className="score-table__grid">
```

- [ ] **Step 3.4: Add summary style to `ScoreTable.css`**

`src/components/HudOverlay/ScoreTable.css` 끝에 추가한다.

```css
.score-table__summary {
  margin: 0 0 18px;
  padding: 8px 12px;
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  color: rgba(255, 204, 0, 0.85);
  border-left: 2px solid rgba(255, 204, 0, 0.55);
  background: rgba(255, 204, 0, 0.04);
}
```

- [ ] **Step 3.5: Run the test to verify it passes**

Run: `npm run test:run -- src/components/HudOverlay/__tests__/ScoreTable.test.jsx`
Expected: PASS.

- [ ] **Step 3.6: Run full test suite to catch regressions**

Run: `npm run test:run`
Expected: 전체 PASS.

- [ ] **Step 3.7: Commit**

```bash
git add src/components/HudOverlay/ScoreTable.jsx src/components/HudOverlay/ScoreTable.css src/components/HudOverlay/__tests__/ScoreTable.test.jsx
git commit -m "feat(hud): ScoreTable 만점·생존선 요약 라인 추가

헤더 직후에 '만점 1540 · 생존선 700' 한 줄을 표시.
값은 scoring.js 상수에서 import 해 단일 진실 공급원 유지."
```

---

## Task 4: 빌드·린트 최종 검증

**Files:** 없음 (검증만).

- [ ] **Step 4.1: Lint 통과 확인**

Run: `npm run lint`
Expected: 오류 없음. 새로 추가한 컴포넌트/테스트에서 ESLint 규칙 위반 시 인플레이스로 수정.

- [ ] **Step 4.2: 프로덕션 빌드 통과 확인**

Run: `npm run build`
Expected: 성공 (CSS 변경으로 미사용 selector 경고가 추가될 일 없음).

- [ ] **Step 4.3 (선택): 시각적 확인**

Run: `npm run dev`
브라우저 콘솔에서 점수를 임의로 주입하며 좌측 하단 막대의 폭/색 전환을 확인한다.

```js
// devtools console
useGameStore.setState({ stageResults: { 1: { metric: 0, score: 699 }, 2: null, 3: null, 4: null } })
useGameStore.setState({ stageResults: { 1: { metric: 0, score: 700 }, 2: null, 3: null, 4: null } })
useGameStore.setState({ stageResults: { 1: { metric: 0, score: 1540 }, 2: null, 3: null, 4: null } })
```

> 주의: 위 콘솔 스니펫은 디버그 용이며 코드에 남기지 않는다. zustand devtools가 활성화되어 있다면 그쪽에서 set 해도 동일.

---

## Spec Coverage Self-Check

| 스펙 섹션 | 매핑 작업 |
| --- | --- |
| 3.1 위치/가시성 (HIDDEN_ROUTES 유지) | Task 2 (`/` 라우트 미렌더 테스트 포함) |
| 3.2 구성요소 (헤더 + 막대 + 틱) | Task 2 (Step 2.3 마크업) |
| 3.3 색 동작 (빨강 ↔ 금색 0.3s 전환) | Task 2 (CSS `--alive` 모디파이어 + transition) |
| 3.4 ScoreTable 요약 라인 | Task 3 |
| 4.1 `TOTAL_MAX_SCORE` 도입 | Task 1 |
| 4.2–4.3 HudOverlay 변경 | Task 2 |
| 4.4–4.5 ScoreTable 변경 | Task 3 |
| 5.1 scoring 테스트 | Task 1 (Step 1.1) |
| 5.2 HudOverlay 테스트 (0/699/700/1540) | Task 2 (Step 2.1) |
| 5.3 ScoreTable 요약 테스트 | Task 3 (Step 3.1) |
| 7. 접근성 (`aria-label` 상태 문구) | Task 2 (Step 2.3 button aria-label) |
