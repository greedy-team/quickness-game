# TenSecondsGame.css 중복 제거 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `src/components/TenSecondsGame/TenSecondsGame.css` 의 8중 중복 블록을 단일 canonical 블록으로 줄여 빌드 경고를 제거하고 번들 CSS 크기를 정상화한다.

**Architecture:** 단일 파일 단일 변경. 현재 파일의 첫 754라인(블록 0)을 canonical 본문으로 사용하고, 누락된 마지막 `@media` 닫는 `}` 한 줄을 추가한 뒤 전체 파일을 재작성한다. 다른 컴포넌트나 스타일링은 건드리지 않는다.

**Tech Stack:** React 19 + Vite 8 (postcss). 별도 라이브러리 도입 없음.

**Spec:** `docs/superpowers/specs/2026-05-04-tensecondsgame-css-dedup-design.md`
**Issue:** `.issues/20260504_버그_TenSecondsGame_css_중복_정리.md`
**Branch:** `20260504_#11_TenSecondsGame_css_파일이_8번_중복되어_빌드_경고_발생`

---

## 작업 흐름 요약

1. **Task 1** — 변경 전 현재 상태 캡처(라인 수, @import 개수, 블록 해시)
2. **Task 2** — dedup 적용(파일 재작성)
3. **Task 3** — 정적 검증(라인 수, @import 개수)
4. **Task 4** — 빌드 검증(`npm run build` 경고 0회)
5. **Task 5** — 시각 검증(`npm run dev` + 브라우저 확인, 모바일 반응형 포함)
6. **Task 6** — 단일 `fix:` 커밋

---

## File Structure

| 액션 | 경로 | 책임 |
|---|---|---|
| Modify | `src/components/TenSecondsGame/TenSecondsGame.css` | 8중 중복을 1회로 축소, 마지막 `}` 보강 |

다른 파일은 변경하지 않는다.

---

## Task 1: 변경 전 상태 캡처

**Files:**
- Read: `src/components/TenSecondsGame/TenSecondsGame.css`

이번 작업은 자동화된 테스트가 아니라 **현재 상태가 spec의 가정과 일치하는지** 확인하는 단계다. 블록 0과 블록 1–7 의 hash가 서로 다른 것은 의도된 사실(블록 0은 마지막 `}` 누락)이며, spec이 이미 이를 반영하고 있다.

- [ ] **Step 1: 현재 라인 수 확인**

Run: `wc -l src/components/TenSecondsGame/TenSecondsGame.css`
Expected output: `6032 src/components/TenSecondsGame/TenSecondsGame.css`

만약 라인 수가 다르면 spec(특히 §1.2)의 가정이 무너진 것이므로 **즉시 중단하고 사용자에게 보고**한다.

- [ ] **Step 2: @import 개수 확인**

Run: `grep -c "@import" src/components/TenSecondsGame/TenSecondsGame.css`
Expected output: `8`

- [ ] **Step 3: @import 라인 위치 확인**

Run: `grep -n "@import" src/components/TenSecondsGame/TenSecondsGame.css`
Expected output (라인 번호 8개):
```
6:@import url("https://cdn.jsdelivr.net/npm/neodgm-webfont@1.6.0/neodgm.css");
760:@import url("https://cdn.jsdelivr.net/npm/neodgm-webfont@1.6.0/neodgm.css");
1514:@import url("https://cdn.jsdelivr.net/npm/neodgm-webfont@1.6.0/neodgm.css");
2268:@import url("https://cdn.jsdelivr.net/npm/neodgm-webfont@1.6.0/neodgm.css");
3022:@import url("https://cdn.jsdelivr.net/npm/neodgm-webfont@1.6.0/neodgm.css");
3776:@import url("https://cdn.jsdelivr.net/npm/neodgm-webfont@1.6.0/neodgm.css");
4530:@import url("https://cdn.jsdelivr.net/npm/neodgm-webfont@1.6.0/neodgm.css");
5284:@import url("https://cdn.jsdelivr.net/npm/neodgm-webfont@1.6.0/neodgm.css");
```

- [ ] **Step 4: 블록 1–7 동일성 재확인 (안전망)**

Run:
```bash
for i in 1 2 3 4 5 6 7; do start=$((i * 754 + 1)); end=$(((i + 1) * 754)); awk -v s="$start" -v e="$end" 'NR>=s && NR<=e' src/components/TenSecondsGame/TenSecondsGame.css | shasum; done | sort -u | wc -l
```
Expected output: `1`

