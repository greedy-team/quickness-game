# Stage 4 병렬 진행 종료 처리 보완 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stage 4 분할 화면에서 좌측(시계) pane에 결과 UI를 추가하고, 중앙(카메라) pane의 결과 모달이 pane 경계를 넘지 않도록 split-mode 전용 CSS를 추가한다.

**Architecture:** 표시 계층 한정 변경. `Stage4Host`의 phase machine과 점수 산출 로직은 미변경. 좌측 pane(`Stage4TimerPane`)에 phase + 결과 state를 추가하고 1.5s 지연 후 onResult를 호출. 중앙 pane(`Stage2Placeholder`)에는 `.split-mode` 셀렉터로만 모달 사이즈 룰을 추가해 표준 모드(`/stage/2`) 회귀 위험 0.

**Tech Stack:** React 19, Vite 8, Vitest 2 (+ jsdom + @testing-library/react 신규 설치), CSS modules-free 구조 (단순 `.css` import).

**Spec:** `docs/superpowers/specs/2026-05-10-stage4-parallel-finish-fix-design.md`

---

## File Map

**Create:**
- `src/stages/stage4/__tests__/Stage4TimerPane.test.jsx` — 컴포넌트 단위 테스트

**Modify:**
- `src/stages/stage4/Stage4TimerPane.jsx` — phase + 결과 state + 1.5s onResult 지연 + 키 가드
- `src/stages/stage4/Stage4TimerPane.css` — `.s4-result-overlay` 신규 스타일
- `src/stages/stage2/Stage2Placeholder.css` — split-mode 전용 모달 룰 추가
- `vite.config.js` — 테스트 환경 jsdom 전환 + setup 파일
- `package.json` / `package-lock.json` — 테스트 의존성 추가

**Test:**
- `src/test-setup.js` — `@testing-library/jest-dom` matchers 등록 (신규)

---

## Task 1: 컴포넌트 테스트 인프라 설치

**Files:**
- Modify: `package.json` (devDependencies)
- Modify: `vite.config.js`
- Create: `src/test-setup.js`

- [ ] **Step 1: 의존성 설치**

Run:
```bash
npm install -D jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: 설치 성공, 4개 패키지 added.

- [ ] **Step 2: vite.config.js 갱신**

Replace 전체 파일 내용으로:
```js
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
  },
})
```

- [ ] **Step 3: test setup 파일 생성**

Create `src/test-setup.js`:
```js
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: 기존 로직 테스트 회귀 확인**

Run: `npm run test:run`

Expected: 기존 `src/scoring.test.js`, `src/stages/common/reactionScoring.test.js` 모두 PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.js src/test-setup.js
git commit -m "chore : 컴포넌트 테스트 인프라 (jsdom + testing-library) 추가 #33"
```

---

## Task 2: Stage4TimerPane 결과 오버레이 렌더 (TDD)

**Files:**
- Create: `src/stages/stage4/__tests__/Stage4TimerPane.test.jsx`
- Modify: `src/stages/stage4/Stage4TimerPane.jsx`

- [ ] **Step 1: Failing test 작성 — 결과 오버레이 렌더**

Create `src/stages/stage4/__tests__/Stage4TimerPane.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import Stage4TimerPane from '../Stage4TimerPane.jsx';

