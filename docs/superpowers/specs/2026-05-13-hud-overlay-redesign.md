# HUD Overlay 리디자인

**날짜:** 2026-05-13  
**상태:** 승인됨

---

## 목표

HUD 오버레이의 좌측 하단과 우측 하단 UI를 개선한다.

- 좌측 하단: 클릭 가능한 점수 버튼(+진행바+ScoreTable 모달)을 제거하고 스테이지별 점수 텍스트로 교체
- 우측 하단: 진행 텍스트를 제거하고 설명/결과 아이콘 버튼 두 개로 교체
- Stage 4 완료 후 자동 엔딩 이동을 제거하고 `/hub`로 복귀하도록 변경

---

## 레이아웃

### 좌측 하단
- 스테이지 1~4 점수를 `·`로 구분해 나열: `360 · 0 · 400 · 0`
- 레이블(S1, S2 등) 없음
- 미클리어 스테이지는 `0` 표시
- 클릭 불가 텍스트 (pointer-events: none)
- 기존 버튼, 진행바, 가중치 텍스트 모두 제거

### 우측 하단
- lucide-react 아이콘 버튼 두 개 (가로 배치)
  - **Info 아이콘**: 클릭 → InfoModal 표시
  - **LogIn 아이콘**: 클릭 → `/ending/alive` 또는 `/ending/silhouette` 이동 (현재 totalScore 기준 `endingOutcomeFromTotal` 사용)
- 기존 `{cleared} / 4` 진행 텍스트 제거

---

## 컴포넌트 변경

### 수정
| 파일 | 변경 내용 |
|------|-----------|
| `HudOverlay.jsx` | 점수 버튼 → 텍스트, 진행 텍스트 제거, 아이콘 버튼 + InfoModal 상태 추가 |
| `HudOverlay.css` | 버튼/바 스타일 제거, 아이콘 버튼 스타일 추가 |
| `StagePage.jsx` | Stage 4 `navigate(endingRoute)` → `navigate('/hub')` |

### 추가
| 파일 | 내용 |
|------|------|
| `InfoModal.jsx` | 게임 스토리 설명 모달 |
| `InfoModal.css` | InfoModal 스타일 |

### 삭제
| 파일 |
|------|
| `ScoreTable.jsx` |
| `ScoreTable.css` |
| `ScoreTable.test.jsx` |

---

## InfoModal 임시 텍스트

```
그린이가 둘이 됐다.

진짜와 가짜를 구분해 네 가지 게임을 클리어하고
도플갱어를 퇴치하라.

Stage 1 — 괘종시계: ← 키
Stage 2 — 반응속도: ↑ 키
Stage 3 — 캐치: → 키
Stage 4 — 최종전: ← / ↑ / → 동시
```

나중에 스토리에 맞게 수정 가능.

---

## 아이콘

- `Info` (lucide-react) — 설명 모달 트리거
- `LogIn` (lucide-react) — 엔딩 페이지 이동

---

## 결과 아이콘 동작

```js
import { endingOutcomeFromTotal } from '../../scoring.js';
// ...
navigate(`/ending/${endingOutcomeFromTotal(total)}`);
```

Stage 4 완료 후 자동 이동은 제거. 결과 확인은 HUD 결과 아이콘이 유일한 경로.

---

## 비고

- `/stage/*` 내부의 `SCORE {total}` 텍스트는 변경 없음
- `endingOutcomeFromTotal`은 `scoring.js`에 이미 존재, 재사용