(블록 1–7의 해시가 모두 같다 → 유일한 해시 1개. 만약 `>1` 이면 spec 가정이 무너진 것이므로 중단하고 사용자에게 보고.)

- [ ] **Step 5: 마지막 줄이 단일 `}` 인지 확인**

Run: `tail -1 src/components/TenSecondsGame/TenSecondsGame.css`
Expected output: `}` (마지막 `@media` 닫는 중괄호 한 글자)

---

## Task 2: dedup 적용

**Files:**
- Modify: `src/components/TenSecondsGame/TenSecondsGame.css` (전체 재작성)

핵심 아이디어: 파일을 lines 1–754(블록 0) + 닫는 `}` 1줄 = 755줄로 축소.

- [ ] **Step 1: 현재 파일의 lines 1–754 를 읽어 변수에 저장**

Read tool 로 `src/components/TenSecondsGame/TenSecondsGame.css` 의 offset=1, limit=754 를 읽는다. 읽은 내용이 다음 패턴과 일치하는지 확인:
- line 1: `/* ============================================================`
- line 6: `@import url("https://cdn.jsdelivr.net/npm/neodgm-webfont@1.6.0/neodgm.css");`
- line 754: `  .result-btns { flex-direction:column; align-items:center; gap:12px; }`

- [ ] **Step 2: Write tool 로 동일 경로에 [읽은 754줄] + 개행 + `}` + 개행 형태로 재작성**

작성할 내용 = (Step 1에서 읽은 754줄을 그대로 복원) + `\n}\n`

주의:
- Read tool 출력의 `cat -n` 라인 번호 prefix는 제거하고 본문만 사용
- 블록 0 마지막 줄(line 754)이 개행으로 끝나는지 확인하고, 없으면 추가 후 `}` 라인을 잇는다
- 인덴테이션·공백을 변경하지 않는다(원본 그대로 보존)

- [ ] **Step 3: 결과 즉시 sanity check**

Run: `wc -l src/components/TenSecondsGame/TenSecondsGame.css`
Expected output: `755 src/components/TenSecondsGame/TenSecondsGame.css`

만약 라인 수가 754나 756이면 트레일링 개행 처리에 미세한 차이가 있는 것 — 본문이 정확히 보존됐는지 Read 로 처음 10줄/마지막 5줄을 다시 확인한다.

---

## Task 3: 정적 검증

**Files:**
- Read: `src/components/TenSecondsGame/TenSecondsGame.css`

- [ ] **Step 1: 라인 수 (V1)**

Run: `wc -l src/components/TenSecondsGame/TenSecondsGame.css`
Expected output: `755 src/components/TenSecondsGame/TenSecondsGame.css`

- [ ] **Step 2: @import 개수 (V2)**

Run: `grep -c "@import" src/components/TenSecondsGame/TenSecondsGame.css`
Expected output: `1`

- [ ] **Step 3: @import 위치 확인**

Run: `grep -n "@import" src/components/TenSecondsGame/TenSecondsGame.css`
Expected output: `6:@import url("https://cdn.jsdelivr.net/npm/neodgm-webfont@1.6.0/neodgm.css");`

- [ ] **Step 4: 마지막 줄 확인**

Run: `tail -3 src/components/TenSecondsGame/TenSecondsGame.css`
Expected output:
```
  .pixel-btn span { padding:10px 20px; font-size:13px; }
  .result-btns { flex-direction:column; align-items:center; gap:12px; }
}
```
(마지막 `@media (max-width: 480px)` 룰셋의 끝부분과 닫는 `}` 가 보여야 함)

- [ ] **Step 5: 첫 줄 확인**

Run: `head -7 src/components/TenSecondsGame/TenSecondsGame.css`
Expected output:
```
/* ============================================================
   Games.css — 픽셀 플랫포머 배경 (참고 이미지 스타일)
   하늘 + 뭉실한 흰 구름 + 수풀 언덕 + 잔디 + 흙 텍스처
   ============================================================ */

@import url("https://cdn.jsdelivr.net/npm/neodgm-webfont@1.6.0/neodgm.css");

```

---

## Task 4: 빌드 검증 (V3)

**Files:** (변경 없음 — 빌드 실행 및 출력 확인만)

- [ ] **Step 1: 빌드 실행**

