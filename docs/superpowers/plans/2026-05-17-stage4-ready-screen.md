# Stage 4 Ready 화면 디자인 통일 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stage 4 `phase === 'intro'` 화면을 Stage 1/2/3 ready 화면과 동일한 `stage-info-screen` 패턴으로 통일한다.

**Architecture:** `Stage4Intro.jsx`와 `Stage4Intro.css`를 Stage 1 ready 영역 패턴을 베이스로 전면 재작성한다. 프리뷰는 Stage 1/2/3 예시 이미지 3장의 flex 가로 분할로 표현하고, `←` `↑` `→` 세 키 모두 active 발광 상태를 적용한다. `Stage4Host`에서는 `Stage4Intro`에 `onStart` 콜백을 전달해서 마우스 클릭 시작도 지원한다.

**Tech Stack:** React (JSX), CSS, vitest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-05-17-stage4-ready-screen-design.md`

---

## File Structure

| 파일 | 작업 | 책임 |
|---|---|---|
| `src/stages/stage4/Stage4Intro.jsx` | 전면 재작성 | Stage 4 ready 화면 마크업 (Stage 1/2/3 패턴) |
| `src/stages/stage4/Stage4Intro.css` | 전면 재작성 | Stage 1 ready 영역 스타일 복제 + Stage 4 전용 (3분할 프리뷰, 3키 동시 active) |
| `src/stages/stage4/Stage4Host.jsx` | 1줄 수정 | `<Stage4Intro onStart={...} />` 콜백 연결 |
| `src/stages/stage4/__tests__/Stage4Intro.test.jsx` | 신규 생성 | Stage4Intro 렌더 / onStart 호출 단위 테스트 |

---

## Task 1: Stage4Intro 단위 테스트 작성 (RED)

**Files:**
- Create: `src/stages/stage4/__tests__/Stage4Intro.test.jsx`

- [ ] **Step 1: 테스트 파일 작성**

`src/stages/stage4/__tests__/Stage4Intro.test.jsx`:

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Stage4Intro from '../Stage4Intro.jsx';

describe('Stage4Intro', () => {
  it('Stage 4 타이틀을 렌더한다', () => {
    render(<Stage4Intro onStart={() => {}} />);
    expect(screen.getByText('4단계: 최종 시련')).toBeInTheDocument();
  });

  it('Stage 1/2/3 프리뷰 이미지 3장을 모두 렌더한다', () => {
    render(<Stage4Intro onStart={() => {}} />);
    const previews = screen.getAllByRole('img');
    const srcs = previews.map((img) => img.getAttribute('src'));
    expect(srcs).toContain('/assets/images/bg_stage1_clock_example.png');
    expect(srcs).toContain('/assets/images/bg_stage2_library_fake.png');
    expect(srcs).toContain('/assets/images/bg_stage3_example.png');
  });

  it('←, ↑, → 세 키를 모두 active 클래스로 렌더한다', () => {
    const { container } = render(<Stage4Intro onStart={() => {}} />);
    expect(container.querySelector('.key-cap.left-active')).toBeTruthy();
    expect(container.querySelector('.key-cap.top-active')).toBeTruthy();
    expect(container.querySelector('.key-cap.right-active')).toBeTruthy();
  });

  it('GAME START 버튼 클릭 시 onStart를 호출한다', () => {
    const onStart = vi.fn();
    render(<Stage4Intro onStart={onStart} />);
    fireEvent.click(screen.getByText('GAME START'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('ENTER 안내 문구를 렌더한다', () => {
    render(<Stage4Intro onStart={() => {}} />);
    expect(screen.getByText('ENTER 키를 눌러 시작')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인 (RED)**

Run: `npx vitest run src/stages/stage4/__tests__/Stage4Intro.test.jsx`

Expected: 5개 중 최소 일부 실패 — 기존 `Stage4Intro`는 `4단계: 최종 시련`이 아니라 `최종 시련 — 거울방`이며 `<img>` 태그도 없고 `key-cap` 클래스도 없음.

---

## Task 2: Stage4Intro.css 재작성

**Files:**
- Modify (전면 재작성): `src/stages/stage4/Stage4Intro.css`

- [ ] **Step 1: 기존 CSS 전체 교체**

`src/stages/stage4/Stage4Intro.css` 전체 내용을 아래로 교체:

```css
/* Stage 4 ready 화면 — Stage 1/2/3과 동일한 stage-info-screen 패턴 */

