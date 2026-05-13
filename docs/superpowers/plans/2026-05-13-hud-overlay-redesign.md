# HUD Overlay 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** HUD 좌측 하단을 스테이지별 점수 텍스트로, 우측 하단을 설명/결과 아이콘 버튼으로 교체하고, Stage 4 완료 후 자동 엔딩 이동을 제거한다.

**Architecture:** HudOverlay 단일 컴포넌트에서 점수 텍스트 + 아이콘 버튼 + InfoModal 상태를 관리한다. ScoreTable은 완전 삭제하고 InfoModal을 새로 추가한다. StagePage는 Stage 4 완료 후 `/hub`로 복귀하도록 한 줄 수정한다.

**Tech Stack:** React 19, lucide-react, Vitest, @testing-library/react, react-router-dom v7, zustand

---

## 파일 구조

| 동작 | 경로 | 역할 |
|------|------|------|
| Create | `src/components/InfoModal/InfoModal.jsx` | 게임 스토리 설명 모달 |
| Create | `src/components/InfoModal/InfoModal.css` | InfoModal 스타일 |
| Create | `src/components/InfoModal/__tests__/InfoModal.test.jsx` | InfoModal 테스트 |
| Modify | `src/components/HudOverlay/HudOverlay.jsx` | 전체 리팩토링 |
| Modify | `src/components/HudOverlay/HudOverlay.css` | 스타일 전면 교체 |
| Modify | `src/components/HudOverlay/__tests__/HudOverlay.test.jsx` | 테스트 전면 갱신 |
| Modify | `src/routes/StagePage/StagePage.jsx:84` | Stage 4 navigate 변경 |
| Delete | `src/components/HudOverlay/ScoreTable.jsx` | 제거 |
| Delete | `src/components/HudOverlay/ScoreTable.css` | 제거 |
| Delete | `src/components/HudOverlay/__tests__/ScoreTable.test.jsx` | 제거 |

---

## Task 1: lucide-react 설치

**Files:**
- Modify: `package.json` (자동)

- [ ] **Step 1: 패키지 설치**

```bash
npm install lucide-react
```

- [ ] **Step 2: 설치 확인**

```bash
node -e "import('lucide-react').then(m => console.log('ok', Object.keys(m).slice(0,3)))"
```

Expected: `ok [ 'Accessibility', 'Activity', 'AirVent' ]` 비슷한 출력 (에러 없이)

- [ ] **Step 3: 커밋**

```bash
git add package.json package-lock.json
git commit -m "chore: lucide-react 설치"
```

---

## Task 2: InfoModal 생성 (TDD)

**Files:**
- Create: `src/components/InfoModal/__tests__/InfoModal.test.jsx`
- Create: `src/components/InfoModal/InfoModal.jsx`
- Create: `src/components/InfoModal/InfoModal.css`

- [ ] **Step 1: 테스트 파일 작성**

`src/components/InfoModal/__tests__/InfoModal.test.jsx` 생성:

```jsx
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InfoModal from '../InfoModal.jsx';

describe('InfoModal', () => {
  afterEach(cleanup);

  it('게임 설명 모달이 렌더된다', () => {
    render(<InfoModal onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/그린이가 둘이 됐다/)).toBeInTheDocument();
  });

  it('닫기 버튼 클릭 시 onClose가 호출된다', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<InfoModal onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('backdrop 클릭 시 onClose가 호출된다', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<InfoModal onClose={onClose} />);
    await user.click(container.querySelector('.info-modal-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
npm run test:run -- src/components/InfoModal/__tests__/InfoModal.test.jsx
```

Expected: FAIL — `Cannot find module '../InfoModal.jsx'`

- [ ] **Step 3: InfoModal.jsx 작성**

`src/components/InfoModal/InfoModal.jsx` 생성:

```jsx
import React from 'react';
import './InfoModal.css';

export default function InfoModal({ onClose }) {
  return (
    <div className="info-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="info-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="info-modal-title"
      >
        <div className="info-modal__header">
          <h2 id="info-modal-title">게임 설명</h2>
          <button type="button" className="info-modal__close" onClick={onClose} aria-label="닫기">×</button>
        </div>
        <div className="info-modal__body">
          <p>그린이가 둘이 됐다.</p>
          <p>진짜와 가짜를 구분해 네 가지 게임을 클리어하고 도플갱어를 퇴치하라.</p>
          <ul>
            <li>Stage 1 — 괘종시계: ← 키</li>
            <li>Stage 2 — 반응속도: ↑ 키</li>
            <li>Stage 3 — 캐치: → 키</li>
            <li>Stage 4 — 최종전: ← / ↑ / → 동시</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: InfoModal.css 작성**

`src/components/InfoModal/InfoModal.css` 생성:

```css
.info-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.info-modal {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 24px;
  max-width: 480px;
  width: 90%;
  color: #ffffff;
}

