# 결과 모달 공통 컴포넌트 추출 — 설계

- 작성일: 2026-05-10
- 이슈: #33 (Stage_4_병렬_보완 후속)
- 범위: Stage 4 분할 화면(Stage4Split) 좌측·중앙 pane의 결과 모달을 공통 컴포넌트로 통합

---

## 1. 배경

직전 작업(`2026-05-10-stage4-parallel-finish-fix-design.md`) 결과로 Stage 4 좌측 pane(`Stage4TimerPane`)의 결과 오버레이와 중앙 pane(`Stage2Placeholder` split-mode)의 결과 모달은 동일한 표시 의도(tier 멘트 + 측정값 + 점수 + 풀-pane backdrop)를 갖지만 각자 다른 클래스명·CSS·약간 다른 구조로 구현되어 있다.

본 설계는 두 표시를 공통 React 컴포넌트 `<ResultModal>`로 추출해 시각·구조·유지보수의 일관성을 확보한다. 표준 모드 라우트(`/stage/1`, `/stage/2`)는 변경하지 않는다.

---

## 2. 비-목표

- Stage 1 standalone(`/stage/1`)의 `.result-overlay.immersive` 통합
- Stage 2 standalone(`/stage/2`)의 `.final-message-overlay` 통합
- 결과 표시 지연(1.5s, 2s)을 외부 config로 노출
- ResultModal 내부에 자동 dismiss / 타이밍 / onResult 호출 로직 추가 (lifecycle은 부모 책임)
- pane 컨테이너 추상화 (각 stage의 게임 로직 그대로 유지)

---

## 3. 아키텍처 개요

```
src/components/ResultModal/
  ├─ ResultModal.jsx     [신규] Stateless 표시 컴포넌트
  └─ ResultModal.css     [신규] backdrop + 모달 본체 스타일

src/stages/stage4/Stage4TimerPane.jsx  [수정] ResultModal 사용으로 교체
src/stages/stage4/Stage4TimerPane.css  [수정] 결과 오버레이용 룰 삭제
src/stages/stage2/Stage2Placeholder.jsx [수정] mode==='split' 분기에서 ResultModal 사용
src/stages/stage2/Stage2Placeholder.css [수정] split-mode 결과 모달 룰 삭제
```

원칙
- ResultModal은 props만으로 렌더하는 stateless 컴포넌트 (state·effect 없음).
- backdrop과 모달 본체는 ResultModal이 함께 렌더 (사용처는 단일 element만 삽입).
- 부모 pane wrapper는 `position: relative; overflow: hidden` 가정 — 두 pane 모두 충족.
- 표준 모드 CSS·JSX는 일체 변경하지 않는다.

---

## 4. 컴포넌트 인터페이스

### 4.1 Props

| prop | 타입 | 필수 | 용도 |
|---|---|---|---|
| `headline` | string | 선택 | 큰 제목 ("EVIDENCE CAPTURED" / "LOST IN DARKNESS"). 없으면 헤드라인 영역 미렌더. |
| `tierComment` | string | **필수** | tier별 멘트 (1~2줄). |
| `metricLabel` | string | 선택 | "MEASURED TIME", "REACTION TIME" 등. |
| `metricValue` | string \| node | 선택 | 측정값. JSX(예: 시계 포맷의 `<span>`) 받음. |
| `score` | number | **필수** | 점수. 컴포넌트가 `+{score}점` 포맷. |
| `tone` | `'success'` \| `'failed'` | 선택 | 헤드라인/score 색상 분기. default `'failed'`. |

### 4.2 tone 매핑 정책

부모가 결정해 prop으로 전달:
- Stage4TimerPane: `tone = resultTier.id === 'bare' ? 'failed' : 'success'`
- Stage2Placeholder split: `tone = (resultTier && resultTier.id !== 'bare') ? 'success' : 'failed'`

색상:
- `success`: 헤드라인 cyan-green `#00ffcc`, glow 동색
- `failed`:  헤드라인 red `#ff3333`, glow 동색
- score (양 톤 공통): yellow `#ffcc00`

### 4.3 metric 영역 표시 조건

`metricValue != null`일 때만 metric 영역 렌더. metric 영역 안에서 `metricLabel`이 있으면 라벨 prefix 출력, 없으면 값만.

### 4.4 렌더 구조

```jsx
<div className="result-modal-backdrop">
  <div className={`result-modal result-modal--${tone}`}>
    {headline && <h1 className="result-modal__headline">{headline}</h1>}
    <p className="result-modal__tier">{tierComment}</p>
    {metricValue != null && (
      <p className="result-modal__metric">
        {metricLabel && <span className="result-modal__metric-label">{metricLabel}: </span>}
        {metricValue}
      </p>
    )}
    <p className="result-modal__score">+{score}점</p>
  </div>
</div>
```

### 4.5 CSS (`ResultModal.css`)

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

---

## 5. 마이그레이션 — Stage4TimerPane

### 5.1 JSX 변경

기존 결과 오버레이 블록 삭제 후 ResultModal 사용:

