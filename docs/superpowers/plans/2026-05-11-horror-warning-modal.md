# 홈 화면 공포 경고 모달 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈(`/`) 진입 시마다 공포 콘텐츠 사전 동의 모달을 표시해, 사용자가 점프스케어·큰 효과음·광과민성 위험을 인지하고 동의해야만 게임을 시작/랭킹을 볼 수 있게 한다.

**Architecture:** 별도 프리젠테이셔널 컴포넌트 `WarningModal`을 만들고, `TitlePage`에서 `useState(true)`로 가시성을 로컬 관리한다. 동의 시 `false`로 토글. 페이지 재마운트마다 `true`로 초기화되므로 별도 저장소(localStorage 등)가 필요 없다. 모달은 `position: fixed` + `z-index: 9999` 백드롭으로 타이틀 화면 전체를 차단한다.

**Tech Stack:** React 19, Vitest, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom (모두 `package.json`에 이미 포함).

**File Structure:**

```
src/components/WarningModal/
├── WarningModal.jsx        # 새로 생성 — 프리젠테이셔널, props만 받음
├── WarningModal.css        # 새로 생성 — 모달 스타일
└── WarningModal.test.jsx   # 새로 생성 — 4개 단위 테스트

src/routes/TitlePage/TitlePage.jsx  # 수정 — useState + WarningModal 조건부 렌더
```

`spec`: `docs/superpowers/specs/2026-05-11-horror-warning-design.md`

---

### Task 1: WarningModal 첫 테스트 — 4가지 경고 항목 표시 (RED → GREEN)

**Files:**
- Create: `src/components/WarningModal/WarningModal.test.jsx`
- Create: `src/components/WarningModal/WarningModal.jsx`

- [ ] **Step 1: 첫 테스트 작성 (RED)**

`src/components/WarningModal/WarningModal.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WarningModal from './WarningModal.jsx';

describe('WarningModal', () => {
  it('4가지 경고 항목을 모두 표시한다', () => {
    render(<WarningModal onAgree={() => {}} />);
    expect(screen.getByText(/점프스케어와 갑작스러운 큰 효과음/)).toBeInTheDocument();
    expect(screen.getByText(/광과민성 발작 주의/)).toBeInTheDocument();
    expect(screen.getByText(/이어폰 사용 시 볼륨/)).toBeInTheDocument();
    expect(screen.getByText(/12세 이상에게 권장/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npm run test:run -- src/components/WarningModal
```

Expected: 모듈 해석 실패 (`WarningModal.jsx` 없음)

- [ ] **Step 3: 최소 구현으로 통과**

`src/components/WarningModal/WarningModal.jsx`:

```jsx
const WARNING_ITEMS = [
  '점프스케어와 갑작스러운 큰 효과음이 나옵니다',
  '일부 장면에 깜빡이는 화면 연출이 포함됩니다 (광과민성 발작 주의)',
  '이어폰 사용 시 볼륨을 미리 낮춰 주세요',
  '12세 이상에게 권장합니다',
];

export default function WarningModal({ onAgree }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="warning-modal-title">
      <div>
        <h2 id="warning-modal-title">⚠ 시작 전 안내</h2>
        <p>본 게임은 공포 콘텐츠를 포함합니다.</p>
        <ul>
          {WARNING_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <button type="button" onClick={onAgree}>동의하고 시작</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npm run test:run -- src/components/WarningModal
```

Expected: 1 test passed

- [ ] **Step 5: 커밋**

```bash
git add src/components/WarningModal/WarningModal.jsx src/components/WarningModal/WarningModal.test.jsx
git commit -m "feat: WarningModal 컴포넌트 골격 및 경고 항목 표시"
```

---

### Task 2: 동의 버튼 클릭 → onAgree 콜백 호출 (RED → GREEN)

**Files:**
- Modify: `src/components/WarningModal/WarningModal.test.jsx` (테스트 추가)
- Modify: `src/components/WarningModal/WarningModal.jsx` (이미 onClick 연결됨 — 회귀 검증용 테스트)

