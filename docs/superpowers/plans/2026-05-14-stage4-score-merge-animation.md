# Stage 4 점수 합산 애니메이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stage 4 merging 페이즈에서 3개 서브 패널 점수가 커지고, 사이에 `+`가 동시 등장한 뒤 `= 합계`가 표시되는 CSS 애니메이션을 추가한다.

**Architecture:** `Stage4MergeOverlay`에 `scores` prop을 추가하고, 순수 CSS animation(delay 기반 시퀀싱)으로 애니메이션을 구현한다. `Stage4Host`는 `results` 수집 후 merging 진입 시 각 sub-score를 MergeOverlay로 전달한다.

**Tech Stack:** React, CSS animations (keyframes + animation-delay), Vitest + @testing-library/react

---

## 파일 맵

| 파일 | 작업 |
|------|------|
| `src/stages/stage4/Stage4MergeOverlay.jsx` | scores prop 추가, 점수/연산자 요소 렌더 |
| `src/stages/stage4/Stage4MergeOverlay.css` | 애니메이션 keyframes 추가 |
| `src/stages/stage4/Stage4Host.jsx` | MergeOverlay에 scores prop 전달 |
| `src/stages/stage4/__tests__/Stage4MergeOverlay.test.jsx` | 신규 테스트 파일 |

---

## Task 1: Stage4MergeOverlay 테스트 작성

**Files:**
- Create: `src/stages/stage4/__tests__/Stage4MergeOverlay.test.jsx`

- [ ] **Step 1: 테스트 파일 작성**

```jsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stage4MergeOverlay from '../Stage4MergeOverlay.jsx';

describe('Stage4MergeOverlay', () => {
  it('scores prop 없이 렌더해도 crash 없음', () => {
    const { container } = render(<Stage4MergeOverlay />);
    expect(container.firstChild).toBeTruthy();
  });

  it('scores prop이 주어지면 각 패널 점수를 렌더한다', () => {
    render(<Stage4MergeOverlay scores={{ pane1: 80, pane2: 100, pane3: 60 }} />);
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('합계를 계산해서 렌더한다', () => {
    render(<Stage4MergeOverlay scores={{ pane1: 80, pane2: 100, pane3: 60 }} />);
    expect(screen.getByText('240')).toBeInTheDocument();
  });

  it('+ 연산자를 두 개 렌더한다', () => {
    render(<Stage4MergeOverlay scores={{ pane1: 80, pane2: 100, pane3: 60 }} />);
    const ops = screen.getAllByText('+');
    expect(ops).toHaveLength(2);
  });

  it('= 기호를 렌더한다', () => {
    render(<Stage4MergeOverlay scores={{ pane1: 80, pane2: 100, pane3: 60 }} />);
    expect(screen.getByText('=')).toBeInTheDocument();
  });

  it('scores가 없으면 합계 0을 렌더한다', () => {
    render(<Stage4MergeOverlay scores={undefined} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/stages/stage4/__tests__/Stage4MergeOverlay.test.jsx
```

예상: `Stage4MergeOverlay` import 성공하지만 scores/+ 관련 테스트들 FAIL

- [ ] **Step 3: 커밋**

```bash
git add src/stages/stage4/__tests__/Stage4MergeOverlay.test.jsx
git commit -m "test: Stage4MergeOverlay 점수 합산 애니메이션 테스트 추가"
```

---

## Task 2: Stage4MergeOverlay JSX 구현

**Files:**
- Modify: `src/stages/stage4/Stage4MergeOverlay.jsx`

- [ ] **Step 1: 컴포넌트 수정**

```jsx
import './Stage4MergeOverlay.css';

export default function Stage4MergeOverlay({ scores }) {
  const p1 = scores?.pane1 ?? 0;
  const p2 = scores?.pane2 ?? 0;
  const p3 = scores?.pane3 ?? 0;
  const total = p1 + p2 + p3;

  return (
    <div className="stage4-merge-overlay" aria-hidden="true">
      <div className="merge-scores">
        <span className="merge-score merge-score--1">{p1}</span>
        <span className="merge-op merge-op--1">+</span>
        <span className="merge-score merge-score--2">{p2}</span>
        <span className="merge-op merge-op--2">+</span>
        <span className="merge-score merge-score--3">{p3}</span>
      </div>
      <div className="merge-result">
        <span className="merge-eq">=</span>
        <span className="merge-total">{total}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 테스트 통과 확인**

```bash
npx vitest run src/stages/stage4/__tests__/Stage4MergeOverlay.test.jsx
```

예상: 6개 테스트 모두 PASS

- [ ] **Step 3: 커밋**

```bash
git add src/stages/stage4/Stage4MergeOverlay.jsx
git commit -m "feat: Stage4MergeOverlay scores prop 및 점수/연산자 렌더 추가"
```

---

## Task 3: Stage4MergeOverlay CSS 애니메이션 추가

**Files:**
- Modify: `src/stages/stage4/Stage4MergeOverlay.css`

- [ ] **Step 1: CSS 추가**

기존 `.stage4-merge-overlay` 및 `@keyframes stage4-merge-vignette` 아래에 다음을 추가한다.

```css
/* ── 점수 합산 오버레이 ── */
.merge-scores {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  z-index: 302;
  pointer-events: none;
}

