# Stage 4 점수 합산 애니메이션 설계

**Date:** 2026-05-14
**Scope:** Stage 4 merging 페이즈에 3분할 점수 합산 CSS 애니메이션 추가

---

## 개요

Stage 4의 merging 페이즈(4초)에서 3개 서브 패널의 점수가 제자리에서 커지고, 패널 경계에 `+` 기호가 동시 등장한 뒤 `= 합계`가 표시되는 애니메이션을 추가한다.

Stage 1, 2, 3은 현행 유지 (변경 없음).

---

## 범위

### 변경 대상

- `src/stages/stage4/Stage4MergeOverlay.jsx`
- `src/stages/stage4/Stage4MergeOverlay.css`
- `src/stages/stage4/Stage4Host.jsx` — MergeOverlay에 점수 props 전달

### 변경 없음

- Stage 1, 2, 3 및 관련 컴포넌트 일체

---

## 애니메이션 흐름

merging 페이즈 진입 시점(t=0)을 기준으로:

| 시점 | 동작 |
|------|------|
| 0s | 3개 패널 각각 점수 팝업 (scale 0.3 → 1, fade in) |
| 1.0s | 세 점수 동시에 크게 확대 (scale 1 → 1.8) + 황금 glow |
| 1.8s | 패널 경계 위치에 `+` 기호 두 개 동시 등장 (scale 팝) |
| 2.6s | 화면 아래 `=` 등장, 0.3초 후 합계 숫자 팡 |
| 4.0s | jumpscare 전환 (기존 로직 유지) |

---

## 컴포넌트 설계

### Stage4MergeOverlay

```
props:
  scores: { pane1: number, pane2: number, pane3: number }
```

- 기존 vignette CSS 애니메이션(`stage4-merge-vignette`) 유지
- 그 위에 점수 오버레이 레이어 추가 (z-index: 301)
- 3개 점수 요소 — 각 패널 중앙에 absolute 배치
- 2개 `+` 요소 — 패널 경계(left: 33.3%, left: 66.6%)에 absolute 배치
- `=` + 합계 — 화면 하단 중앙

### Stage4Host

- `results` 3개 수집 후 `merging` 진입 시 각 score를 MergeOverlay에 전달
- `totalScoreRef.current` 합계는 기존 로직 그대로 사용

---

## CSS 애니메이션 상세

- 점수 등장: `cubic-bezier(0.34, 1.56, 0.64, 1)` — 약간 오버슈트
- 확대: `cubic-bezier(0.34, 1.2, 0.64, 1)` — 부드러운 팽창
- `+` 등장: scale 0.4 → 1, `cubic-bezier(0.34, 1.56, 0.64, 1)`
- 합계 등장: scale 0.4 → 1 + `text-shadow` glow
- 색상: 점수 `#FFD700` (황금), `+`/`=` `#888`/`#aaa`, 합계 `#fff`

---

## 데이터 흐름

```
Stage4Host
  results: { 1: {score: 80}, 2: {score: 100}, 3: {score: 60} }
  ↓ phase === 'merging'
Stage4MergeOverlay
  scores={{ pane1: 80, pane2: 100, pane3: 60 }}
  total = 80 + 100 + 60 = 240 (컴포넌트 내부 계산)
```

---

## 완료 기준

- merging 페이즈 진입 시 3개 점수가 각 패널 중앙에 팝업
- 점수가 동시에 1.8배 확대됨
- `+` 두 개가 패널 경계에 동시 등장
- `= 합계` 가 화면 하단에 등장
- jumpscare 전환 흐름 깨지지 않음
- 기존 vignette 어두워지는 연출과 자연스럽게 공존