```jsx
// 삭제
{phase === 'end' && resultTier && (
  <div className="s4-result-overlay">
    <p className="s4-result-tier">{TIER_COMMENT[resultTier.id]}</p>
    <p className="s4-result-time">MEASURED TIME: {formatTime(finalTime)}</p>
    <p className="s4-result-score">+{resultScore}점</p>
  </div>
)}

// 교체
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

import 추가: `import ResultModal from '../../components/ResultModal/ResultModal.jsx';`

### 5.2 CSS 변경 (`Stage4TimerPane.css`)

다음 룰 삭제:
- `.s4-timer-pane:has(.s4-result-overlay)::before`
- `.s4-result-overlay`
- `.s4-result-tier`
- `.s4-result-time`
- `.s4-result-time .s4-hour-min`
- `.s4-result-score`

`.s4-hour-min`은 시계 표시(`.s4-timer-display` 안)에서도 사용되므로 **유지**. ResultModal `metricValue`로 들어가는 `<span className="s4-hour-min">11:59:</span>`는 외부 정의 룰을 그대로 상속 받아 동작.

---

## 6. 마이그레이션 — Stage2Placeholder

### 6.1 JSX 변경 — mode 분기

`Stage2Placeholder`는 standalone과 split 양쪽에서 동작. standalone은 미변경이므로 END 블록을 mode 분기로 감쌈:

```jsx
{phase === 'END' && (
  mode === 'split' ? (
    <ResultModal
      headline={resultTier && resultTier.id !== 'bare' ? "EVIDENCE CAPTURED" : "LOST IN DARKNESS"}
      tierComment={reaction.comment}
      metricLabel={reaction.time ? "REACTION TIME" : null}
      metricValue={reaction.time ? `${reaction.time}s` : null}
      score={resultScore}
      tone={resultTier && resultTier.id !== 'bare' ? 'success' : 'failed'}
    />
  ) : (
    <div className="final-message-overlay">
      <div className={resultTier && resultTier.id !== 'bare' ? 'msg-success' : 'msg-failed'}>
        <h1 className="main-msg">{resultTier && resultTier.id !== 'bare' ? "EVIDENCE CAPTURED" : "LOST IN DARKNESS"}</h1>
        <p className="sub-msg">{reaction.comment}</p>
        {reaction.time && <p className="reaction-time">REACTION TIME: {reaction.time}s</p>}
        <p className="result-score">+{resultScore}점</p>
      </div>
      <p className="start-btn" style={{ marginTop: '40px' }}>메인 화면으로 돌아갑니다...</p>
    </div>
  )
)}
```

import 추가: `import ResultModal from '../../components/ResultModal/ResultModal.jsx';`

### 6.2 CSS 변경 (`Stage2Placeholder.css`)

다음 룰 삭제 (직전 작업에서 추가했던 split-mode 결과 모달 관련 룰 전체):
- `.stage2-wrapper.split-mode .stage2-ui-layer:has(.final-message-overlay)`
- `.stage2-wrapper.split-mode .final-message-overlay`
- `.stage2-wrapper.split-mode .main-msg`
- `.stage2-wrapper.split-mode .sub-msg`
- `.stage2-wrapper.split-mode .reaction-time`
- `.stage2-wrapper.split-mode .result-score`
- `.stage2-wrapper.split-mode .final-message-overlay .start-btn`

(주: `.stage2-wrapper.split-mode .stage2-ui-layer { padding: 8px; box-sizing: border-box; }`는 파일 상단의 별도 룰로 모달 외 다른 자식에도 영향 가능 — 이 룰은 **유지**. ResultModal은 `.stage2-ui-layer` 자식이 아니라 `.stage2-wrapper`의 직접 자식으로 들어가므로(아래 6.3 참조) padding 영향 받지 않음.)

표준 모드용 룰(`.final-message-overlay`, `.main-msg`, `.sub-msg`, `.reaction-time`, `.result-score`, `.msg-success`, `.msg-failed`)은 모두 유지.

### 6.3 ResultModal의 위치

기존 `.final-message-overlay`는 `.stage2-ui-layer` 안에 있음. ResultModal은 자체 backdrop을 가지므로 `.stage2-ui-layer` 안에 둘 필요 없고, 충돌 회피를 위해 `.stage2-ui-layer` **밖**, `.stage2-wrapper`의 직접 자식으로 둠.

```jsx
return (
  <div className={`stage2-wrapper ${isShaking ? 'screen-shake' : ''} ${mode === 'split' ? 'split-mode' : ''}`}>
    <div className="stage2-content" ... />
    <div className="camera-viewfinder" />
    <div className="attack-flash-overlay ..." />
    <div className="camera-flash ..." />
    <div className="stage2-ui-layer">
      {phase === 'MANUAL' && (...)}
      {phase === 'PLAY' && (...)}
      {phase === 'END' && mode !== 'split' && (
        // 기존 standalone 결과 (유지)
        <div className="final-message-overlay">...</div>
      )}
    </div>
    {phase === 'END' && mode === 'split' && (
      <ResultModal ... />
    )}
  </div>
);
```

`.stage2-wrapper`는 `position: relative; overflow: hidden`이라 ResultModal의 `.result-modal-backdrop`(`position: absolute; inset: 0`)이 wrapper 영역(=pane) 전체를 덮음.

---

## 7. 데이터 흐름 (변경 없음 확인)

ResultModal은 stateless이므로 phase 전이·setTimeout·onResult 호출은 전부 부모(Stage4TimerPane / Stage2Placeholder)가 그대로 보유. Stage4Host의 결과 수집·평균 산출·merging 진입 로직 무영향.

---

## 8. 테스트 전략

### 8.1 단위 테스트 (vitest + @testing-library/react)

`src/components/ResultModal/__tests__/ResultModal.test.jsx` 신규:

| 케이스 | 검증 |
|---|---|
| headline 미지정 | `result-modal__headline` 미렌더 |
| headline + tierComment + score | 셋 다 렌더 |
| metricLabel + metricValue 둘 다 있음 | `metric-label` + 값 렌더 |
| metricLabel만 있음 (value 없음) | metric 영역 미렌더 |
| metricValue가 JSX (`<span>...</span>{rest}`) | 그대로 렌더 |
| tone='success' | `result-modal--success` 클래스 |
| tone='failed' | `result-modal--failed` 클래스 |
| tone 미지정 | default `'failed'` 클래스 |

### 8.2 회귀 — Stage4TimerPane 기존 테스트

직전 작업에서 추가된 4개 테스트는 ResultModal 도입 후에도 통과해야 함:
- `MEASURED TIME` 텍스트 어서션 — ResultModal의 `result-modal__metric-label` 안에서 검출됨 (텍스트 매칭만 하므로 OK)
- `+\d+점` — `result-modal__score`에서 검출
- 도플갱어/타이밍/정각 키워드 — `result-modal__tier`에서 검출
- 1500ms 후 onResult 1회 호출 / unmount cleanup — 부모 로직 유지로 동일

### 8.3 수동/E2E 검증

`npm run dev` → Stage 4 진입 → Space:
1. 좌측만 종료 (ArrowLeft) → ResultModal 등장. 모달 박스 안에 헤드라인 없음, tier 멘트 + MEASURED TIME + +점수.
2. 중앙만 종료 (ArrowUp 셔터 또는 timeout) → ResultModal 등장. headline "EVIDENCE CAPTURED" 또는 "LOST IN DARKNESS" + 멘트 + REACTION TIME(있을 때만) + +점수. 박스 외부 backdrop은 검정.
3. 두 모달의 외형(폰트 크기, 색상, 정렬)이 동일한지 시각 확인.
4. 표준 모드 회귀 — `/stage/2` 셔터/timeout 결과 — 기존 `.final-message-overlay` 그대로 표시, "메인 화면으로 돌아갑니다…" 보임.
5. `/stage/1` 진입 후 종료 — 기존 `.result-overlay.immersive` 영향 없음.

---

## 9. 리스크

| 리스크 | 가능성 | 대응 |
|---|---|---|
| `metricValue`로 JSX 전달 시 ResultModal이 string 외 받지 못함 | 낮음 | `{metricValue}`로 그대로 렌더 — React가 string·node 모두 처리 |
| Stage 2 split 분기로 JSX 복잡도 증가 | 낮음 | mode 분기 1단계 ternary, 가독성 양호 |
| `.stage2-wrapper` 직속 자식으로 ResultModal 두면서 z-index 경합 | 낮음 | `.result-modal-backdrop` z-index 200 = 기존 `.stage2-ui-layer`와 동일. 둘이 겹치는 phase는 END뿐이고 그때 stage2-ui-layer는 이전엔 결과 모달이 있었지만 이제는 모달이 wrapper 직속이라 z-index 경합 의미 없음 |
| ResultModal 신규 의존 — Stage4TimerPane 기존 테스트가 import 경로 변경에 영향 | 낮음 | 테스트는 컴포넌트 외부에서 텍스트만 검사. import 추가는 무영향 |

---

## 10. 작업 산출물 요약

- `src/components/ResultModal/ResultModal.jsx` (신규)
- `src/components/ResultModal/ResultModal.css` (신규)
- `src/components/ResultModal/__tests__/ResultModal.test.jsx` (신규)
- `src/stages/stage4/Stage4TimerPane.jsx` (수정 — JSX 결과 블록 교체 + import 추가)
- `src/stages/stage4/Stage4TimerPane.css` (수정 — 결과 오버레이용 룰 6개 삭제)
- `src/stages/stage2/Stage2Placeholder.jsx` (수정 — END phase mode 분기 + import 추가)
- `src/stages/stage2/Stage2Placeholder.css` (수정 — split-mode 결과 모달 룰 7개 삭제)

표준 모드 라우트(`/stage/1`, `/stage/2`), 우측 pane(`Stage3Game`), Stage4Host phase machine, 점수 산출 로직 모두 미변경.
