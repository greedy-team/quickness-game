# TenSecondsGame.css 중복 제거 설계 문서

> **이슈**: #11 — ❗ [버그][CSS][TenSecondsGame] TenSecondsGame.css 파일이 8번 중복되어 빌드 경고 발생
> **이슈 파일**: `.issues/20260504_버그_TenSecondsGame_css_중복_정리.md`
> **브랜치**: `20260504_#11_TenSecondsGame_css_파일이_8번_중복되어_빌드_경고_발생`
> **작성일**: 2026-05-04

---

## 1. 배경 및 현황

### 1.1 문제

`src/components/TenSecondsGame/TenSecondsGame.css` 파일이 동일한 754라인 블록을 8번 반복하여 총 6033라인이다.

각 블록은 `@import url("https://cdn.jsdelivr.net/npm/neodgm-webfont@1.6.0/neodgm.css");` 로 시작하며, 첫 번째를 제외한 7개 `@import` 선언이 파일 중간에 위치한다. CSS 명세상 `@import`는 모든 다른 규칙보다 먼저 와야 하므로 `npm run build` 시 다음 경고가 7회 발생한다:

```
[vite:css][postcss] @import must precede all other statements (besides @charset or empty @layer)
```

빌드 자체는 통과하나, 콘솔 노이즈와 번들 CSS 크기(약 8배 부풀림)가 문제다.

### 1.2 파일 구조 (현재)

| 라인 범위 | 내용 | 비고 |
|---|---|---|
| 1–754 | 블록 0 | 헤더 주석(1–4) + `@import`(6) + CSS 본문 — 마지막 `@media` 블록의 닫는 `}` 누락 |
| 755 | `}/* === Games.css === */` | 블록 1의 첫 글자 `}`로 직전 `@media` 닫고 다음 블록 헤더와 한 줄에 붙음 |
| 755–1508 | 블록 1 | hash: `0932c8…` |
| 1509–2262 | 블록 2 | hash: `0932c8…` (블록 1과 동일) |
| 2263–3016 | 블록 3 | 동일 |
| 3017–3770 | 블록 4 | 동일 |
| 3771–4524 | 블록 5 | 동일 |
| 4525–5278 | 블록 6 | 동일 |
| 5279–6032 | 블록 7 | 동일 |
| 6033 | `}` | 마지막 `@media` 닫기 |

확인 절차: `awk 'NR>=s && NR<=e' file | shasum` 으로 8개 청크 해시 비교 결과 블록 1–7은 byte 단위 동일, 블록 0만 마지막 `}` 누락으로 다름.

### 1.3 원인 추적

