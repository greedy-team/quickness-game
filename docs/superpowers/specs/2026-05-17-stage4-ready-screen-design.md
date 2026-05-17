# Stage 4 Ready 화면 디자인 통일

- **작성일:** 2026-05-17
- **대상 파일:** `src/stages/stage4/Stage4Intro.jsx`, `src/stages/stage4/Stage4Intro.css`, `src/stages/stage4/Stage4Host.jsx`

## 1. 배경 / 목적

Stage 1, 2, 3의 `phase === 'ready'` 화면은 `stage-info-screen` 패턴(top: 타이틀 / middle: 프리뷰 이미지 + 키 안내 / bottom: GAME START 버튼)으로 통일되어 있다.

Stage 4 (`Stage4Intro`)만 어둡게 깔린 풀스크린 모달 형태로 다른 디자인을 사용한다.

이번 작업의 목적은 Stage 4 ready 화면도 Stage 1~3과 동일한 `stage-info-screen` 패턴으로 통일하는 것이다.

## 2. 비-목표 (Non-Goals)

- Stage 1/2/3의 ready 화면 변경
- `stage-info-screen` 관련 클래스의 공통 CSS 추출 (현재 Stage 1/2/3가 각자 자기 CSS에 동일 클래스 이름을 재정의하는 패턴 유지)
- Stage 4의 phase 흐름 (`intro → running → waitingForMerge → merging → done`) 변경
- BGM / Split / Merge / 점수 합산 로직 변경
- Stage 4의 가중치 안내 ("⚡ 최대 100점, 3개 시련 점수의 합") 노출 — 이번 스코프에서는 제외

## 3. 사용자 결정 사항 (브레인스토밍 결과)

1. **프리뷰 이미지:** 각 sub-stage 예시 이미지를 가로 3분할로 한 줄에 배치 (단일 합성 이미지가 아니라 `<img>` 3장을 flex 레이아웃으로)
2. **화살표 키 표시:** `←` `↑` `→` 세 키 모두 active 상태로 발광
3. **제목 / 안내 문구:** 포맷은 다른 스테이지와 동일 (`4단계: 최종 시련`), 메인 안내는 "3개 시련을 동시에 [←][↑][→] 키로 클리어하세요"

## 4. 컴포넌트 설계

### 4.1 `Stage4Intro.jsx` (재작성)

```jsx
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
          <img src="/assets/images/bg_stage3_example.png"     alt="Stage 3 Preview" />
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

**변경 요약:**
- 기존 `Stage4Intro` 마크업 (`stage4-intro__title`, `stage4-intro__panes`, `stage4-intro__weight`, `stage4-intro__cta`) 전부 제거
- 마크업 구조를 Stage 1/2/3 `stage-info-screen` 패턴과 일치시킴
- `onStart` prop 신규 추가 — 마우스 클릭 시작 지원 (Stage3Intro와 동일 패턴)

### 4.2 `Stage4Intro.css` (재작성)

`Stage1Placeholder.css`의 ready 화면 영역(라인 17~120 근처: `.stage-info-screen`부터 `.sub-instruction-text`까지)을 베이스로 복제하고 Stage 4 전용 차이만 추가:

```css
/* Stage 1 ready 영역 복제 — .stage-info-screen, .info-top-section, .stage-title,
   .info-middle-section, .simple-preview-image, .instruction-item, .arrow-keys-cluster,
   .arrow-row, .key-cap, .main-instruction-text, .highlight-key, .info-bottom-section,
   .key-icon-wrapper.start-btn (+ :hover), .sub-instruction-text */

/* === Stage 4 전용 추가 === */