- [ ] **Step 1: 테스트 추가**

`WarningModal.test.jsx`의 `describe` 블록에 추가:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WarningModal from './WarningModal.jsx';

// (기존 import 위 vi 추가, userEvent 추가)
```

`describe` 안에 추가:

```jsx
  it('동의 버튼 클릭 시 onAgree 콜백을 호출한다', async () => {
    const onAgree = vi.fn();
    const user = userEvent.setup();
    render(<WarningModal onAgree={onAgree} />);
    await user.click(screen.getByRole('button', { name: /동의하고 시작/ }));
    expect(onAgree).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: 테스트 실행 — 통과 확인 (Task 1에서 이미 onClick 연결됨)**

```bash
npm run test:run -- src/components/WarningModal
```

Expected: 2 tests passed

> NOTE: 이 테스트는 Task 1 구현으로 이미 통과한다. TDD 의도상 회귀 방어용 안전망으로 추가한다 (만약 향후 `onClick` 제거 변경이 들어오면 이 테스트가 잡아줌).

- [ ] **Step 3: 커밋**

```bash
git add src/components/WarningModal/WarningModal.test.jsx
git commit -m "test: WarningModal 동의 버튼 클릭 콜백 검증"
```

---

### Task 3: 마운트 시 동의 버튼 자동 포커스 (RED → GREEN)

**Files:**
- Modify: `src/components/WarningModal/WarningModal.test.jsx`
- Modify: `src/components/WarningModal/WarningModal.jsx`

- [ ] **Step 1: 테스트 추가 (RED)**

`describe` 안에 추가:

```jsx
  it('마운트 시 동의 버튼에 자동 포커스된다', () => {
    render(<WarningModal onAgree={() => {}} />);
    expect(screen.getByRole('button', { name: /동의하고 시작/ })).toHaveFocus();
  });
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npm run test:run -- src/components/WarningModal
```

Expected: "마운트 시 동의 버튼에 자동 포커스된다" FAIL (button does not have focus)

- [ ] **Step 3: useRef + useEffect로 포커스 구현**

`WarningModal.jsx` 전체 교체:

```jsx
import { useEffect, useRef } from 'react';

const WARNING_ITEMS = [
  '점프스케어와 갑작스러운 큰 효과음이 나옵니다',
  '일부 장면에 깜빡이는 화면 연출이 포함됩니다 (광과민성 발작 주의)',
  '이어폰 사용 시 볼륨을 미리 낮춰 주세요',
  '12세 이상에게 권장합니다',
];

export default function WarningModal({ onAgree }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="warning-modal-title">
      <div>
        <h2 id="warning-modal-title">⚠ 시작 전 안내</h2>
        <p>본 게임은 공포 콘텐츠를 포함합니다.</p>
        <ul>
          {WARNING_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <button ref={buttonRef} type="button" onClick={onAgree}>동의하고 시작</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npm run test:run -- src/components/WarningModal
```

Expected: 3 tests passed

- [ ] **Step 5: 커밋**

```bash
git add src/components/WarningModal/WarningModal.jsx src/components/WarningModal/WarningModal.test.jsx
git commit -m "feat: WarningModal 마운트 시 동의 버튼 자동 포커스"
```

---

### Task 4: ESC 키 무시 검증 (회귀 안전망)

**Files:**
- Modify: `src/components/WarningModal/WarningModal.test.jsx`

- [ ] **Step 1: 음성 테스트 추가 — ESC가 onAgree를 호출하지 않음**

`describe` 안에 추가:

```jsx
  it('ESC 키를 눌러도 onAgree가 호출되지 않는다', async () => {
    const onAgree = vi.fn();
    const user = userEvent.setup();
    render(<WarningModal onAgree={onAgree} />);
    await user.keyboard('{Escape}');
    expect(onAgree).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: 테스트 실행 — 통과 확인 (ESC 핸들러를 바인딩하지 않으므로 기본 통과)**

```bash
npm run test:run -- src/components/WarningModal
```

Expected: 4 tests passed

> NOTE: 이 테스트는 "강제 차단" 의도를 명시적으로 회귀 방어한다. 향후 누군가 ESC 핸들러를 추가해 모달을 닫으려 시도하면 즉시 실패한다.

- [ ] **Step 3: 커밋**

```bash
git add src/components/WarningModal/WarningModal.test.jsx
git commit -m "test: WarningModal ESC 키 무시 검증"
```

---

### Task 5: WarningModal CSS 스타일

**Files:**
- Create: `src/components/WarningModal/WarningModal.css`
- Modify: `src/components/WarningModal/WarningModal.jsx` (className 추가 + CSS import)

- [ ] **Step 1: CSS 파일 생성**

`src/components/WarningModal/WarningModal.css`:

```css
.warning-modal__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: warning-modal__fade-in 200ms ease-out;
}

.warning-modal__card {
  background: #1a1a1a;
  border: 1px solid #ffffff;
  border-radius: 8px;
  max-width: 480px;
  width: calc(100% - 48px);
  padding: 32px 28px;
  color: #ffffff;
  animation: warning-modal__pop-in 200ms ease-out;
}

.warning-modal__title {
  color: #ff4444;
  font-weight: 700;
  font-size: 22px;
  margin: 0 0 16px 0;
}

.warning-modal__intro {
  margin: 0 0 16px 0;
  line-height: 1.6;
}

.warning-modal__list {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
}

.warning-modal__list li {
  position: relative;
  padding-left: 16px;
  line-height: 1.6;
  margin-bottom: 6px;
}

.warning-modal__list li::before {
  content: '·';
  position: absolute;
  left: 4px;
}

.warning-modal__agree-btn {
  display: block;
  margin: 0 auto;
  padding: 14px 36px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.warning-modal__agree-btn:hover {
  border-color: #00ffcc;
  color: #00ffcc;
  box-shadow: 0 0 15px rgba(0, 255, 204, 0.5);
}

@keyframes warning-modal__fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes warning-modal__pop-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

- [ ] **Step 2: WarningModal.jsx에 className 추가 + CSS import**

`WarningModal.jsx` 전체 교체:

```jsx
import { useEffect, useRef } from 'react';
import './WarningModal.css';

const WARNING_ITEMS = [
  '점프스케어와 갑작스러운 큰 효과음이 나옵니다',
  '일부 장면에 깜빡이는 화면 연출이 포함됩니다 (광과민성 발작 주의)',
  '이어폰 사용 시 볼륨을 미리 낮춰 주세요',
  '12세 이상에게 권장합니다',
];

export default function WarningModal({ onAgree }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div
      className="warning-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="warning-modal-title"
    >
      <div className="warning-modal__card">
        <h2 id="warning-modal-title" className="warning-modal__title">
          ⚠ 시작 전 안내
        </h2>
        <p className="warning-modal__intro">본 게임은 공포 콘텐츠를 포함합니다.</p>
        <ul className="warning-modal__list">
          {WARNING_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <button
          ref={buttonRef}
          type="button"
          className="warning-modal__agree-btn"
          onClick={onAgree}
        >
          동의하고 시작
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 테스트 재실행 — 통과 유지 확인**

```bash
npm run test:run -- src/components/WarningModal
```

Expected: 4 tests passed (className 추가가 기존 테스트를 깨지 않음)

- [ ] **Step 4: 커밋**

```bash
git add src/components/WarningModal/WarningModal.css src/components/WarningModal/WarningModal.jsx
git commit -m "feat: WarningModal 스타일링 (백드롭, 카드, 애니메이션)"
```

---

### Task 6: TitlePage 통합

**Files:**
- Modify: `src/routes/TitlePage/TitlePage.jsx`

- [ ] **Step 1: TitlePage.jsx 수정 — useState + WarningModal 조건부 렌더**

`src/routes/TitlePage/TitlePage.jsx` 전체 교체:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
import WarningModal from '../../components/WarningModal/WarningModal.jsx';
import './TitlePage.css';

export default function TitlePage() {
  const navigate = useNavigate();
  const startGame = useGameStore((s) => s.startGame);
  const [showWarning, setShowWarning] = useState(true);

  const handleStart = () => {
    startGame();
    navigate('/hub');
  };

  const handleOpenRanking = () => {
    navigate('/ranking');
  };

  return (
    <div
      className="title-page"
      style={{ backgroundImage: 'url(/assets/images/bg_chalkboard.png)' }}
    >
      <div className="title-page__action title-page__action--start">
        <button type="button" className="title-page__btn" onClick={handleStart}>
          시작 ▶
        </button>
      </div>

      <div className="title-page__action title-page__action--ranking">
        <button type="button" className="title-page__btn" onClick={handleOpenRanking}>
          🏆 랭킹 보기
        </button>
      </div>

      {showWarning && <WarningModal onAgree={() => setShowWarning(false)} />}
    </div>
  );
}
```

- [ ] **Step 2: dev 서버에서 시각·동작 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:5173/`로 진입해 다음 직접 확인:
- 모달이 자동으로 표시됨
- 모달이 떠 있는 동안 시작/랭킹 버튼 클릭이 막힘 (백드롭이 가림)
- "동의하고 시작" 클릭 시 모달이 사라지고 시작/랭킹 버튼 사용 가능
- 다른 페이지로 이동 후 `/`로 다시 오면 모달이 다시 표시됨

> NOTE: 시각 확인이 끝나면 `Ctrl+C`로 dev 서버 종료. 자동화 가능한 것은 단위 테스트로 이미 검증했고, 시각/통합 동작은 사람 눈이 가장 정확함.

- [ ] **Step 3: 커밋**

```bash
git add src/routes/TitlePage/TitlePage.jsx
git commit -m "feat: TitlePage에 WarningModal 통합 — 홈 진입 시마다 동의 모달 표시"
```

---

### Task 7: 최종 검증 — 전체 테스트 + 빌드

**Files:**
- (변경 없음)

- [ ] **Step 1: 전체 테스트 통과 확인**

```bash
npm run test:run
```

Expected: 모든 테스트 통과 (기존 `scoring.test.js` + 새 `WarningModal.test.jsx` 4개)

- [ ] **Step 2: 빌드 검증**

```bash
npm run build
```

Expected: 빌드 성공, `dist/` 출력 생성됨

- [ ] **Step 3: 린트 통과 확인**

```bash
npm run lint
```

Expected: 0 errors. 워닝이 있다면 새 파일들(`WarningModal.*`) 관련 워닝만 빠르게 정리 (기존 워닝은 손대지 않음).

> NOTE: 이 단계까지 모두 통과하면 기능 완성. 추가 커밋은 린트 수정이 있을 때만.

---

## 자체 검토 (Self-Review)

**Spec coverage:**
- ✅ 강제 동의 모달 → Task 1, 6
- ✅ 매번 표시 (저장 없음) → Task 6 (`useState(true)` 초기값)
- ✅ 4가지 경고 항목 → Task 1
- ✅ 담담한 톤 → 본문 카피 동일
- ✅ 전체 차단 (시작·랭킹 막음) → Task 5 (백드롭 `position: fixed`, `z-index: 9999`)
- ✅ 자동 포커스 → Task 3
- ✅ ESC 닫힘 비활성 → Task 4
- ✅ `role="dialog"`, `aria-modal`, `aria-labelledby` → Task 1
- ✅ 비주얼 (백드롭, 카드, 빨강 ⚠, 페이드/팝업 애니메이션) → Task 5
- ✅ 4개 단위 테스트 → Task 1-4
- ✅ TitlePage 통합 테스트 추가 안 함 → 명시적 제외, 본 계획에서도 다루지 않음

**Placeholder scan:** TBD/TODO/"적절히"/"비슷하게" 없음. 모든 step에 실제 코드/명령 포함.

**Type consistency:** prop 이름 `onAgree` 일관 사용. CSS 클래스 prefix `warning-modal__` 일관. 컴포넌트 export 이름 `WarningModal` 일관.
