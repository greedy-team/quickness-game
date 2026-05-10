# Stage 4 병렬 진행 종료 처리 보완 — 설계

- 작성일: 2026-05-10
- 이슈: #33 (Stage_4_병렬_보완)
- 범위: Stage 4 분할 화면(Stage4Split) 좌측·중앙 pane의 종료 시각화

---

## 1. 배경

`Stage 4`는 좌(시계 게임) / 중(도서관 카메라 게임) / 우(낙하 캐치 게임)을 병렬로 진행하고
세 결과 metric의 평균으로 점프스케어 강도를 결정하는 최종 스테이지다.

현재 우측(`Stage3Game` mode="split")은 `mode="split"` 분기와 결과 처리가 정상이지만
좌측·중앙 pane에서 두 가지 시각 결함이 있다:

1. **좌측 pane (`Stage4TimerPane`)** — ArrowLeft로 종료 시 `onResult(metric)`만 즉시 호출하고
   화면에는 멈춘 시계만 남는다. 사용자에게 "끝났다"는 신호가 없어 안 끝난 것처럼 보인다.

2. **중앙 pane (`Stage2Placeholder` mode="split")** — 결과 모달
   `.final-message-overlay`가 `font-size: 3.5rem; letter-spacing: 8px;` 텍스트를 가지고 있어
   1/3 viewport 폭 pane(`max-width: 80%` ≈ 340px) 안에 들어오지 못하고
   글자가 박스 밖으로 흘러나와 인접 pane 영역까지 시각적으로 침범한다.

본 설계는 두 결함을 **표시 계층 한정 변경**으로 해결한다.
Stage4Host의 phase machine, 점수 산출 로직, 표준 모드(단독 플레이) UI는 일체 변경하지 않는다.

---

## 2. 비-목표

- `Stage4TimerPane`을 `Stage1Placeholder`로 통합 (브레인스토밍에서 옵션 2로 검토 후 기각)
- 결과 표시 지연시간(1.5s, 2s 등)을 외부 config로 노출
- merging 진입 직전 "모든 pane 결과 표시 동기화" 별도 제어 (split 컴포넌트가 mount 유지되므로 자연 동기화됨)
- `Stage1Placeholder` 표준 라우트(`/stage/1`) 결과 UI 수정

---

## 3. 아키텍처 개요

```
Stage4Host  ── results 수집 / merging 트리거 ── (변경 없음)
└─ Stage4Split (3 pane)
   ├─ Stage4TimerPane      [수정] phase + 결과 오버레이 추가
   ├─ Stage2Placeholder    [수정] split-mode 전용 CSS 추가
   └─ Stage3Game           (변경 없음)
```

원칙
- 각 sub-pane은 결과 UI를 자기 영역 안에서만 그린다 (영역 격리).
- onResult 호출 시점/계약은 그대로 유지 (Stage4Host의 평균 산출 로직 무영향).
- 표준 모드 CSS는 일체 변경하지 않는다 — split 전용 셀렉터로만 추가.

---

## 4. 변경 1 — Stage4TimerPane 결과 UI

### 4.1 상태 추가

`Stage4TimerPane.jsx`에 다음 state 추가:

| state | 값 | 비고 |
|---|---|---|
| `phase` | `'running' \| 'end'` | 신규. 초기값 `'running'`. |
| `finalTime` | number | ArrowLeft 누른 순간의 elapsed (sec). |
| `resultTier` | object | `pointsForError(error, STAGE1_CONFIG)`의 `tier`. |
| `resultScore` | number | `scoreFromMetric(1, metric)`. |

### 4.2 handleFinish 동작 변경

```
변경 전: handleFinish(time)
  - cancelAnimationFrame
  - error 계산 → metric 산출
  - onResult(metric) 즉시 호출

변경 후: handleFinish(time)
  - cancelAnimationFrame
  - error 계산 → tier, points, metric 산출
  - state 저장: finalTime, resultTier, resultScore = scoreFromMetric(1, metric)
  - phase = 'end'
  - setTimeout(() => onResult(metric), 1500ms)
  - timer ref 저장 → useEffect cleanup에서 clearTimeout
```