`git log --follow -- src/components/TenSecondsGame/TenSecondsGame.css` 결과 단일 커밋 `70c360e` (PR #6, 2026-05-03, gyuminJJANG) 에서 6033라인 통째로 추가됨. 점진 누적 결과가 아니라 **최초 생성 시점부터 8중 복사 상태**.

각 블록이 동일한 `/* === Games.css === */` 헤더로 시작하고 `}`이 다음 블록 헤더와 한 줄에 붙어있는 패턴은, 편집/생성 도구가 in-place 수정 대신 기존 파일 전체를 매번 append-only로 출력했음을 시사한다.

---

## 2. 목표

| ID | 목표 | 측정 |
|---|---|---|
| G1 | 754라인 canonical 블록 1회 + 마지막 `}`만 유지 | `wc -l` ≈ 755 |
| G2 | 빌드 경고 제거 | `npm run build` 출력에서 `@import must precede` 경고 0회 |
| G3 | UI 변화 없음 | 10초 게임 실행 시 시각적으로 현재와 동일 |

비목표:
- CSS 파일 분리·리팩터링 (헤더 주석, 변수, 섹션 분리 등) — 별도 이슈로 다룸
- 외부 폰트 로딩 방식 변경 (`@import` 위치 자체는 그대로 line 6 유지)
- 재발 방지를 위한 자동화된 가드(pre-commit hook 등) — 본 이슈 범위 밖

---

## 3. 변경 설계

### 3.1 결과 파일 구조 (총 ~755 라인)

```
1     /* ============================================================
2        Games.css — 픽셀 플랫포머 배경 (참고 이미지 스타일)
3        하늘 + 뭉실한 흰 구름 + 수풀 언덕 + 잔디 + 흙 텍스처
4        ============================================================ */
5
6     @import url("https://cdn.jsdelivr.net/npm/neodgm-webfont@1.6.0/neodgm.css");
7
... (canonical CSS 본문 — Variables, Background, Game UI, Timer, Buttons, Result, Responsive) ...

754   .result-btns { flex-direction:column; align-items:center; gap:12px; }
755   }
```

### 3.2 추출 방법

**소스**: 현재 파일의 lines 1–754 (블록 0)
**보강**: 마지막 `@media (max-width: 480px)` 블록을 닫는 `}` 한 줄 추가 (현재 파일 line 6033에 존재하나 블록 0에서는 누락된 부분)

작업 절차:
1. `Read`로 `src/components/TenSecondsGame/TenSecondsGame.css` 의 lines 1–754 확보
2. `Write`로 동일 경로에 [위 내용 + 개행 + `}` + 개행] 작성
3. 결과 파일 라인 수가 V1 기대치(755)와 일치하는지 즉시 확인

`Edit` 대신 `Write`를 쓰는 이유: 6032라인 중 5278라인을 삭제하는 작업이므로 전체 재작성이 단순함.

### 3.3 검증 (acceptance)

| # | 절차 | 기대 |
|---|---|---|
| V1 | `wc -l src/components/TenSecondsGame/TenSecondsGame.css` | `755` (트레일링 개행 포함) |
| V2 | `grep -c "@import" src/components/TenSecondsGame/TenSecondsGame.css` | `1` |
| V3 | `npm run build` 실행 후 출력 검사 | `@import must precede` 경고 0회 |
| V4 | `npm run dev` 후 브라우저에서 10초 게임 화면 진입 | 배경(픽셀 하늘/구름/언덕), 타이머, 픽셀 버튼, 결과창이 시각적으로 현재와 동일 |
| V5 | DevTools에서 viewport ≤ 480px 로 줄여 모바일 반응형 확인 | `.game-inner`, `.timer-digits`, `.pixel-btn`, `.result-btns` 가 모바일 스타일로 적용 (마지막 `@media` 룰셋이 살아있음을 확인) |
| V6 | 빌드 산출물 (`dist/assets/*.css`) 크기 비교 (선택) | 체감상 ~1/8로 감소 (hard fail 아님) |

V5는 본 작업의 가장 큰 회귀 리스크 지점 — 마지막 `}` 누락 시 `@media (max-width: 480px)` 룰셋이 깨져 모바일 반응형이 사라진다.

---

## 4. 위험 및 대응

| 위험 | 영향 | 대응 |
|---|---|---|
| 마지막 `}` 누락으로 `@media (max-width: 480px)` 룰셋 무효화 | 모바일에서 폰트/패딩 깨짐 | V5 검증 강제 수행 |
| 블록 0 ↔ 블록 1–7 미세 차이가 있어 잘못된 블록 선택 | 일부 CSS 누락 | 추출 전 hash 재확인 — 이미 이번 조사에서 블록 0과 블록 1–7가 마지막 `}` 한 글자 차이임을 확인. 블록 0을 사용하면 누락 없음 |
| `@import` 외부 CDN 폰트 로딩 동작 변경 | 폰트가 fallback으로 표시 | URL·위치(line 6) 그대로 유지하므로 변경 없음 |

---

## 5. 재발 방지 메모

본 이슈 범위에는 들지 않으나, 같은 문제가 다시 발생하지 않도록 다음을 권장:

> 향후 대용량 단일 CSS/JSX 파일을 도구로 생성·편집할 때 라인 수 sanity check (예: 새로 추가된 파일이 비정상적으로 크면 동일 블록 반복 여부를 의심)를 권장. 자동화는 별도 이슈/PR에서 다룰 수 있다.

---

## 6. 작업 단위

본 작업은 단일 파일 단일 변경이므로 phase 분할 없이 한 번에 진행:

1. dedup 적용 (3.2)
2. V1, V2 즉시 검증
3. V3 빌드 검증
4. V4, V5 시각 검증
5. 커밋

별도 커밋으로 분리할 가치 없음. 단일 `fix:` 커밋으로 마무리.