Run: `npm run build 2>&1 | tee /tmp/build-output.log`
Expected: 종료 코드 0, "build" 단계가 끝까지 진행

- [ ] **Step 2: postcss `@import must precede` 경고 0회 확인**

Run: `grep -c "@import must precede" /tmp/build-output.log`
Expected output: `0`

만약 `>0` 이면 dedup 후에도 어딘가에 `@import` 가 본문 중간에 남았다는 뜻 → Task 2 의 Step 2 결과를 다시 검증한다.

- [ ] **Step 3: 빌드 산출물에 변경 내용이 반영됐는지 확인 (선택)**

Run: `ls -la dist/assets/*.css`
Expected: 산출물 CSS 파일이 생성됨. 크기가 이전 대비 줄어드는지 체감 확인 (hard fail 아님; 단순 참고).

---

## Task 5: 시각 검증 (V4, V5)

**Files:** (변경 없음 — 실행 환경에서 시각적 동작 확인)

자동화 테스트가 없는 영역이므로 사용자가 직접 시각 확인을 수행한다. 에이전트는 dev 서버를 띄우고, 사용자에게 확인 요청을 보낸 뒤 응답을 기다린다.

- [ ] **Step 1: dev 서버 백그라운드 실행**

Run (background): `npm run dev`
Expected: Vite 가 `http://localhost:5173` 에서 listen 시작. 콘솔에 에러/경고 없음.

- [ ] **Step 2: 사용자에게 데스크톱 시각 확인 요청 (V4)**

사용자에게 다음을 요청:
> `http://localhost:5173` 에 접속해서 10초 게임 화면을 띄워주세요. 다음을 확인:
> - 픽셀 배경(하늘/구름/언덕/잔디/흙)이 보이는가
> - 타이머 숫자, 픽셀 버튼, 사인 텍스트가 평소와 동일한 폰트/색상으로 보이는가
> - 게임을 한 판 진행해 결과 패널이 정상 표시되는가
>
> UI에 변화가 있다면 어디가 어떻게 달라졌는지 알려주세요.

- [ ] **Step 3: 사용자에게 모바일 반응형 확인 요청 (V5)**

사용자에게 다음을 요청:
> 같은 페이지에서 DevTools를 열고 viewport 폭을 480px 이하로 줄여주세요. 다음을 확인:
> - `.game-inner` 의 padding 이 모바일 사이즈로 줄어드는가
> - `.timer-digits` 가 48px 폰트로 줄어드는가
> - `.pixel-btn` 텍스트가 13px 로 줄어드는가
> - `.result-btns` 가 세로 정렬로 배치되는가
>
> 위 4개 중 하나라도 데스크톱 스타일 그대로면 마지막 `@media` 닫기 `}` 가 깨졌을 가능성 — 알려주세요.

- [ ] **Step 4: dev 서버 종료**

Run: `pkill -f "vite" || true`
Expected: 백그라운드 vite 프로세스 종료. 종료 코드는 무시(이미 죽었을 수 있음).

---

## Task 6: 커밋

**Files:**
- Stage: `src/components/TenSecondsGame/TenSecondsGame.css`

- [ ] **Step 1: 변경 파일만 스테이징**

Run: `git add src/components/TenSecondsGame/TenSecondsGame.css`

- [ ] **Step 2: diff 확인 (실제로 줄어들었는지)**

Run: `git diff --cached --stat`
Expected: `src/components/TenSecondsGame/TenSecondsGame.css | 5278 -----...` (대략 5278 라인 삭제)

- [ ] **Step 3: 커밋 생성**

Run:
```bash
git commit -m "fix: TenSecondsGame.css 중복 8회 제거 및 빌드 경고 해소 (#11)"
```

Expected: 1 file changed, ~? insertions(+), ~5278 deletions(-)

- [ ] **Step 4: 작업 트리 클린 확인**

Run: `git status --short`
Expected output: (empty) 또는 본 작업과 무관한 untracked 파일만 표시

---

## 마무리 체크리스트

- [ ] Task 1 의 5개 사전 검증 모두 통과
- [ ] Task 3 의 V1, V2, head/tail 검증 통과
- [ ] Task 4 빌드 경고 0회
- [ ] Task 5 사용자 시각 확인 OK (데스크톱 + 모바일)
- [ ] Task 6 단일 `fix:` 커밋 생성

전부 통과 시 PR 작성 단계로 이어간다.