지연 1.5s 이유: 사용자가 결과를 한 박자 인지한 뒤 metric이 부모로 전달되도록.
다른 pane이 더 늦게 끝나도 결과 메시지는 split 컴포넌트가 mount 유지되는 동안 계속 보임.

### 4.3 키 입력 가드

ArrowLeft 키 핸들러에 `phase === 'running'` 가드 추가. `isRunning`만으로는 부족함
(부모는 phase가 'merging'이 되어도 `isRunning=false`로 prop이 전환되지만, race로 중복 호출 가능).

### 4.4 렌더링

`s4-timer-display`는 그대로 유지 (`phase === 'end'`일 때도 멈춘 시계가 보이도록).
`phase === 'end'`일 때 추가 오버레이 렌더:

```
<div className="s4-result-overlay">
  <p className="s4-result-tier">{TIER_COMMENT[resultTier.id]}</p>
  <p className="s4-result-time">MEASURED TIME: {formatTime(finalTime)}</p>
  <p className="s4-result-score">+{resultScore}점</p>
</div>
```

`TIER_COMMENT`는 `Stage1Placeholder.jsx`의 사전과 동일한 매핑을 `Stage4TimerPane.jsx`에 복제한다
(시계 게임 시멘틱이 동일하므로 같은 메시지 사용). 향후 통합 리팩터링 시 공통 모듈로 분리 가능
하지만 본 설계 범위 밖.

### 4.5 CSS (`Stage4TimerPane.css`)

`s4-timer-pane` 내부에 absolute 배치된 결과 오버레이.

| 클래스 | 주요 속성 |
|---|---|
| `.s4-result-overlay` | `position: absolute; bottom: 8%; left: 50%; transform: translateX(-50%); text-align: center; z-index: 10; padding: 12px 20px; background: rgba(0,0,0,0.6); border: 1px solid #444;` |
| `.s4-result-tier` | `font-size: 0.95rem; color: #ddd; margin-bottom: 8px;` |
| `.s4-result-time` | `font-family: 'Courier New', monospace; font-size: 1.1rem; color: #ffcc00; letter-spacing: 1px;` |
| `.s4-result-score` | `font-family: 'Courier New', monospace; font-size: 1.4rem; color: #ffcc00; font-weight: bold; margin-top: 6px;` |

폰트 크기 조정 기준: 좌측 pane 폭 1/3 viewport (≈430px @ 1280px viewport)에서 한 줄에 들어오는 크기.

### 4.6 정리(cleanup)

useEffect 두 곳 cleanup 명세:
- `cancelAnimationFrame(requestRef.current)` — 기존 동일.
- `clearTimeout(finishDelayRef.current)` — 신규. unmount 시 dangling onResult 호출 방지.

---

## 5. 변경 2 — Stage2Placeholder split-mode 모달 클리핑

### 5.1 변경 원칙

표준 모드 CSS는 **건드리지 않음**. 모두 `.stage2-wrapper.split-mode ...` 셀렉터 한정.

### 5.2 CSS 변경 (`Stage2Placeholder.css`)

기존 split-mode 룰 블록 끝에 다음 추가:

```css
/* split 모드: 결과 모달 pane 경계 내 클리핑 */
.stage2-wrapper.split-mode .stage2-ui-layer {
  padding: 8px;
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
/* "메인 화면으로 돌아갑니다..." 메시지는 split 모드에서 부정확(merging 대기)하므로 숨김 */
.stage2-wrapper.split-mode .final-message-overlay .start-btn {
  display: none;
}
```

`.start-btn`은 JSX 상 `.final-message-overlay` 자식이므로 자손 셀렉터 사용
(인접 셀렉터 `+`가 아님). 또한 JSX의 인라인 `style={{marginTop:'40px'}}`은
display:none 처리로 무영향.

### 5.3 검증 포인트

