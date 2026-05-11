# 점수 표시 UI 디자인 (만점·생존선)

- **작성일:** 2026-05-11
- **관련 이슈:** `.issues/20260511_기능추가_점수_사운드_컨트롤_UI.md` 중 점수 UI 부분
- **범위:** 본 스펙은 점수 표시(만점/생존선)만 다룬다. 사운드 컨트롤 UI는 별도 스펙으로 분리.
- **브랜치 전략:** 현재 브랜치(main)에서 작업, 단일 PR로 머지.

## 1. 배경

현재 `HudOverlay`는 좌측 하단에 누적 점수(`SCORE 250`)만 텍스트로 노출한다. 플레이어는 다음 두 정보를 알 수 없다.

- 만점이 얼마인지 (현재 1540)
- 엔딩 분기점이 얼마인지 (현재 700, `ENDING_SUCCESS_CUTOFF`)

이 분기점은 단순한 표시 값이 아니라 게임의 핵심 서사("삶/죽음")와 직결된다. 플레이어가 진행 중에 자신이 안전 구간에 있는지 위험 구간에 있는지 직관적으로 파악할 수 있어야 한다.

## 2. 목표

- 누적 점수와 만점, 생존선을 한 화면에서 동시에 인지할 수 있게 한다.
- 생존선 통과 여부를 별도 텍스트 없이 시각적으로 전달한다.
- 만점·생존선 상수는 단일 진실 공급원(`src/scoring.js`)에서 파생되어 UI는 import 만으로 사용한다.

## 3. UI 디자인

### 3.1 위치와 가시성

- 좌측 하단 `HudOverlay__score` 블록을 확장한다.
- 기존 가시성 규칙은 그대로 유지: `/`(title), `/ranking` 라우트에서는 숨김. 그 외 hub·stage·ending에서 모두 노출.
- 우측 하단 `n/4` 클리어 카운트 표시는 변경하지 않는다.

### 3.2 구성요소

좌측 하단 한 블록에 다음을 세로로 쌓는다.

1. 헤더 라인 — `SCORE {total}` (강조, 기존 노란색 톤) `/ 1540` (보조, 흐린 노랑)
2. 진행 막대 — 0 → 1540 (가로 약 280px, 높이 8px)
3. 생존선 틱 — 막대 위 700 지점(가로 길이의 `700/1540 ≈ 45.5%`)에 빨간 세로 틱과 `생존선 700` 라벨

블록 전체는 클릭 가능. 클릭 시 기존 `ScoreTable` 모달이 열린다 (현재 동작 유지).

### 3.3 색 동작

- `total < 700` → 막대 채움색 빨강 계열(`#c43232`~`#7a1818` 그라데이션)
- `total >= 700` → 막대 채움색 금색(`#ffcc00` 계통, 기존 SCORE 텍스트 색과 통일)
- 분기점 틱은 항상 빨간색 고정 (의미 마커)
- 색 전환은 `transition: background 0.3s ease` 정도의 부드러운 전환

분기점 통과 시 별도의 플래시/효과음/알림은 두지 않는다. 호러 톤 유지 및 단순성.

### 3.4 ScoreTable 모달 보강

기존 `점수 기준` 헤더 아래에 한 줄 요약을 추가한다.

```
만점 1540 · 생존선 700
```

두 값은 모달 내부에서 하드코딩하지 않고 `scoring.js`에서 import 한 상수를 사용한다.

## 4. 구현 변경 지점

### 4.1 `src/scoring.js`

- `TOTAL_MAX_SCORE` 상수를 새로 export 한다. 값은 `Object.values(STAGE_SCORE_TIERS).reduce((sum, tiers) => sum + tiers[0].points + PERFECT_HEADROOM, 0)`로 계산하여 모듈 로드 시 한 번 평가한 상수로 둔다.
- `ENDING_SUCCESS_CUTOFF`는 그대로 유지.

### 4.2 `src/components/HudOverlay/HudOverlay.jsx`