.merge-score {
  font-size: clamp(32px, 5vw, 56px);
  font-weight: 900;
  color: #FFD700;
  font-family: 'Courier New', monospace;
  min-width: clamp(80px, 12vw, 140px);
  text-align: center;
  opacity: 0;
  /* delay는 --1/2/3 클래스에서만 설정 */
  animation:
    merge-score-popup 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both,
    merge-score-grow  0.55s cubic-bezier(0.34, 1.2, 0.64, 1) both;
}

/* 각 패널 점수 등장 딜레이: popup delay, grow delay */
.merge-score--1 { animation-delay: 0s,   1.0s; }
.merge-score--2 { animation-delay: 0.2s, 1.2s; }
.merge-score--3 { animation-delay: 0.4s, 1.4s; }

.merge-op {
  font-size: clamp(20px, 3vw, 32px);
  font-weight: 900;
  color: #888;
  font-family: 'Courier New', monospace;
  padding: 0 clamp(6px, 1.2vw, 14px);
  opacity: 0;
  transform: scale(0.4);
  /* Phase 3: + 동시 등장 */
  animation: merge-op-appear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 1.8s both;
}

/* + 두 개 모두 동일 delay — base 규칙으로 충분 */

.merge-result {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(8px, 1.5vw, 16px);
  padding-bottom: 12px;
  z-index: 302;
  pointer-events: none;
}

.merge-eq {
  font-size: clamp(20px, 3vw, 32px);
  font-weight: 900;
  color: #aaa;
  font-family: 'Courier New', monospace;
  opacity: 0;
  animation: merge-eq-appear 0.3s ease 2.6s both;
}

.merge-total {
  font-size: clamp(36px, 6vw, 64px);
  font-weight: 900;
  color: #fff;
  font-family: 'Courier New', monospace;
  opacity: 0;
  transform: scale(0.4);
  animation: merge-total-appear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 2.9s both;
}

/* ── Keyframes ── */
@keyframes merge-score-popup {
  0%   { opacity: 0; transform: scale(0.3); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes merge-score-grow {
  0%   { transform: scale(1); text-shadow: none; }
  100% { transform: scale(1.8); text-shadow: 0 0 40px rgba(255, 215, 0, 0.85); }
}

@keyframes merge-op-appear {
  0%   { opacity: 0; transform: scale(0.4); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes merge-eq-appear {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes merge-total-appear {
  0%   { opacity: 0; transform: scale(0.4); text-shadow: none; }
  100% {
    opacity: 1;
    transform: scale(1);
    text-shadow: 0 0 36px rgba(255, 215, 0, 0.85);
  }
}
```

- [ ] **Step 2: dev server에서 육안 확인**

```bash
npm run dev
```

Stage 4 → merging 페이즈 진입 시 (scores prop이 없으므로 아직 `0 + 0 + 0 = 0`으로 보임, 타이밍과 애니메이션 확인용)

- [ ] **Step 3: 커밋**

```bash
git add src/stages/stage4/Stage4MergeOverlay.css
git commit -m "feat: Stage4MergeOverlay 점수 합산 CSS 애니메이션 추가"
```

---

## Task 4: Stage4Host에서 scores prop 전달

**Files:**
- Modify: `src/stages/stage4/Stage4Host.jsx`

현재 `Stage4Host.jsx`에서 MergeOverlay를 렌더하는 라인은:
```jsx
{phase === 'merging' && <Stage4MergeOverlay />}
```

- [ ] **Step 1: scores prop 전달하도록 수정**

위 라인을 아래로 교체한다.

```jsx
{phase === 'merging' && (
  <Stage4MergeOverlay
    scores={{
      pane1: results[1]?.score ?? 0,
      pane2: results[2]?.score ?? 0,
      pane3: results[3]?.score ?? 0,
    }}
  />
)}
```

- [ ] **Step 2: 전체 테스트 통과 확인**

```bash
npx vitest run
```

예상: 기존 테스트 포함 전체 PASS

- [ ] **Step 3: dev server에서 실제 게임 흐름 확인**

```bash
npm run dev
```

Stage 4 플레이 → 3개 서브 게임 완료 → merging 페이즈 진입 시:
- 각 패널 위치에 실제 획득 점수 팝업
- 1초 후 점수 동시 확대 + glow
- 1.8초에 `+` 두 개 동시 등장
- 2.6초에 `=` 등장, 2.9초에 합계 팡
- 4초 후 jumpscare 전환 정상 작동

- [ ] **Step 4: 커밋**

```bash
git add src/stages/stage4/Stage4Host.jsx
git commit -m "feat: Stage4Host에서 MergeOverlay로 sub-scores 전달"
```