- 모달 외곽 right edge ≤ pane right edge (DevTools 측정).
- "EVIDENCE CAPTURED" / "LOST IN DARKNESS"가 박스 안에서 잘리지 않음 (한 줄 또는 정상 줄바꿈).
- `+점수`, reaction time, sub-msg 모두 잘리지 않음.
- 표준 모드(`/stage/2`)는 시각적으로 동일.

---

## 6. 데이터 흐름 (변경 없음 확인)

```
Stage4Host
  ├─ results: { 1: null, 2: null, 3: null }
  └─ subResultHandlers (useMemo, 안정 reference)
       │
Stage4Split
  ├─ pane-left  → Stage4TimerPane onResult={subResultHandlers[1]}
  ├─ pane-center→ Stage2Placeholder onResult={subResultHandlers[2]}
  └─ pane-right → Stage3Game onResult={subResultHandlers[3]}
       │
       ▼
Stage4Host useEffect: 3개 모두 채워지면 평균 산출 → phase='merging'
```

본 변경 후에도 metric 자체는 동일하게 1회만 부모에 전달된다 (1.5s 지연 추가일 뿐).
Stage4Host는 phase='merging' 진입 후에도 `Stage4Split`을 mount 유지하므로 결과 오버레이는 그대로 보인다.

---

## 7. 테스트 전략

### 7.1 단위 테스트 (vitest + @testing-library/react)

`src/stages/stage4/__tests__/Stage4TimerPane.test.jsx` 신규:

- ArrowLeft 입력 시 `s4-result-overlay` 가 렌더된다.
- ArrowLeft 입력 후 1500ms 경과 시 `onResult`가 정확히 1회 호출된다 (`vi.useFakeTimers`).
- ArrowLeft 입력 후 추가 ArrowLeft가 들어와도 `onResult`는 1회만 호출된다 (phase 가드).
- unmount 시 setTimeout이 정리되어 onResult가 호출되지 않는다.

`Stage2Placeholder` split-mode CSS는 단위 테스트 추가하지 않음 (CSS-only, 가성비 낮음).

### 7.2 수동/E2E 검증 (필수)

개발 서버 띄운 뒤 Playwright MCP로:
1. Stage 4 진입 → Space → 3 pane running 확인.
2. 좌측만 먼저 종료 (ArrowLeft) → 결과 오버레이 보이는지 + 다른 pane 계속 진행 + ArrowLeft 재입력 무시.
3. 중앙만 먼저 종료 (Up Arrow 셔터) → 모달이 pane 경계 안에 머무는지 스크린샷.
4. 3개 모두 완료 → merging → jumpscare → done 정상 진행, 평균 점수 정상.
5. 회귀 검증: `/stage/2` 단독 → 모달이 기존과 동일.

---

## 8. 리스크

| 리스크 | 가능성 | 대응 |
|---|---|---|
| `.final-message-overlay` 다른 곳 재사용 | 낮음 (grep으로 단독 사용 확인됨) | — |
| split 모드에서 "메인 화면으로 돌아갑니다…" 메시지가 부정확 | 확정 | split-mode에서 display:none으로 숨김 (5.2 참조) |
| `setTimeout` 클린업 누락으로 unmount 후 setState | 낮음 | `useRef` + `useEffect` cleanup 명시 |
| Stage4Host가 `isRunning=false`로 전환 후 ArrowLeft 들어오면? | 낮음 | `phase==='running'` 가드로 차단 |

---

## 9. 작업 산출물 요약

- `src/stages/stage4/Stage4TimerPane.jsx` — phase + 결과 state + 1.5s onResult 지연 + 키 가드
- `src/stages/stage4/Stage4TimerPane.css` — `.s4-result-overlay` 등 신규 스타일
- `src/stages/stage2/Stage2Placeholder.css` — split-mode 모달 스코프 룰 추가 (표준 모드 영향 없음)
- `src/stages/stage4/__tests__/Stage4TimerPane.test.jsx` — 신규 단위 테스트

표준 모드 라우트(`/stage/1`, `/stage/2`)와 우측 pane(`Stage3Game`), Stage4Host phase machine은 미변경.