/* === Stage 1 ready 영역 스타일 복제 === */
.stage-info-screen {
  position: absolute; inset: 0; z-index: 110;
  display: flex; flex-direction: column; align-items: center;
  padding: 60px 0; background: rgba(12, 13, 17, 0.85);
}

.info-top-section {
  position: absolute; top: 50px; text-align: center;
}

.stage-title {
  font-size: 4.5rem; font-weight: 950; color: #fff; margin-bottom: 10px;
  letter-spacing: -1px;
}

.info-middle-section {
  display: flex; align-items: center; justify-content: center;
  gap: 100px; width: 100%; height: 100%;
}

.simple-preview-image {
  width: 550px;
  height: auto;
  border-radius: 15px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.instruction-item { display: flex; flex-direction: column; align-items: center; gap: 20px; }

.arrow-keys-cluster { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.arrow-row { display: flex; gap: 8px; }

.key-cap {
  width: 70px; height: 70px; background: #1e293b; border: 2px solid #475569;
  border-radius: 12px; display: flex; justify-content: center; align-items: center;
  color: #64748b; font-size: 1.8rem; font-weight: 900; box-shadow: 0 5px 0 #000;
}

.key-cap.left-active,
.key-cap.top-active,
.key-cap.right-active {
  background: #2d0a0a; border: 3px solid #ff2222; color: #ff2222;
  box-shadow: 0 5px 0 #000, 0 0 25px rgba(255, 34, 34, 0.6);
  animation: red-glow-pulse 1.5s infinite ease-in-out;
}

@keyframes red-glow-pulse {
  0%, 100% { box-shadow: 0 5px 0 #000, 0 0 15px rgba(255, 34, 34, 0.4); }
  50% { box-shadow: 0 5px 0 #000, 0 0 40px rgba(255, 34, 34, 0.9); filter: brightness(1.2); }
}

.main-instruction-text {
  font-size: 1.6rem; font-weight: 700; color: #cbd5e1;
  text-align: center; line-height: 1.5;
  margin-top: 10px;
}

.highlight-key {
  color: #ff2222;
  font-weight: 900;
  text-shadow: 0 0 10px rgba(255, 34, 34, 0.4);
}

.info-bottom-section {
  position: absolute; bottom: 50px; display: flex; flex-direction: column; align-items: center;
}

.key-icon-wrapper.start-btn {
  width: 280px; height: 85px; background: #f1f2f6; border-radius: 15px;
  display: flex; justify-content: center; align-items: center;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.key-icon-wrapper.start-btn span {
  color: #0c0d11; font-size: 2rem; font-weight: 950; letter-spacing: 4px;
}

.key-icon-wrapper.start-btn:hover {
  animation: hover-pulse-effect 1.2s infinite;
}

@keyframes hover-pulse-effect {
  0%, 100% { transform: scale(1); box-shadow: 0 0 15px rgba(255, 255, 255, 0.4); }
  50% { transform: scale(1.06); box-shadow: 0 0 40px rgba(255, 255, 255, 0.8); }
}

.sub-instruction-text {
  font-size: 1.3rem; color: #94a3b8; font-weight: 700; margin-top: 20px;
  animation: text-flicker-pulse 2s infinite ease-in-out;
}

@keyframes text-flicker-pulse {
  0%, 100% { opacity: 0.5; transform: scale(0.99); text-shadow: none; }
  50% { opacity: 1; transform: scale(1); color: #fff; text-shadow: 0 0 15px rgba(255, 255, 255, 0.6); }
}

/* === Stage 4 전용: 3분할 프리뷰 === */
.stage4-preview-triptych {
  display: flex;
  gap: 8px;
  padding: 0;
  overflow: hidden;
}

.stage4-preview-triptych img {
  flex: 1 1 0;
  min-width: 0;
  width: 33.3%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}
```

**중요:**
- 기존 `.stage4-intro`, `.stage4-intro__*`, `@keyframes stage4-intro-pulse`는 모두 제거 (위 코드로 통째로 교체)
- `.key-cap.left-active, .top-active, .right-active`를 그룹 셀렉터로 한 번에 정의 (Stage 1은 left만, Stage 2는 top만, Stage 3은 right만 정의)
- `.stage4-preview-triptych`는 `.simple-preview-image`와 함께 적용되어 `width: 550px / border-radius: 15px / box-shadow / border`는 상속받고, `display: flex; gap` 만 추가

---

## Task 3: Stage4Intro.jsx 재작성

**Files:**
- Modify (전면 재작성): `src/stages/stage4/Stage4Intro.jsx`

- [ ] **Step 1: 기존 컴포넌트 전체 교체**

`src/stages/stage4/Stage4Intro.jsx` 전체 내용을 아래로 교체:

```jsx
// Stage 4 ready 화면 — Stage 1/2/3과 동일한 stage-info-screen 패턴
import './Stage4Intro.css';

export default function Stage4Intro({ onStart }) {
  return (
    <div className="stage-info-screen stage4-intro-screen">
      <div className="info-top-section">
        <h1 className="stage-title">4단계: 최종 시련</h1>
      </div>

      <div className="info-middle-section">
        <div className="simple-preview-image stage4-preview-triptych">
          <img src="/assets/images/bg_stage1_clock_example.png" alt="Stage 1 Preview" />
          <img src="/assets/images/bg_stage2_library_fake.png" alt="Stage 2 Preview" />
          <img src="/assets/images/bg_stage3_example.png" alt="Stage 3 Preview" />
        </div>

        <div className="instruction-item">
          <div className="arrow-keys-cluster">
            <div className="arrow-row">
              <div className="key-cap top-active">↑</div>
            </div>
            <div className="arrow-row">
              <div className="key-cap left-active">←</div>
              <div className="key-cap">↓</div>
              <div className="key-cap right-active">→</div>
            </div>
          </div>
          <div className="main-instruction-text">
            3개 시련을 동시에<br/>
            <span className="highlight-key">[←][↑][→] 키</span>로 클리어하세요
          </div>
        </div>
      </div>

      <div className="info-bottom-section">
        <div className="key-icon-wrapper start-btn" onClick={onStart}>
          <span>GAME START</span>
        </div>
        <p className="sub-instruction-text">ENTER 키를 눌러 시작</p>
      </div>
    </div>
  );
}
```

**제거되는 것:**
- 기존 `import { maxScoreForStage } from '../../scoring.js';`
- 기존 `PREVIEWS` 배열
- 기존 마크업 (`stage4-intro__title`, `stage4-intro__subtitle`, `stage4-intro__panes`, `stage4-intro__weight`, `stage4-intro__cta`)

- [ ] **Step 2: 테스트 실행 (GREEN)**

Run: `npx vitest run src/stages/stage4/__tests__/Stage4Intro.test.jsx`

Expected: 5개 테스트 모두 PASS

---

## Task 4: Stage4Host에서 onStart 콜백 연결

**Files:**
- Modify: `src/stages/stage4/Stage4Host.jsx:123`

- [ ] **Step 1: Stage4Intro 호출 부분 수정**

`src/stages/stage4/Stage4Host.jsx`의 라인 123을 찾는다:

```jsx
{phase === 'intro' && <Stage4Intro />}
```

다음으로 교체:

```jsx
{phase === 'intro' && <Stage4Intro onStart={() => setPhase('running')} />}
```

다른 코드는 건드리지 않는다 (`Stage4Host`의 키 핸들러 `Space`/`Enter` → `running` 전환은 그대로 유지).

- [ ] **Step 2: 기존 단위 테스트 회귀 확인**

Run: `npx vitest run src/stages/stage4/__tests__/`

Expected: `Stage4Intro.test.jsx`, `Stage4MergeOverlay.test.jsx`, `Stage4TimerPane.test.jsx` 모두 PASS

---

## Task 5: 전체 테스트 회귀 확인

- [ ] **Step 1: 프로젝트 전체 테스트 실행**

Run: `npx vitest run`

Expected: 모든 테스트 PASS (기존 Stage 1/2/3, HudOverlay 등 회귀 없음)

만약 실패: 어떤 테스트가 깨졌는지 출력 캡처 후 원인 분석. Stage4Intro의 마크업 변경이 다른 컴포넌트에 영향 줄 수 없으므로, 실패는 거의 확실히 무관한 사전 실패 또는 미세한 selector 충돌. 분석 후 사용자에게 보고.

---

## Task 6: 수동 브라우저 확인

- [ ] **Step 1: dev 서버 실행**

Run: `npm run dev`

(이미 dev 서버가 떠 있으면 그대로 사용)

- [ ] **Step 2: Stage 4 ready 화면 확인**

브라우저에서 게임 진입 → Stage 1/2/3 클리어 또는 디버그 모드로 Stage 4 도달 → ready 화면에서 다음 항목 시각적으로 확인:

- [ ] 상단: `4단계: 최종 시련` 타이틀 노출 (Stage 1/2/3와 동일한 폰트/크기)
- [ ] 중앙 왼쪽: 가로 3분할로 Stage 1 시계 / Stage 2 도서관 / Stage 3 예시 이미지 노출 (각각 33%씩, gap 8px)
- [ ] 중앙 오른쪽: 화살표 키 클러스터에서 `←` `↑` `→` 세 키 모두 빨간색 발광 (pulse 애니메이션 동작)
- [ ] 안내 문구: `3개 시련을 동시에 [←][↑][→] 키로 클리어하세요` 노출
- [ ] 하단: `GAME START` 흰색 버튼 + `ENTER 키를 눌러 시작` 깜빡 텍스트
- [ ] `GAME START` 버튼 클릭 시 게임 시작 (running phase 진입, 3분할 화면 노출)
- [ ] 처음 ready 화면으로 돌아가서 `Enter` 키 눌렀을 때도 동일하게 게임 시작
- [ ] `Space` 키 눌러도 게임 시작

- [ ] **Step 3: 다른 stage 회귀 확인**

- [ ] Stage 1 ready 화면 정상 (변경 없음 확인)
- [ ] Stage 2 ready 화면 정상
- [ ] Stage 3 ready 화면 정상
- [ ] Stage 4 게임 진행 후 점수 합산(merging) 화면 정상

---

## Task 7: 커밋

- [ ] **Step 1: 변경 파일 스테이지 및 커밋**

```bash
git add \
  src/stages/stage4/Stage4Intro.jsx \
  src/stages/stage4/Stage4Intro.css \
  src/stages/stage4/Stage4Host.jsx \
  src/stages/stage4/__tests__/Stage4Intro.test.jsx
git commit -m "feat: Stage 4 ready 화면을 Stage 1/2/3과 동일한 디자인으로 통일"
```

- [ ] **Step 2: 커밋 결과 확인**

Run: `git log -1 --stat`

Expected: 4개 파일 변경 (Stage4Intro.jsx, Stage4Intro.css, Stage4Host.jsx, Stage4Intro.test.jsx) 표시