.info-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.info-modal__header h2 {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  margin: 0;
}

.info-modal__close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.4rem;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}

.info-modal__close:hover {
  color: #ffffff;
}

.info-modal__body p {
  margin: 0 0 12px;
  line-height: 1.6;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
}

.info-modal__body ul {
  margin: 0;
  padding-left: 20px;
  list-style: none;
}

.info-modal__body li {
  margin-bottom: 6px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 0.02em;
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npm run test:run -- src/components/InfoModal/__tests__/InfoModal.test.jsx
```

Expected: 3 tests PASS

- [ ] **Step 6: 커밋**

```bash
git add src/components/InfoModal/
git commit -m "feat: InfoModal 컴포넌트 추가 - 게임 설명 모달"
```

---

## Task 3: HudOverlay 테스트 갱신 + 리팩토링

**Files:**
- Modify: `src/components/HudOverlay/__tests__/HudOverlay.test.jsx`
- Modify: `src/components/HudOverlay/HudOverlay.jsx`
- Modify: `src/components/HudOverlay/HudOverlay.css`

- [ ] **Step 1: HudOverlay 테스트 전면 교체**

`src/components/HudOverlay/__tests__/HudOverlay.test.jsx` 전체를 아래로 교체:

```jsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HudOverlay from '../HudOverlay.jsx';
import { useGameStore } from '../../../store.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderHud({ path = '/hub' } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <HudOverlay />
    </MemoryRouter>,
  );
}

function setStageScore(stageId, score) {
  useGameStore.setState((s) => ({
    stageResults: { ...s.stageResults, [stageId]: { metric: 0, score } },
  }));
}