/* 3분할 프리뷰 이미지 */
.stage4-preview-triptych {
  display: flex;
  gap: 8px;
  padding: 0;
  /* .simple-preview-image의 max-width/border-radius/box-shadow는 그대로 상속 */
}
.stage4-preview-triptych img {
  flex: 1 1 0;
  min-width: 0;
  width: 33.3%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

/* 세 키 모두 발광 — Stage 1은 left만, Stage 2는 top만, Stage 3은 right만 정의했음 */
.key-cap.left-active,
.key-cap.top-active,
.key-cap.right-active {
  /* Stage 1의 .key-cap.left-active와 동일한 발광 스타일 */
}
```

**제거할 스타일:** 기존 `.stage4-intro`, `.stage4-intro__title`, `.stage4-intro__subtitle`, `.stage4-intro__panes`, `.stage4-intro__pane`, `.stage4-intro__key`, `.stage4-intro__pane-title`, `.stage4-intro__pane-subtitle`, `.stage4-intro__weight`, `.stage4-intro__weight-boost`, `.stage4-intro__cta`, `@keyframes stage4-intro-pulse`

### 4.3 `Stage4Host.jsx` (1줄 수정)

```jsx
// before
{phase === 'intro' && <Stage4Intro />}

// after
{phase === 'intro' && <Stage4Intro onStart={() => setPhase('running')} />}
```

`Stage4Host`의 키 핸들러(`Space`/`Enter` → `running`)는 그대로 두고, 마우스 클릭으로도 시작 가능하게 `onStart`를 연결.

## 5. 화면 레이아웃

```
┌───────────────────────────────────────┐
│         4단계: 최종 시련                │   ← info-top-section
├───────────────────────────────────────┤
│  ┌────────┬────────┬────────┐         │
│  │ Stage1 │ Stage2 │ Stage3 │         │   ← .stage4-preview-triptych
│  │  시계   │  도서  │  캐치  │         │     (가로 3분할 이미지)
│  └────────┴────────┴────────┘         │
│                                       │
│         ■↑■                           │
│      ■←■  ↓  ■→■                      │   ← arrow-keys-cluster
│                                       │     (세 키 모두 active)
│   3개 시련을 동시에                     │
│   [←][↑][→] 키로 클리어하세요          │   ← main-instruction-text
├───────────────────────────────────────┤
│         [GAME START]                  │   ← info-bottom-section
│       ENTER 키를 눌러 시작              │
└───────────────────────────────────────┘
```

## 6. 영향 범위

| 파일 | 변경 |
|---|---|
| `src/stages/stage4/Stage4Intro.jsx` | 전체 재작성 |
| `src/stages/stage4/Stage4Intro.css` | 전체 재작성 |
| `src/stages/stage4/Stage4Host.jsx` | 1줄 (Stage4Intro에 `onStart` prop 전달) |

**무영향:**
- Stage 1/2/3 컴포넌트 및 CSS
- Stage 4의 Split/Merge/Jumpscare/Host phase 흐름
- BGM, 점수, sub-result 수집 로직
- 기존 단위 테스트 (Stage4Intro 대상 테스트 파일 없음 확인)

## 7. 테스트 계획

- [ ] `npm run dev`로 dev 서버 띄우고 Stage 4 진입
- [ ] ready 화면에 4단계 타이틀 / 3분할 프리뷰 이미지 / 세 화살표 키 active / GAME START 버튼 노출 확인
- [ ] GAME START 버튼 클릭으로 게임 시작 (`running` phase 진입)
- [ ] Enter / Space 키로도 게임 시작 가능 확인 (기존 Stage4Host 키 핸들러)
- [ ] 다른 stage(1, 2, 3) ready 화면 회귀 없음 확인
- [ ] Split/Merge 흐름 회귀 없음 확인

## 8. 수용 기준

1. Stage 4 ready 화면이 Stage 1/2/3과 동일한 `stage-info-screen` 레이아웃을 사용한다
2. 프리뷰 영역에 Stage 1/2/3 예시 이미지 3장이 가로로 균등 분할되어 보인다
3. `←` `↑` `→` 세 키가 모두 발광(active) 상태로 표시된다
4. GAME START 버튼 클릭 또는 Enter/Space 키로 게임이 시작된다
5. 다른 스테이지 및 Stage 4의 게임 진행/완료 흐름에 변화가 없다