describe('Stage4TimerPane', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('ArrowLeft 입력 시 결과 오버레이를 렌더한다', () => {
    const onResult = vi.fn();
    render(<Stage4TimerPane isRunning={true} onResult={onResult} />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });

    expect(screen.getByText(/MEASURED TIME/i)).toBeInTheDocument();
    expect(screen.getByText(/\+\d+점/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test:run -- Stage4TimerPane`

Expected: FAIL — `MEASURED TIME` 텍스트 미존재.

- [ ] **Step 3: Stage4TimerPane.jsx 수정 — phase + 결과 state + 렌더**

Replace 전체 파일 내용으로:
```jsx
// src/stages/stage4/Stage4TimerPane.jsx
import React, { useState, useEffect, useRef } from 'react';
import './Stage4TimerPane.css';
import { STAGE1_CONFIG } from '../stage1/stage1.config.js';
import { pointsForError, metricFromPoints } from '../common/reactionScoring.js';
import { scoreFromMetric } from '../../scoring.js';

const TIER_COMMENT = {
  perfect: '완벽한 정각. 도플갱어의 주파수가 끊어졌습니다.',
  great:   '거의 정확한 타이밍. 가짜의 형체가 흐려집니다.',
  good:    '준수한 타이밍. 도플갱어를 잠시 밀어냈습니다.',
  ok:      '간발의 차이로 도플갱어를 막아냈습니다.',
  bare:    '타이밍이 어긋났습니다. 도플갱어와 눈이 마주쳤습니다.',
};

export default function Stage4TimerPane({ isRunning, onResult }) {
  const [currentTime, setCurrentTime] = useState(0.00);
  const [phase, setPhase] = useState('running'); // 'running' | 'end'
  const [finalTime, setFinalTime] = useState(0);
  const [resultTier, setResultTier] = useState(null);
  const [resultScore, setResultScore] = useState(0);

  const startTimeRef = useRef(0);
  const requestRef = useRef();
  const phaseRef = useRef('running');

  // 시간 포맷
  const formatTime = (elapsed) => {
    const totalSec = 50 + elapsed;
    let hourMin, secMs;
    if (totalSec < 60) {
      hourMin = "11:59:";
      secMs = `${Math.floor(totalSec).toString().padStart(2, '0')}${(totalSec % 1).toFixed(2).substring(1)}`;
    } else {
      const overSec = totalSec - 60;
      hourMin = "12:00:";
      secMs = `${Math.floor(overSec).toString().padStart(2, '0')}${(overSec % 1).toFixed(2).substring(1)}`;
    }
    return (
      <><span className="s4-hour-min">{hourMin}</span>{secMs}</>
    );
  };

  const animate = () => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    if (elapsed <= STAGE1_CONFIG.timeoutSec) {
      setCurrentTime(elapsed);
      requestRef.current = requestAnimationFrame(animate);
    } else {
      handleFinish(elapsed);
    }
  };

  const handleFinish = (time) => {
    if (phaseRef.current !== 'running') return;
    cancelAnimationFrame(requestRef.current);

    const error = Math.abs(time - STAGE1_CONFIG.targetSec);
    const { tier, points } = pointsForError(error, STAGE1_CONFIG);
    const metric = metricFromPoints(points, STAGE1_CONFIG);

    phaseRef.current = 'end';
    setFinalTime(time);
    setResultTier(tier);
    setResultScore(scoreFromMetric(1, metric));
    setPhase('end');

    if (onResult) onResult(metric);
  };

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isRunning]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && isRunning && phaseRef.current === 'running') {
        handleFinish((Date.now() - startTimeRef.current) / 1000);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning]);

  return (
    <div className="s4-timer-pane">
      <div className="s4-timer-bg" />

      <div className="s4-timer-content">
        <h1 className={`s4-timer-display ${
          currentTime > 8.00 ? 'off' :
          currentTime > 7.00 ? 'flicker' : ''
        }`}>
          {formatTime(currentTime)}
        </h1>
      </div>

      {phase === 'end' && resultTier && (
        <div className="s4-result-overlay">
          <p className="s4-result-tier">{TIER_COMMENT[resultTier.id]}</p>
          <p className="s4-result-time">MEASURED TIME: {formatTime(finalTime)}</p>
          <p className="s4-result-score">+{resultScore}점</p>
        </div>
      )}
    </div>
  );
}
```

(주: 본 task에서는 onResult를 즉시 호출하는 임시 구조. Task 3에서 1.5s 지연으로 변경.)

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test:run -- Stage4TimerPane`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stages/stage4/Stage4TimerPane.jsx src/stages/stage4/__tests__/Stage4TimerPane.test.jsx
git commit -m "feat : Stage4TimerPane 결과 오버레이 렌더 추가 #33"
```

---

## Task 3: Stage4TimerPane onResult 1.5s 지연 + cleanup (TDD)

**Files:**
- Modify: `src/stages/stage4/__tests__/Stage4TimerPane.test.jsx`
- Modify: `src/stages/stage4/Stage4TimerPane.jsx`

- [ ] **Step 1: Failing test 추가 — 1.5s 지연 onResult**

`Stage4TimerPane.test.jsx`의 `describe` 블록 안 마지막에 추가:
```jsx
  it('ArrowLeft 입력 후 1500ms 경과 시 onResult를 1회 호출한다', () => {
    const onResult = vi.fn();
    render(<Stage4TimerPane isRunning={true} onResult={onResult} />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });

    // ArrowLeft 직후엔 아직 호출 안 됨
    expect(onResult).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(typeof onResult.mock.calls[0][0]).toBe('number');
  });

  it('unmount 시 dangling onResult 호출이 없다', () => {
    const onResult = vi.fn();
    const { unmount } = render(<Stage4TimerPane isRunning={true} onResult={onResult} />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onResult).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test:run -- Stage4TimerPane`

Expected: 첫 번째 신규 테스트 FAIL (`onResult` 즉시 호출됨), 두 번째도 FAIL.

- [ ] **Step 3: Stage4TimerPane.jsx 수정 — setTimeout + cleanup**

먼저 다른 `useRef` 선언들 옆에 새 ref 추가:
```jsx
  const finishTimeoutRef = useRef(null);
```

그 다음 `handleFinish` 함수를 다음으로 교체:
```jsx
  const handleFinish = (time) => {
    if (phaseRef.current !== 'running') return;
    cancelAnimationFrame(requestRef.current);

    const error = Math.abs(time - STAGE1_CONFIG.targetSec);
    const { tier, points } = pointsForError(error, STAGE1_CONFIG);
    const metric = metricFromPoints(points, STAGE1_CONFIG);

    phaseRef.current = 'end';
    setFinalTime(time);
    setResultTier(tier);
    setResultScore(scoreFromMetric(1, metric));
    setPhase('end');

    finishTimeoutRef.current = setTimeout(() => {
      if (onResult) onResult(metric);
      finishTimeoutRef.current = null;
    }, 1500);
  };
```

또한 isRunning useEffect의 cleanup에 timeout 정리 추가:
```jsx
  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      cancelAnimationFrame(requestRef.current);
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
      }
    };
  }, [isRunning]);
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test:run -- Stage4TimerPane`

Expected: 모든 테스트 PASS (이전 렌더 테스트 포함, 신규 2개 포함).

- [ ] **Step 5: Commit**

```bash
git add src/stages/stage4/Stage4TimerPane.jsx src/stages/stage4/__tests__/Stage4TimerPane.test.jsx
git commit -m "feat : Stage4TimerPane onResult 1.5s 지연 + unmount cleanup #33"
```

---

## Task 4: Stage4TimerPane 중복 종료 가드 (TDD)

**Files:**
- Modify: `src/stages/stage4/__tests__/Stage4TimerPane.test.jsx`

(JSX는 이미 Task 2/3에서 `phaseRef.current` 가드를 포함하지만, 테스트로 회귀 보호.)

- [ ] **Step 1: Failing test 추가 — 중복 ArrowLeft 가드**

`Stage4TimerPane.test.jsx`의 `describe` 블록 안 마지막에 추가:
```jsx
  it('ArrowLeft가 두 번 들어와도 onResult는 1회만 호출된다', () => {
    const onResult = vi.fn();
    render(<Stage4TimerPane isRunning={true} onResult={onResult} />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onResult).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: 테스트 실행**

Run: `npm run test:run -- Stage4TimerPane`

Expected: PASS (Task 2/3 시점에 이미 `phaseRef` 가드가 들어가 있으므로 통과해야 함).

만약 FAIL이면, `handleFinish` 함수 첫 줄에 `if (phaseRef.current !== 'running') return;` 가드가 정상 위치에 있는지 확인.

- [ ] **Step 3: Commit (테스트만 추가)**

```bash
git add src/stages/stage4/__tests__/Stage4TimerPane.test.jsx
git commit -m "test : Stage4TimerPane 중복 종료 가드 회귀 테스트 추가 #33"
```

---

## Task 5: Stage4TimerPane 결과 오버레이 CSS

**Files:**
- Modify: `src/stages/stage4/Stage4TimerPane.css`

- [ ] **Step 1: CSS 추가**

`Stage4TimerPane.css` 파일 끝에 다음 추가:
```css

/* ── 결과 오버레이 (병렬 모드 종료 후 결과 표시) ── */
.s4-result-overlay {
  position: absolute;
  bottom: 8%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid #444;
  text-align: center;
  max-width: calc(100% - 24px);
  box-sizing: border-box;
}

.s4-result-tier {
  font-size: 0.95rem;
  color: #ddd;
  margin: 0 0 8px 0;
  word-break: keep-all;
}

.s4-result-time {
  font-family: 'Courier New', Courier, monospace;
  font-size: 1.1rem;
  color: #ffcc00;
  letter-spacing: 1px;
  margin: 0;
}

.s4-result-time .s4-hour-min {
  font-size: 0.7em;
  opacity: 0.8;
  margin-right: 4px;
}

.s4-result-score {
  font-family: 'Courier New', Courier, monospace;
  font-size: 1.4rem;
  color: #ffcc00;
  font-weight: bold;
  margin: 6px 0 0 0;
  text-shadow: 0 0 12px rgba(255, 204, 0, 0.6);
}
```

- [ ] **Step 2: 회귀 확인 (테스트)**

Run: `npm run test:run`

Expected: 모든 테스트 PASS.

- [ ] **Step 3: Commit**

```bash
git add src/stages/stage4/Stage4TimerPane.css
git commit -m "feat : Stage4TimerPane 결과 오버레이 스타일 추가 #33"
```

---

## Task 6: Stage2Placeholder split-mode 모달 클리핑 CSS

**Files:**
- Modify: `src/stages/stage2/Stage2Placeholder.css`

- [ ] **Step 1: 표준 모드 CSS 미변경 확인**

Run: `grep -n "split-mode\|final-message-overlay" src/stages/stage2/Stage2Placeholder.css`

Expected: 기존 `.split-mode` 룰 블록(파일 하단)과 `.final-message-overlay` 룰(파일 중간)이 보임. 이 작업은 파일 끝에 새 룰만 추가.

- [ ] **Step 2: split-mode 모달 룰 추가**

`Stage2Placeholder.css` 파일 끝에 다음 추가:
```css

/* ── split 모드: 결과 모달이 pane 경계 안에 머무르도록 스케일/클리핑 ── */
.stage2-wrapper.split-mode .stage2-ui-layer {
  padding: 8px;
  box-sizing: border-box;
}
.stage2-wrapper.split-mode .final-message-overlay {
  padding: 16px 20px;
  max-width: calc(100% - 16px);
  box-sizing: border-box;
  overflow: hidden;
}
.stage2-wrapper.split-mode .main-msg {
  font-size: 1.4rem;
  letter-spacing: 2px;
  margin-bottom: 12px;
  word-break: keep-all;
}
.stage2-wrapper.split-mode .sub-msg {
  font-size: 0.85rem;
}
.stage2-wrapper.split-mode .reaction-time {
  font-size: 1rem;
  margin-top: 10px;
}
.stage2-wrapper.split-mode .result-score {
  font-size: 1.2rem;
  margin-top: 8px;
}
/* "메인 화면으로 돌아갑니다…" 메시지는 병렬 진행 중에는 부정확하므로 숨김 */
.stage2-wrapper.split-mode .final-message-overlay .start-btn {
  display: none;
}
```

- [ ] **Step 3: 회귀 확인**

Run: `npm run test:run`

Expected: 모든 테스트 PASS (CSS만 변경, 로직 무영향).

- [ ] **Step 4: Commit**

```bash
git add src/stages/stage2/Stage2Placeholder.css
git commit -m "fix : Stage 2 split-mode 결과 모달 pane 경계 클리핑 #33"
```

---

## Task 7: 수동/E2E 검증 (Playwright)

이 task는 코드 변경 없음. 사람(또는 Playwright MCP) 시각 검증 단계.

**Prereq:** 개발 서버 띄우기.
```bash
npm run dev
```

- [ ] **Step 1: Stage 4 진입 + 3 pane 동시 시작**

URL `http://localhost:5173` (또는 vite 안내 포트)에서 메뉴 → Stage 4 → Space.
Expected: 3개 pane (좌 시계 / 중 카메라 / 우 캐치)이 동시에 진행.

- [ ] **Step 2: 좌측 pane 단독 종료 검증**

ArrowLeft 한 번 누름.
Expected:
- 좌측 pane 하단 중앙에 결과 오버레이 등장 (tier 메시지, MEASURED TIME, +점수)
- 시계 표시는 멈춘 상태 유지
- 중앙/우측 pane은 계속 진행
- ArrowLeft 추가로 눌러도 결과가 변하지 않음

- [ ] **Step 3: 중앙 pane 종료 시 모달 클리핑 검증**

좌측 종료 후 중앙에서 가짜(greenie) 무시하고 실제 등장(REAL) 시 ArrowUp(셔터).
또는 fake 무시하고 timeout으로 실패까지 둔다.
Expected:
- 중앙 pane에 결과 모달 표시
- 모달 박스 외곽이 중앙 pane(1/3 폭) 안에 완전히 들어옴
- "EVIDENCE CAPTURED" 또는 "LOST IN DARKNESS" 텍스트가 박스 밖으로 새지 않음
- "메인 화면으로 돌아갑니다…" 문구는 보이지 않음
- 좌측 결과는 계속 보임

스크린샷 권장 (Playwright `browser_take_screenshot`).

- [ ] **Step 4: 우측 pane 종료 → merging → jumpscare → done**

우측 캐치 게임 종료까지 진행.
Expected:
- 3개 결과 모이면 자연스럽게 merging 오버레이 등장
- 4초 후 jumpscare 등장
- 2초 후 done → onResult 콜백으로 다음 라우트 이동
- 평균 metric에 따른 분기 정상

- [ ] **Step 5: 표준 모드 회귀 검증 — Stage 2**

URL을 `/stage/2`로 직접 이동 → Space로 시작 → 셔터 또는 timeout.
Expected:
- 결과 모달이 기존(병합 전 main 브랜치)과 시각적으로 동일
- "EVIDENCE CAPTURED" 큰 글씨, `letter-spacing: 8px` 유지
- "메인 화면으로 돌아갑니다…" 표시됨

- [ ] **Step 6: 검증 통과 후 최종 push**

위 모든 시나리오 통과 시:
```bash
git log origin/20260509_#33_Stage_1_2_사운드_점수_및_Stage_4_병렬_보완..HEAD --oneline
```
Expected: Task 1~6의 커밋들이 보임.

```bash
git push
```
Expected: 원격에 푸시 완료.

(만약 한 시나리오라도 실패하면 해당 Task로 돌아가 수정 → 재커밋 → 본 검증 다시.)

---

## Self-Review Note

- **Spec 7.1 단위 테스트**: Task 2/3/4에서 모두 커버 (렌더 / 1.5s 지연 / unmount 정리 / 중복 가드).
- **Spec 7.2 수동 검증**: Task 7에서 모두 커버 (5단계 시나리오).
- **Spec 5.2 split-mode CSS**: Task 6에서 1:1 반영. 인접 셀렉터(`+`) 대신 자손 셀렉터(`.final-message-overlay .start-btn`) 사용.
- **Spec 4.2 onResult 지연**: 1.5s, Task 3에서 반영.
- **표준 모드 회귀**: Task 7 Step 5에서 확인.

수정사항 없음. 실행 가능 상태.
