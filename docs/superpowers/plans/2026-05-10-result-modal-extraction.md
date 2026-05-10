# 결과 모달 공통 컴포넌트 추출 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stage 4 분할 화면 좌측·중앙 pane의 결과 모달을 stateless `<ResultModal>` 컴포넌트로 통합해 시각·구조의 일관성과 재사용성을 확보한다.

**Architecture:** `src/components/ResultModal/`에 stateless presentational 컴포넌트(헤드라인·tier 멘트·metric·점수 + 풀-pane backdrop)를 신설. Stage4TimerPane은 단방향 교체, Stage2Placeholder는 mode 분기로 split일 때만 ResultModal 사용. standalone 라우트는 미변경.

**Tech Stack:** React 19, vitest 2, jsdom, @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-05-10-result-modal-extraction-design.md`

---

## File Map

**Create:**
- `src/components/ResultModal/ResultModal.jsx` — stateless presentation
- `src/components/ResultModal/ResultModal.css` — backdrop + modal 스타일
- `src/components/ResultModal/__tests__/ResultModal.test.jsx` — 단위 테스트

**Modify:**
- `src/stages/stage4/Stage4TimerPane.jsx` — 결과 JSX 블록을 ResultModal 호출로 교체 + import
- `src/stages/stage4/Stage4TimerPane.css` — 결과 오버레이용 6개 룰 삭제
- `src/stages/stage2/Stage2Placeholder.jsx` — END phase에 mode 분기 + import
- `src/stages/stage2/Stage2Placeholder.css` — split-mode 결과 모달 7개 룰 삭제

**Test:**
- `src/components/ResultModal/__tests__/ResultModal.test.jsx`
- (회귀) `src/stages/stage4/__tests__/Stage4TimerPane.test.jsx` — 변경 없음, 통과 확인

---

## Task 1: ResultModal 컴포넌트 + CSS + 단위 테스트 (TDD)

**Files:**
- Create: `src/components/ResultModal/ResultModal.jsx`
- Create: `src/components/ResultModal/ResultModal.css`
- Create: `src/components/ResultModal/__tests__/ResultModal.test.jsx`

- [ ] **Step 1: Failing test 작성**

Create `src/components/ResultModal/__tests__/ResultModal.test.jsx`:
```jsx
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ResultModal from '../ResultModal.jsx';

