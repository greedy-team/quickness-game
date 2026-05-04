# #11 TenSecondsGame.css 8중 중복 제거

### 📌 작업 개요

`src/components/TenSecondsGame/TenSecondsGame.css` 파일이 동일한 754라인 블록을 8번 반복해 6032라인이었던 문제를 해결. 빌드 시 발생하던 postcss `@import must precede` 경고 7회를 0회로 줄이고, 번들 CSS 크기를 약 1/8로 정상화.

---

### 🔍 문제 분석

#### 증상
- 파일 크기: 6032라인 (정상치 ~755라인의 8배)
- `@import url("...neodgm.css")` 문이 라인 6, 760, 1514, 2268, 3022, 3776, 4530, 5284 — 총 8회 등장
- 첫 번째를 제외한 7개 `@import`가 파일 중간 위치 → CSS 명세상 `@import` 는 다른 모든 규칙보다 앞에 와야 함
- `npm run build` 실행 시 다음 경고 7회 발생:
  ```
  [vite:css][postcss] @import must precede all other statements (besides @charset or empty @layer)
  ```
- 빌드는 통과하나 콘솔 노이즈 + 번들 산출물 CSS가 비정상적으로 부풀려짐

#### 원인
`git log --follow` 결과 단일 커밋 `70c360e` (PR #6, 2026-05-03) 에서 6033라인 통째로 추가됨. 점진 누적이 아니라 **최초 생성 시점부터 8중 복사 상태**.

각 블록이 동일한 `/* === Games.css === */` 헤더로 시작하고 직전 `@media` 닫기 `}`이 다음 블록 헤더와 한 줄에 붙은 패턴 → 편집/생성 도구가 in-place 수정 대신 기존 파일 전체를 매번 append-only 출력한 것으로 추정.

#### 파일 구조 (변경 전)
| 라인 범위 | 내용 | 비고 |
|---|---|---|
| 1–754 | 블록 0 | 헤더 + `@import`(line 6) + CSS 본문 — 마지막 `@media` 닫기 `}` 누락 |
| 755–6032 | 블록 1–7 | 각 754라인, byte 단위로 서로 동일 (sha `0932c8…`) |
| 6033 | `}` | 마지막 `@media` 닫기 (트레일링 개행 없음) |

블록 1–7의 7개 청크 해시가 모두 일치함을 `awk + shasum + sort -u | wc -l = 1` 로 확인.

---

### ✅ 구현 내용

#### TenSecondsGame.css 재작성
- **파일**: `src/components/TenSecondsGame/TenSecondsGame.css`
- **변경 내용**: 6032라인 → 755라인 (5278라인 삭제). 원본 lines 1–754 (블록 0)를 byte 단위로 보존하고, 마지막에 `@media (max-width: 480px)` 룰을 닫는 `}` 한 줄 추가.
- **이유**: 블록 0이 canonical 본문(헤더 주석 + `@import` 정상 위치 + 모든 CSS 룰)을 포함. 단지 마지막 `@media` 의 닫기 중괄호가 다음 블록과 합쳐져 잘려 있었으므로, 그 `}` 한 글자만 보강하면 완결된 단일 파일이 됨.

#### 결과 파일 구조 (변경 후)
```
1     /* === header comment 4줄 === */
5     (빈 줄)
6     @import url("https://cdn.jsdelivr.net/npm/neodgm-webfont@1.6.0/neodgm.css");
7     (빈 줄)
... canonical CSS (Variables, Background, Game UI, Timer, Buttons, Result, Responsive) ...
753   .pixel-btn span { padding:10px 20px; font-size:13px; }
754   .result-btns { flex-direction:column; align-items:center; gap:12px; }
755   }   ← 마지막 @media 닫기
```

---

### 🔧 주요 변경사항 상세

#### 변경 방법
`Read` tool 로 원본 lines 1–754 를 byte 단위로 확보 → `Write` tool 로 동일 경로에 [읽은 754줄] + `\n}` + `\n` 형태로 재작성. `Edit` 대신 `Write` 사용 이유는 5278라인 삭제 + 1라인 추가 작업이라 전체 재작성이 단순하고 추적이 쉬움.

#### 안전장치
- 작업 전 5단계 사전 검증: 라인 수(6032), `@import` 개수(8), `@import` 라인 위치, 블록 1–7 해시 동일성, EOF가 lone `}` 인지
- 작업 후 round-trip 검증: 재작성한 파일의 lines 1–754 sha 가 원본 lines 1–754 sha 와 byte 일치 (`df243f0f4eaa6a78a265ed466c70624ea375e725`)
- 중괄호 균형 검증: `awk` 로 전체 파일의 `{`/`}` 카운트 → final depth = 0
- 임포트 사이트 보존: `src/components/TenSecondsGame/TenSecondsGame.jsx:7` 의 `import "./TenSecondsGame.css";` 영향 없음

#### 위험 포인트와 대응
| 위험 | 대응 |
|---|---|
| 마지막 `}` 누락 시 `@media (max-width: 480px)` 룰 무효화 → 모바일 반응형 깨짐 | 데스크톱 + 모바일(viewport ≤480px) 시각 검증 둘 다 통과 확인 |
| 블록 0 ↔ 블록 1–7 미세 차이 가능성 | 사전 hash 비교로 차이가 "마지막 `}` 한 글자" 뿐임을 확정 후 진행 |
| 폰트 CDN 로딩 동작 변경 | `@import` URL 과 위치(line 6) 그대로 유지 — 동작 변경 없음 |

---

### 🧪 테스트 및 검증

| # | 검증 항목 | 결과 |
|---|---|---|
| V1 | `wc -l` | `755` ✓ |
| V2 | `grep -c "@import"` | `1` ✓ |
| V3 | `npm run build` 후 `@import must precede` 경고 카운트 | `0` ✓ (이전: 7회) |
| V4 | 데스크톱 시각 (배경/타이머/버튼/결과 패널) | OK ✓ |
| V5 | 모바일 viewport ≤480px 반응형 | OK ✓ |
| V6 | 빌드 산출물 `dist/assets/*.css` 크기 | `31.2K` (이전 ~250KB) ✓ |

빌드 산출물 CSS 크기가 약 1/8로 줄어 번들 사이즈 정상화 확인.

---

### 📦 의존성 변경

없음. 기존 의존성 그대로 사용.

---

### 📌 참고사항

#### 부수 작업
- 동일 브랜치에서 `quickness-game` 경로의 잘못된 self-submodule gitlink(`160000` 모드, `.gitmodules` 없음) 제거 (`c42b177`). 이는 PR #6 머지 시 함께 들어왔던 별개 사고로, 작업 시작 시 `fatal: No url found for submodule path 'quickness-game' in .gitmodules` 에러 원인이었음.

#### 재발 방지 권고
- 본 이슈 범위 밖이지만 spec 문서에 메모로 남김: 향후 대용량 단일 CSS/JSX 파일을 도구로 생성·편집할 때 라인 수 sanity check 권장(새로 추가된 파일이 비정상적으로 크면 동일 블록 반복 여부를 의심). 자동화 가드(pre-commit hook 등)는 별도 이슈/PR로 다룰 수 있음.

#### 관련 문서
- 설계 문서: `docs/superpowers/specs/2026-05-04-tensecondsgame-css-dedup-design.md`
- 구현 플랜: `docs/superpowers/plans/2026-05-04-tensecondsgame-css-dedup.md`

#### 커밋
- `4583c6b` fix: TenSecondsGame.css 중복 8회 제거 및 빌드 경고 해소 (#11)
- `7d0ed61` docs: TenSecondsGame.css 중복 제거 implementation plan 추가 (#11)
- `05c09ae` docs: TenSecondsGame.css 중복 제거 spec 추가 (#11)
- `c42b177` Delete quickness-game (부수: self-submodule gitlink 제거)