- `TOTAL_MAX_SCORE`, `ENDING_SUCCESS_CUTOFF`를 import.
- 점수 블록 마크업을 헤더 라인 + 막대 + 틱 라벨 구조로 확장.
- 막대 채움 비율은 `Math.min(1, total / TOTAL_MAX_SCORE)`로 계산.
- 분기점 위치(%)는 `(ENDING_SUCCESS_CUTOFF / TOTAL_MAX_SCORE) * 100`로 계산하여 인라인 스타일로 전달.
- 분기점 통과 상태(`total >= ENDING_SUCCESS_CUTOFF`)에 따라 채움 요소에 `--alive` 모디파이어 클래스를 토글.

### 4.3 `src/components/HudOverlay/HudOverlay.css`

- 기존 `.hud-overlay__score` 버튼 스타일은 유지하되 내부 마크업 변화에 맞춰 레이아웃을 column flex로 조정.
- 새 클래스:
  - `.hud-overlay__score-line` — 헤더 텍스트 라인
  - `.hud-overlay__score-max` — `/ 1540` 보조 표기 (흐린 노랑)
  - `.hud-overlay__bar` — 막대 컨테이너
  - `.hud-overlay__bar-fill` — 채움 요소 (기본 빨강 그라데이션)
  - `.hud-overlay__bar-fill--alive` — 700 통과 시 금색
  - `.hud-overlay__bar-tick` — 생존선 빨간 세로 틱
  - `.hud-overlay__bar-tick-label` — `생존선 700` 라벨

### 4.4 `src/components/HudOverlay/ScoreTable.jsx`

- `TOTAL_MAX_SCORE`, `ENDING_SUCCESS_CUTOFF` import.
- 헤더 아래에 `만점 {TOTAL_MAX_SCORE} · 생존선 {ENDING_SUCCESS_CUTOFF}` 한 줄 요약을 추가.

### 4.5 `src/components/HudOverlay/ScoreTable.css`

- 요약 라인용 작은 스타일 클래스 추가 (`.score-table__summary` 등). 헤더 보더와 본문 사이에 위치.

## 5. 테스트

### 5.1 `src/scoring.test.js`

- `TOTAL_MAX_SCORE === 1540` 단언 추가. 만점이 의도치 않게 바뀌면 회귀로 잡힌다.
- `TOTAL_MAX_SCORE > ENDING_SUCCESS_CUTOFF` 단언 추가 (생존선이 만점을 넘어버리는 잘못된 설정 방지).

### 5.2 `src/components/HudOverlay/__tests__/HudOverlay.test.jsx` (신규)

- `total=0`: 막대 채움 너비 `0%`, 채움 요소에 `--alive` 클래스 없음.
- `total=699`: 채움 너비 약 `45.4%`, `--alive` 클래스 없음.
- `total=700`: 채움 너비 약 `45.5%`, `--alive` 클래스 있음.
- `total=1540`: 채움 너비 `100%`, `--alive` 클래스 있음.
- 생존선 라벨 텍스트 `생존선 700`이 DOM에 존재.
- 점수 블록 클릭 시 ScoreTable이 열림 (기존 회귀 보호).

### 5.3 `ScoreTable` 테스트 보강

- 모달 열림 시 `만점 1540 · 생존선 700` 텍스트가 DOM에 존재.

## 6. 명시적 비범위

- 점수 카운트업 애니메이션 — YAGNI.
- 분기점 통과 시 플래시/효과음/햅틱 — 호러 톤 유지 위해 생략.
- 모바일 전용 컴팩트 모드 — 별도 요청이 없으면 미룸.
- 사운드 컨트롤 UI — 별도 스펙으로 분리(후속).

## 7. 마이그레이션 및 리스크

- `TOTAL_MAX_SCORE`가 만점 변경 시 자동 계산되므로 향후 `STAGE_SCORE_TIERS` 조정 시 UI도 자동 반영된다.
- 기존 `HudOverlay` 마크업이 단순 텍스트에서 다층 구조로 바뀌므로, `aria-label`은 유지하고 막대는 `role="presentation"`으로 두어 스크린리더는 헤더 텍스트만 읽도록 한다.
- 색만으로 분기점 통과 여부를 전달하므로 접근성 보완으로 `aria-label`에 `목표 700점 ${total >= 700 ? '통과' : '미도달'}` 같은 상태 문구를 포함한다.