describe('ResultModal', () => {
  afterEach(() => {
    cleanup();
  });

  it('필수 props(tierComment, score)만으로 렌더된다', () => {
    render(<ResultModal tierComment="멘트" score={120} />);
    expect(screen.getByText('멘트')).toBeInTheDocument();
    expect(screen.getByText('+120점')).toBeInTheDocument();
  });

  it('headline 미지정 시 헤드라인 영역이 렌더되지 않는다', () => {
    const { container } = render(<ResultModal tierComment="멘트" score={50} />);
    expect(container.querySelector('.result-modal__headline')).toBeNull();
  });

  it('headline 지정 시 헤드라인이 렌더된다', () => {
    render(<ResultModal headline="LOST IN DARKNESS" tierComment="멘트" score={50} />);
    expect(screen.getByText('LOST IN DARKNESS')).toBeInTheDocument();
  });

  it('metricLabel + metricValue 모두 있으면 metric 영역이 렌더된다', () => {
    render(
      <ResultModal
        tierComment="멘트"
        metricLabel="REACTION TIME"
        metricValue="0.523s"
        score={100}
      />,
    );
    expect(screen.getByText(/REACTION TIME/)).toBeInTheDocument();
    expect(screen.getByText(/0\.523s/)).toBeInTheDocument();
  });

  it('metricValue 없으면 metric 영역이 미렌더', () => {
    const { container } = render(
      <ResultModal tierComment="멘트" metricLabel="REACTION TIME" score={100} />,
    );
    expect(container.querySelector('.result-modal__metric')).toBeNull();
  });

  it('metricValue가 JSX(node)일 때도 그대로 렌더된다', () => {
    render(
      <ResultModal
        tierComment="멘트"
        metricLabel="MEASURED TIME"
        metricValue={<span data-testid="custom-metric">12:00:01.50</span>}
        score={200}
      />,
    );
    expect(screen.getByTestId('custom-metric')).toBeInTheDocument();
  });

  it("tone='success'일 때 result-modal--success 클래스 적용", () => {
    const { container } = render(
      <ResultModal tierComment="멘트" score={100} tone="success" />,
    );
    expect(container.querySelector('.result-modal--success')).not.toBeNull();
  });

  it("tone='failed'일 때 result-modal--failed 클래스 적용", () => {
    const { container } = render(
      <ResultModal tierComment="멘트" score={100} tone="failed" />,
    );
    expect(container.querySelector('.result-modal--failed')).not.toBeNull();
  });

  it('tone 미지정 시 default failed 클래스 적용', () => {
    const { container } = render(<ResultModal tierComment="멘트" score={100} />);
    expect(container.querySelector('.result-modal--failed')).not.toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test:run -- ResultModal`

Expected: FAIL — 컴포넌트 미존재.

- [ ] **Step 3: ResultModal.jsx 작성**

Create `src/components/ResultModal/ResultModal.jsx`:
```jsx
import React from 'react';
import './ResultModal.css';

export default function ResultModal({
  headline,
  tierComment,
  metricLabel,
  metricValue,
  score,
  tone = 'failed',
}) {
  return (
    <div className="result-modal-backdrop">
      <div className={`result-modal result-modal--${tone}`}>
        {headline && <h1 className="result-modal__headline">{headline}</h1>}
        <p className="result-modal__tier">{tierComment}</p>
        {metricValue != null && (
          <p className="result-modal__metric">
            {metricLabel && (
              <span className="result-modal__metric-label">{metricLabel}: </span>
            )}
            {metricValue}
          </p>
        )}
        <p className="result-modal__score">+{score}점</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: ResultModal.css 작성**

Create `src/components/ResultModal/ResultModal.css`:
```css
.result-modal-backdrop {
  position: absolute;
  inset: 0;
  background: #000;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
  padding: 16px;
  box-sizing: border-box;
}

.result-modal {
  max-width: calc(100% - 16px);
  padding: 22px 28px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid #444;
  text-align: center;
  box-sizing: border-box;
  overflow: hidden;
  color: #fff;
}

.result-modal__headline {
  font-size: 1.7rem;
  letter-spacing: 3px;
  margin: 0 0 14px 0;
  word-break: keep-all;
}
.result-modal--success .result-modal__headline {
  color: #00ffcc;
  text-shadow: 0 0 20px #00ffcc;
}
.result-modal--failed .result-modal__headline {
  color: #ff3333;
  text-shadow: 0 0 20px #ff3333;
}

.result-modal__tier {
  font-size: 1.35rem;
  color: #ddd;
  margin: 0;
  word-break: keep-all;
  line-height: 1.4;
}

.result-modal__metric {
  font-family: 'Courier New', Courier, monospace;
  font-size: 1.6rem;
  color: #ffcc00;
  letter-spacing: 1px;
  margin: 14px 0 0 0;
}

.result-modal__score {
  font-family: 'Courier New', Courier, monospace;
  font-size: 2.2rem;
  color: #ffcc00;
  font-weight: bold;
  margin: 10px 0 0 0;
  text-shadow: 0 0 12px rgba(255, 204, 0, 0.6);
  letter-spacing: 2px;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm run test:run -- ResultModal`

Expected: 9 tests PASS.

- [ ] **Step 6: 전체 회귀 확인**

Run: `npm run test:run`

Expected: 모든 기존 테스트 + 신규 9개 PASS (총 50 tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/ResultModal/ResultModal.jsx src/components/ResultModal/ResultModal.css src/components/ResultModal/__tests__/ResultModal.test.jsx
git commit -m "feat : ResultModal 공통 컴포넌트 추가 + 단위 테스트 #33"
```

---

## Task 2: Stage4TimerPane을 ResultModal로 교체

**Files:**
- Modify: `src/stages/stage4/Stage4TimerPane.jsx`
- Modify: `src/stages/stage4/Stage4TimerPane.css`

- [ ] **Step 1: Stage4TimerPane.jsx 수정 — import 추가 + JSX 교체**

`src/stages/stage4/Stage4TimerPane.jsx`의 import 블록 끝에 다음 라인 추가:
```jsx
import ResultModal from '../../components/ResultModal/ResultModal.jsx';
```

return 안의 결과 오버레이 블록을 다음으로 교체:
```jsx
{phase === 'end' && resultTier && (
  <ResultModal
    tierComment={TIER_COMMENT[resultTier.id]}
    metricLabel="MEASURED TIME"
    metricValue={formatTime(finalTime)}
    score={resultScore}
    tone={resultTier.id === 'bare' ? 'failed' : 'success'}
  />
)}
```

(교체 대상: `<div className="s4-result-overlay">...</div>` 전체 블록.)

- [ ] **Step 2: Stage4TimerPane.css 수정 — 결과 오버레이 룰 삭제**

다음 룰을 모두 삭제:
- `.s4-timer-pane:has(.s4-result-overlay)::before { ... }`
- `.s4-result-overlay { ... }`
- `.s4-result-tier { ... }`
- `.s4-result-time { ... }`
- `.s4-result-time .s4-hour-min { ... }`
- `.s4-result-score { ... }`

다음 룰은 **유지** (시계 표시에서 사용):
- `.s4-hour-min { ... }` (`.s4-timer-display` 안의 시간 단위 스타일)
- 그 외 모든 기존 룰 (`.s4-timer-pane`, `.s4-timer-bg`, `.s4-timer-content`, `.s4-timer-display`, flicker/off, keyframes)

삭제 후 파일 끝의 `/* ── 결과 오버레이 (병렬 모드 종료 후 결과 표시) ── */` 주석도 같이 제거.

- [ ] **Step 3: 회귀 테스트**

Run: `npm run test:run -- Stage4TimerPane`

Expected: 4 tests PASS — 기존 테스트가 ResultModal 출력의 텍스트(`MEASURED TIME`, `+\d+점`, `도플갱어|타이밍|정각`)를 그대로 검출하므로 통과해야 함.

만약 FAIL이라면 ResultModal의 클래스/구조가 spec과 다른지 확인.

- [ ] **Step 4: 전체 회귀**

Run: `npm run test:run`

Expected: 모든 테스트 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stages/stage4/Stage4TimerPane.jsx src/stages/stage4/Stage4TimerPane.css
git commit -m "refactor : Stage4TimerPane 결과 표시를 ResultModal로 교체 #33"
```

---

## Task 3: Stage2Placeholder split 분기를 ResultModal로 교체

**Files:**
- Modify: `src/stages/stage2/Stage2Placeholder.jsx`
- Modify: `src/stages/stage2/Stage2Placeholder.css`

- [ ] **Step 1: Stage2Placeholder.jsx 수정 — import 추가**

`src/stages/stage2/Stage2Placeholder.jsx`의 import 블록(파일 상단) 끝에 추가:
```jsx
import ResultModal from '../../components/ResultModal/ResultModal.jsx';
```

- [ ] **Step 2: Stage2Placeholder.jsx 수정 — END phase 블록 mode 분기**

return 안의 END phase 블록을 다음으로 교체:

기존:
```jsx
{phase === 'END' && (
  <div className="final-message-overlay">
    <div className={resultTier && resultTier.id !== 'bare' ? 'msg-success' : 'msg-failed'}>
      <h1 className="main-msg">{resultTier && resultTier.id !== 'bare' ? "EVIDENCE CAPTURED" : "LOST IN DARKNESS"}</h1>
      <p className="sub-msg">{reaction.comment}</p>
      {reaction.time && <p className="reaction-time">REACTION TIME: {reaction.time}s</p>}
      <p className="result-score">+{resultScore}점</p>
    </div>
    <p className="start-btn" style={{ marginTop: '40px' }}>메인 화면으로 돌아갑니다...</p>
  </div>
)}
```

교체:
```jsx
{phase === 'END' && mode !== 'split' && (
  <div className="final-message-overlay">
    <div className={resultTier && resultTier.id !== 'bare' ? 'msg-success' : 'msg-failed'}>
      <h1 className="main-msg">{resultTier && resultTier.id !== 'bare' ? "EVIDENCE CAPTURED" : "LOST IN DARKNESS"}</h1>
      <p className="sub-msg">{reaction.comment}</p>
      {reaction.time && <p className="reaction-time">REACTION TIME: {reaction.time}s</p>}
      <p className="result-score">+{resultScore}점</p>
    </div>
    <p className="start-btn" style={{ marginTop: '40px' }}>메인 화면으로 돌아갑니다...</p>
  </div>
)}
```

(즉 `phase === 'END'` 조건을 `phase === 'END' && mode !== 'split'`로 변경.)

- [ ] **Step 3: Stage2Placeholder.jsx 수정 — split 분기에 ResultModal 추가**

`.stage2-ui-layer` div의 닫는 태그 **다음**, `.stage2-wrapper` div 닫기 **이전**에 추가 (즉 ResultModal은 stage2-ui-layer 밖, stage2-wrapper의 직접 자식):

```jsx
      </div>{/* end stage2-ui-layer */}

      {phase === 'END' && mode === 'split' && (
        <ResultModal
          headline={resultTier && resultTier.id !== 'bare' ? 'EVIDENCE CAPTURED' : 'LOST IN DARKNESS'}
          tierComment={reaction.comment}
          metricLabel={reaction.time ? 'REACTION TIME' : null}
          metricValue={reaction.time ? `${reaction.time}s` : null}
          score={resultScore}
          tone={resultTier && resultTier.id !== 'bare' ? 'success' : 'failed'}
        />
      )}
    </div>{/* end stage2-wrapper */}
```

(주: 코드 안의 주석은 plan 설명용. 실제 코드에 주석 추가 불필요.)

- [ ] **Step 4: Stage2Placeholder.css 수정 — split-mode 결과 모달 룰 삭제**

다음 룰들을 **모두 삭제**:
- `.stage2-wrapper.split-mode .stage2-ui-layer:has(.final-message-overlay) { ... }` (backdrop)
- `.stage2-wrapper.split-mode .final-message-overlay { ... }` (사이즈/클리핑)
- `.stage2-wrapper.split-mode .main-msg { ... }`
- `.stage2-wrapper.split-mode .sub-msg { ... }`
- `.stage2-wrapper.split-mode .reaction-time { ... }`
- `.stage2-wrapper.split-mode .result-score { ... }`
- `.stage2-wrapper.split-mode .final-message-overlay .start-btn { ... }`

위 룰 위쪽 주석 `/* ── split 모드: 결과 모달이 ... ── */`, `/* 결과 모달이 떠 있을 때 ... */`, `/* "메인 화면으로 돌아갑니다…" ... */` 도 모두 같이 삭제.

다음 룰들은 **유지** (다른 phase의 split 모드 표시):
- `.stage2-wrapper.split-mode .stage2-content { ... }`
- `.stage2-wrapper.split-mode .camera-hud { ... }`
- `.stage2-wrapper.split-mode .hud-top { ... }`
- `.stage2-wrapper.split-mode .camera-viewfinder { ... }`
- `.stage2-wrapper.split-mode .rec-info { ... }`
- `.stage2-wrapper.split-mode .battery-body { ... }`
- `.stage2-wrapper.split-mode .start-btn-simple { ... }`
- `.stage2-wrapper.split-mode .stage2-ui-layer { padding: 8px; box-sizing: border-box; }` (PLAY phase HUD에 영향 없으나 무해, 향후 정리는 별도 작업)

표준 모드용 모든 룰(`.final-message-overlay`, `.main-msg`, `.sub-msg`, `.reaction-time`, `.result-score`, `.msg-success`, `.msg-failed`, `.start-btn` 등)도 유지.

- [ ] **Step 5: 회귀 테스트**

Run: `npm run test:run`

Expected: 모든 테스트 PASS (Stage4TimerPane 4개 + ResultModal 9개 + 기존 로직 37개 = 50 tests).

- [ ] **Step 6: Commit**

```bash
git add src/stages/stage2/Stage2Placeholder.jsx src/stages/stage2/Stage2Placeholder.css
git commit -m "refactor : Stage2Placeholder split 결과 모달을 ResultModal로 교체 #33"
```

---

## Task 4: 수동/E2E 검증 (Playwright 또는 직접 브라우저)

이 task는 코드 변경 없음. 시각·기능 회귀 확인.

**Prereq:** `npm run dev`로 개발 서버 실행.

- [ ] **Step 1: Stage 4 좌측 pane 결과 모달 확인**

URL: `http://localhost:5173/stage/4` → Space → ArrowLeft.

Expected:
- 좌측 pane 전체가 검정 backdrop으로 덮임
- 중앙에 모달 박스 (rgba(0,0,0,0.6) + #444 border)
- tier 멘트 (`도플갱어/타이밍/정각` 중 하나) 표시
- "MEASURED TIME: <시계 포맷>" 표시 — `<span class="s4-hour-min">` 부분이 작은 글씨로 정상 렌더
- "+<점수>점" 표시
- 좌측 pane 외에는 영향 없음 (중앙·우측 pane 계속 진행)

- [ ] **Step 2: Stage 4 중앙 pane 결과 모달 확인**

좌측 종료 후 중앙 pane이 자동 진행. ArrowUp(셔터) 누르거나 timeout으로 종료.

Expected:
- 중앙 pane 전체가 검정 backdrop으로 덮임
- 모달 박스 안에 큰 헤드라인 ("EVIDENCE CAPTURED" 또는 "LOST IN DARKNESS")
- 헤드라인 색상: 성공 cyan-green / 실패 red
- tier 멘트 (`reaction.comment`)
- "REACTION TIME: <초>s" — 단, 셔터 실패(fake)로 reaction.time 없을 때는 metric 영역 미표시
- "+<점수>점"
- "메인 화면으로 돌아갑니다…" 문구 보이지 **않음**
- 모달이 pane 경계 밖으로 새지 않음

- [ ] **Step 3: 두 pane 모달 시각 일관성 확인**

Stage 4 좌측·중앙 모달의 폰트 크기·색상·정렬·여백이 동일한 디자인 시스템처럼 보이는지 비교.

스크린샷 권장.

- [ ] **Step 4: Stage 3 정상 진행 + merging/jumpscare 확인**

3 pane 모두 종료 → merging(4초) → jumpscare(2초) → done → /ending 라우트 이동.

Expected: 평소대로 정상 진행. 점수 평균 계산 정상.

- [ ] **Step 5: 표준 모드 회귀 — Stage 2**

URL: `http://localhost:5173/stage/2` → Space → 셔터 또는 timeout.

Expected:
- 기존 `.final-message-overlay` 그대로 표시 (큰 글씨 `letter-spacing: 8px`, 박스 border)
- "메인 화면으로 돌아갑니다…" 표시
- ResultModal 영향 0

- [ ] **Step 6: 표준 모드 회귀 — Stage 1**

URL: `http://localhost:5173/stage/1` → Space → ArrowLeft.

Expected:
- 기존 `.result-overlay.immersive` 그대로 (full-screen 검정, 큰 시계 표시, 진행바)
- ResultModal 영향 0

- [ ] **Step 7: 모든 시나리오 통과 시 push**

```bash
git log --oneline origin/HEAD..HEAD
```

Expected: Task 1~3의 3개 커밋이 보임.

```bash
git push
```

(만약 시각/동작 문제 발견 시 해당 task로 돌아가 수정 → 재커밋 → 본 검증 다시.)

---

## Self-Review Note

**Spec coverage:**
- §1 배경 / §2 비-목표 — Task 범위 그대로.
- §3 아키텍처 — Task 1이 컴포넌트 신설, Task 2/3이 마이그레이션.
- §4 컴포넌트 인터페이스 (props·tone·렌더 구조·CSS) — Task 1에서 1:1 반영.
- §5 Stage4TimerPane 마이그레이션 — Task 2.
- §6 Stage2Placeholder 마이그레이션 (mode 분기·ResultModal 위치·CSS 삭제 목록) — Task 3.
- §7 데이터 흐름 무영향 — 자동 만족 (lifecycle 코드 미변경).
- §8 테스트 전략 (단위 8개·회귀·수동) — Task 1(테스트 작성), Task 2/3(회귀), Task 4(수동).
- §9 리스크 — 모두 plan에 반영.

**Placeholder scan:** 없음. 모든 step에 실제 코드/명령/기대 결과 포함.

**Type/이름 일관성:** `result-modal__headline`, `result-modal__tier`, `result-modal__metric`, `result-modal__metric-label`, `result-modal__score`, `result-modal--success`, `result-modal--failed`, `result-modal-backdrop` — Task 1 정의 그대로 Task 2/3에서 사용 (Task 2/3은 클래스 직접 참조 안 하지만 backdrop 동작은 의존).

수정사항 없음. 실행 가능 상태.