describe('HudOverlay', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    cleanup();
    useGameStore.getState().resetGame();
  });

  it('/ 라우트에서는 HUD가 렌더되지 않는다', () => {
    const { container } = renderHud({ path: '/' });
    expect(container.querySelector('.hud-overlay')).toBeNull();
  });

  it('/ranking 라우트에서는 HUD가 렌더되지 않는다', () => {
    const { container } = renderHud({ path: '/ranking' });
    expect(container.querySelector('.hud-overlay')).toBeNull();
  });

  it('/stage/* 라우트에서는 SCORE 텍스트만 노출되고 아이콘 버튼은 없다', () => {
    renderHud({ path: '/stage/1' });
    expect(screen.getByText(/SCORE/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '게임 설명' })).toBeNull();
    expect(screen.queryByRole('button', { name: '결과 확인' })).toBeNull();
  });

  it('초기 상태 — 스테이지 점수 0 · 0 · 0 · 0 텍스트가 노출된다', () => {
    renderHud();
    expect(screen.getByText('0 · 0 · 0 · 0')).toBeInTheDocument();
  });

  it('Stage 1 클리어 후 해당 점수가 반영된다', () => {
    setStageScore(1, 360);
    renderHud();
    expect(screen.getByText('360 · 0 · 0 · 0')).toBeInTheDocument();
  });

  it('Info 버튼 클릭 시 InfoModal이 열린다', async () => {
    const user = userEvent.setup();
    renderHud();
    await user.click(screen.getByRole('button', { name: '게임 설명' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('LogIn 버튼 클릭 시 999점 → /ending/silhouette로 이동한다', async () => {
    setStageScore(1, 999);
    const user = userEvent.setup();
    renderHud();
    await user.click(screen.getByRole('button', { name: '결과 확인' }));
    expect(mockNavigate).toHaveBeenCalledWith('/ending/silhouette');
  });

  it('LogIn 버튼 클릭 시 1000점 → /ending/alive로 이동한다', async () => {
    setStageScore(1, 1000);
    const user = userEvent.setup();
    renderHud();
    await user.click(screen.getByRole('button', { name: '결과 확인' }));
    expect(mockNavigate).toHaveBeenCalledWith('/ending/alive');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
npm run test:run -- src/components/HudOverlay/__tests__/HudOverlay.test.jsx
```

Expected: 여러 테스트 FAIL (진행바 관련 요소 없음, 아이콘 버튼 없음 등)

- [ ] **Step 3: HudOverlay.jsx 전면 교체**

`src/components/HudOverlay/HudOverlay.jsx` 전체를 아래로 교체:

```jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Info, LogIn } from 'lucide-react';
import { useGameStore, selectTotalScore } from '../../store.js';
import { endingOutcomeFromTotal } from '../../scoring.js';
import InfoModal from '../InfoModal/InfoModal.jsx';
import './HudOverlay.css';

const HIDDEN_ROUTES = new Set(['/', '/ranking']);

export default function HudOverlay() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const total = useGameStore(selectTotalScore);
  const stageResults = useGameStore((s) => s.stageResults);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    if (!infoOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setInfoOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [infoOpen]);

  if (HIDDEN_ROUTES.has(pathname)) return null;

  if (pathname.startsWith('/stage/')) {
    return (
      <div className="hud-overlay" aria-hidden="false">
        <div className="hud-overlay__score-simple">SCORE {total}</div>
      </div>
    );
  }

  const scoreText = [1, 2, 3, 4]
    .map((n) => stageResults[n]?.score ?? 0)
    .join(' · ');

  return (
    <div className="hud-overlay" aria-hidden="false">
      <div className="hud-overlay__scores">{scoreText}</div>
      <div className="hud-overlay__actions">
        <button
          type="button"
          className="hud-overlay__action-btn"
          onClick={() => setInfoOpen(true)}
          aria-label="게임 설명"
        >
          <Info size={22} />
        </button>
        <button
          type="button"
          className="hud-overlay__action-btn"
          onClick={() => navigate(`/ending/${endingOutcomeFromTotal(total)}`)}
          aria-label="결과 확인"
        >
          <LogIn size={22} />
        </button>
      </div>
      {infoOpen && <InfoModal onClose={() => setInfoOpen(false)} />}
    </div>
  );
}
```

- [ ] **Step 4: HudOverlay.css 전면 교체**

`src/components/HudOverlay/HudOverlay.css` 전체를 아래로 교체:

```css
.hud-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;
}

.hud-overlay__score-simple,
.hud-overlay__scores {
  position: absolute;
  bottom: clamp(12px, 2.5vw, 22px);
  left: clamp(12px, 3vw, 28px);
  font-size: clamp(1rem, 2.5vw, 1.6rem);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.75);
}

.hud-overlay__actions {
  position: absolute;
  bottom: clamp(12px, 2.5vw, 22px);
  right: clamp(12px, 3vw, 28px);
  display: flex;
  gap: 8px;
  pointer-events: auto;
}

.hud-overlay__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 4px;
  color: #ffffff;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.hud-overlay__action-btn:hover {
  background: rgba(0, 0, 0, 0.65);
  border-color: #ffffff;
}

.hud-overlay__action-btn:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 3px;
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npm run test:run -- src/components/HudOverlay/__tests__/HudOverlay.test.jsx
```

Expected: 9 tests PASS

- [ ] **Step 6: 커밋**

```bash
git add src/components/HudOverlay/HudOverlay.jsx \
        src/components/HudOverlay/HudOverlay.css \
        src/components/HudOverlay/__tests__/HudOverlay.test.jsx
git commit -m "feat: HudOverlay 리디자인 - 점수 텍스트 + 아이콘 버튼"
```

---

## Task 4: StagePage Stage 4 라우팅 수정 + ScoreTable 삭제

**Files:**
- Modify: `src/routes/StagePage/StagePage.jsx:84`
- Delete: `src/components/HudOverlay/ScoreTable.jsx`
- Delete: `src/components/HudOverlay/ScoreTable.css`
- Delete: `src/components/HudOverlay/__tests__/ScoreTable.test.jsx`

- [ ] **Step 1: StagePage.jsx Stage 4 navigate 수정**

`src/routes/StagePage/StagePage.jsx` 84번째 줄 근처에서 아래를 찾아:

```js
navigate(endingRouteFromCurrentScore());
```

아래로 교체:

```js
navigate('/hub');
```

(단, `endingRouteFromCurrentScore` 함수 정의 자체도 이제 사용되지 않으므로 함께 삭제한다.)

삭제할 코드 (StagePage.jsx 31~32줄):

```js
  const endingRouteFromCurrentScore = () =>
    `/ending/${selectEndingOutcome(useGameStore.getState())}`;
```

`selectEndingOutcome` import도 제거:

```js
import { useGameStore, selectEndingOutcome } from '../../store.js';
```

→ 아래로 교체:

```js
import { useGameStore } from '../../store.js';
```

- [ ] **Step 2: 전체 테스트 실행 — 깨진 테스트 없는지 확인**

```bash
npm run test:run
```

Expected: 모든 기존 테스트 PASS (ScoreTable.test.jsx는 아직 존재하지만 통과 중)

- [ ] **Step 3: ScoreTable 파일 삭제**

```bash
rm src/components/HudOverlay/ScoreTable.jsx \
   src/components/HudOverlay/ScoreTable.css \
   src/components/HudOverlay/__tests__/ScoreTable.test.jsx
```

- [ ] **Step 4: 전체 테스트 재실행 — 모두 통과 확인**

```bash
npm run test:run
```

Expected: 모든 테스트 PASS (ScoreTable 관련 테스트 파일 자체가 없으므로 실패 없음)

- [ ] **Step 5: 커밋**

```bash
git add src/routes/StagePage/StagePage.jsx
git rm src/components/HudOverlay/ScoreTable.jsx \
       src/components/HudOverlay/ScoreTable.css \
       src/components/HudOverlay/__tests__/ScoreTable.test.jsx
git commit -m "feat: Stage4 완료 후 /hub 복귀 + ScoreTable 제거"
```
