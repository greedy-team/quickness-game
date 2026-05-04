# 캐치 게임 신전 테마 리워크 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캐치 게임(3번)의 시각을 v1(world.png + 그린이 sprite)에서 v2(자체 CSS art 신전 테마)로 교체하여 1·2번과 톤 일관성 확보 + 4번 병렬 게임의 1/3 width 호환 확보.

**Architecture:** 게임 로직(점수/판정/입력/결과)은 v1과 동일하게 유지. 시각 요소만 교체:
- 외부 자산 0개 (world.png 사용 중단, sprite 사용 중단)
- CSS art 신전 (배경 그라데이션, 좌·우 기둥, 빛줄기, 제단 platform)
- 캐릭터 미등장 (1/3 width 호환 우선)
- 빨간 원(제단) 위치를 고정 px에서 stage height 비율(0.7)로 변환

**Tech Stack:** React 19, Vite 8, plain CSS (radial/linear-gradient + keyframes), CSS art only

**Spec:** `docs/superpowers/specs/2026-05-04-catch-game-shrine-rework-design.md` (v2)
**이전 v1 spec:** `docs/superpowers/specs/2026-05-03-catch-game-design.md`

**Issue/Branch:** #10, `20260503_#10_캐치_게임_3번_구현` (rework 커밋 추가)

---

## File Structure

| Path | What changes |
|---|---|
| `src/components/CatchGame/catchUtils.js` | `RED_CIRCLE_TOP_PX = 420` → `RED_CIRCLE_TOP_RATIO = 0.7` (한 줄) |
| `src/components/CatchGame/CatchGame.jsx` | bg/greenie divs 교체 → 신전 요소 divs, input 핸들러에서 ratio×stageHeight로 circle Y 계산, idle 패널 본문 텍스트 갱신 |
| `src/components/CatchGame/CatchGame.css` | `.catch-bg`(world.png) 재정의 + `.catch-greenie`/`@keyframes catch-greenie-walk` 제거 + 신전 요소(`.catch-pillar`, `.catch-light-beam`, `@keyframes catch-light-pulse`, `.catch-altar-platform`) 추가 + `.catch-circle` `top: 420px` → `top: 70%` |
| `FallingItem.jsx` | 변경 없음 |

---

## Verification Model

테스트 프레임워크 없음. 검증:
- 빌드: `npm run build`
- 시각: `npm run dev` 후 브라우저에서 캐치 게임 섹션 확인 (controller가 직접)
- 정적: Read로 코드 확인, `git diff --stat`으로 변경 파일 수 확인

---

## Task Decomposition Rationale

CSS 클래스 이름과 JSX div 구조가 강하게 결합돼있어, CSS만 바꾸거나 JSX만 바꾸면 중간 빌드 상태가 시각적으로 깨짐. 따라서 utils + JSX + CSS를 **한 task에서 atomic 변경**한다. 변경량이 명확히 한정돼있고(spec에 풀 코드 명시), 한 commit이 PR 리뷰에서 한 묶음으로 보이는 게 자연스럽다.

이후 Task 2는 최종 검증 (빌드 + 정적 검증 + push 대기 안내).

---

### Task 1: catchUtils + CatchGame.jsx + CatchGame.css 신전 테마 리워크 (atomic)

**Files:**
- Modify: `src/components/CatchGame/catchUtils.js`
- Modify: `src/components/CatchGame/CatchGame.jsx`
- Modify: `src/components/CatchGame/CatchGame.css`

- [ ] **Step 1: catchUtils.js — RED_CIRCLE_TOP_PX 상수를 RED_CIRCLE_TOP_RATIO로 교체**

`src/components/CatchGame/catchUtils.js`에서 라인 22:

기존:
```js
export const RED_CIRCLE_TOP_PX = 420;       // 그린이 가슴 높이
```

다음으로 교체:
```js
export const RED_CIRCLE_TOP_RATIO = 0.7;    // stage height의 70% 지점 (제단 위치)
```

다른 export, 함수, 상수는 그대로 유지. 파일 전체에서 `RED_CIRCLE_TOP_PX`라는 이름이 없는지 grep으로 확인:

```bash
grep -n RED_CIRCLE_TOP src/components/CatchGame/catchUtils.js
```

Expected: `RED_CIRCLE_TOP_RATIO` 라인 한 줄만 보임 (PX는 없어야 함).

- [ ] **Step 2: CatchGame.jsx — import 갱신**

`src/components/CatchGame/CatchGame.jsx` 상단 import 블록에서 `RED_CIRCLE_TOP_PX`를 `RED_CIRCLE_TOP_RATIO`로 교체:

기존 import 블록:
```jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GAME_DURATION_MS,
  FALL_DURATION_MS,
  STAGE_HEIGHT_PX,
  RED_CIRCLE_TOP_PX,
  HIT_RANGE_MAX,
  planSpawnTimes,
  pickRandomType,
  judgeHit,
  getItemY,
  getCatchResult,
} from './catchUtils';
import FallingItem from './FallingItem';
import StarRating from '../TenSecondsGame/StarRating';
import './CatchGame.css';
```

다음으로 교체:
```jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GAME_DURATION_MS,
  FALL_DURATION_MS,
  STAGE_HEIGHT_PX,
  RED_CIRCLE_TOP_RATIO,
  HIT_RANGE_MAX,
  planSpawnTimes,
  pickRandomType,
  judgeHit,
  getItemY,
  getCatchResult,
} from './catchUtils';
import FallingItem from './FallingItem';
import StarRating from '../TenSecondsGame/StarRating';
import './CatchGame.css';
```

- [ ] **Step 3: CatchGame.jsx — keydown 핸들러에서 circle Y를 ratio×height로 계산**

키 입력 useEffect 내부에서 `RED_CIRCLE_TOP_PX`를 사용하던 한 줄을 변경.

기존 (대략 lines 100-114, 정확한 위치는 파일 read로 확인):
```jsx
        let bestId = null;
        let bestDist = Infinity;
        for (const it of items) {
          const elapsed = nowSinceStart - it.spawnAt;
          if (elapsed < 0) continue;
          const y = getItemY(elapsed, STAGE_HEIGHT_PX, FALL_DURATION_MS);
          const dist = Math.abs(y - RED_CIRCLE_TOP_PX);
          if (dist < bestDist) {
            bestDist = dist;
            bestId = it.id;
          }
        }
```

다음으로 교체 (`circleTopPx` 지역 변수 추가):
```jsx
        let bestId = null;
        let bestDist = Infinity;
        const circleTopPx = RED_CIRCLE_TOP_RATIO * STAGE_HEIGHT_PX;
        for (const it of items) {
          const elapsed = nowSinceStart - it.spawnAt;
          if (elapsed < 0) continue;
          const y = getItemY(elapsed, STAGE_HEIGHT_PX, FALL_DURATION_MS);
          const dist = Math.abs(y - circleTopPx);
          if (dist < bestDist) {
            bestDist = dist;
            bestId = it.id;
          }
        }
```

기본값 `RED_CIRCLE_TOP_RATIO = 0.7`, `STAGE_HEIGHT_PX = 600`이므로 `circleTopPx = 420`으로 v1과 동일한 판정 위치. 시각/판정 호환.

- [ ] **Step 4: CatchGame.jsx — stage div 내부 구조 교체**

기존 (`<div className="catch-stage">` 직후):
```jsx
    <div className="catch-stage">
      <div className="catch-bg" aria-hidden="true" />
      <div className="catch-greenie" aria-hidden="true" />
      <div className="catch-circle" aria-hidden="true" />
```

다음으로 교체 (sprite 그린이 div 제거, 신전 요소 4개 추가):
```jsx
    <div className="catch-stage">
      <div className="catch-bg" aria-hidden="true" />
      <div className="catch-light-beam" aria-hidden="true" />
      <div className="catch-pillar catch-pillar-left" aria-hidden="true" />
      <div className="catch-pillar catch-pillar-right" aria-hidden="true" />
      <div className="catch-altar-platform" aria-hidden="true" />
      <div className="catch-circle" aria-hidden="true" />
```

이후의 `{phase === 'running' && activeItems.map(...)}` + UI overlay 블록은 모두 그대로 유지.

- [ ] **Step 5: CatchGame.jsx — idle 패널 본문 텍스트 갱신**

idle 패널에서 한 줄만 변경 (그린이 → 신전 표현). 기존:

```jsx
            <p>하늘에서 떨어지는 장비를 거치대(빨간 원) 위치에서 <b>→ 키</b>로 잡아라!</p>
```

다음으로 교체:
```jsx
            <p>신이 내려주는 장비를 제단(빨간 원) 위치에서 <b>→ 키</b>로 잡아라!</p>
```

부제(`catch-subtitle`), 힌트(`catch-hint`), 시작 버튼은 그대로.

- [ ] **Step 6: CatchGame.css — `.catch-bg` 재정의 (world.png 제거 → radial-gradient)**

`src/components/CatchGame/CatchGame.css`의 `.catch-bg` 블록을 찾아 (대략 lines 43-51) 다음으로 교체:

기존:
```css
.catch-bg {
  position: absolute;
  inset: 0;
  background-image: url('/bg/world.png');
  background-size: cover;
  background-position: center bottom;
  image-rendering: pixelated;
  z-index: 1;
}
```

다음으로 교체:
```css
.catch-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at center 30%, rgba(80, 50, 120, 0.4), transparent 60%),
    radial-gradient(circle at center, #1a0f2e, #0a0a1f 80%);
  z-index: 1;
}
```

- [ ] **Step 7: CatchGame.css — `.catch-greenie` 및 `@keyframes catch-greenie-walk` 블록 제거**

`.catch-greenie` 블록 (대략 lines 53-66) 전체 + 그 직후 `@keyframes catch-greenie-walk` 블록 (대략 lines 68-70) 전체를 삭제.

기존:
```css
/* 무방비 그린이 sprite (8프레임 walking, 0.8s loop) */
.catch-greenie {
  position: absolute;
  bottom: 151px;
  left: 50%;
  margin-left: -200px;
  width: 400px;
  height: 220px;
  background-image: url('/sprites/unified_5_walk_no_weapon.png');
  background-repeat: no-repeat;
  image-rendering: pixelated;
  animation: catch-greenie-walk 0.8s steps(8) infinite;
  z-index: 2;
}

@keyframes catch-greenie-walk {
  to { background-position: -3200px 0; }
}
```

→ 완전 삭제 (대체 없음).

- [ ] **Step 8: CatchGame.css — `.catch-circle` 위치를 ratio로 변경**

`.catch-circle` 블록 (대략 lines 72-84)에서 한 줄만 변경.

기존:
```css
.catch-circle {
  position: absolute;
  top: 420px;
  left: 50%;
  ...
}
```

`top: 420px;`를 `top: 70%;`로 교체. 다른 속성 모두 유지.

변경 후:
```css
.catch-circle {
  position: absolute;
  top: 70%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ff8a8a, #d42b2b 70%);
  box-shadow: 0 0 24px rgba(255, 90, 90, 0.7), inset 0 0 8px rgba(255, 255, 255, 0.4);
  z-index: 3;
}
```

NOTE: Task 7 폴리시에서 추가된 `.catch-circle { animation: catch-circle-pulse ... }` cascade 블록은 그대로 유지 (펄스 효과 보존).

- [ ] **Step 9: CatchGame.css — 신전 요소 블록 추가 (파일 끝에 append)**

`src/components/CatchGame/CatchGame.css` 파일 끝에 다음 블록을 추가:

```css
/* === 캐치 게임 — 신전 요소 === */
.catch-pillar {
  position: absolute;
  top: 0;
  width: 8%;
  height: 100%;
  background: linear-gradient(
    to right,
    #2a1a3a 0%,
    #4a3a5a 20%,
    #6a5a7a 50%,
    #4a3a5a 80%,
    #2a1a3a 100%
  );
  border-top: 12px solid #6a5a7a;
  border-bottom: 12px solid #3a2a4a;
  z-index: 2;
}

.catch-pillar-left  { left: 5%; }
.catch-pillar-right { right: 5%; }

.catch-light-beam {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 30%;
  height: 70%;
  background: linear-gradient(
    to bottom,
    rgba(255, 215, 0, 0.35) 0%,
    rgba(255, 215, 0, 0.15) 50%,
    transparent 100%
  );
  filter: blur(4px);
  pointer-events: none;
  animation: catch-light-pulse 1.4s ease-in-out infinite;
  z-index: 2;
}

@keyframes catch-light-pulse {
  0%, 100% { opacity: 0.7; }
  50%      { opacity: 1.0; }
}

.catch-altar-platform {
  position: absolute;
  left: 50%;
  top: 75%;
  transform: translateX(-50%);
  width: 20%;
  height: 6%;
  background: linear-gradient(to bottom, #5a4a6a, #2a1a3a);
  border-top: 2px solid #7a6a8a;
  border-radius: 4px 4px 8px 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 2;
}
```

- [ ] **Step 10: 빌드 통과 확인**

```bash
cd /Users/luca/workspace/greedy/quickness-game
npm run build 2>&1 | grep -E "(error|✓|built|Error)" | head -10
```

Expected: `✓ built in ...` 메시지. 에러 없음.

- [ ] **Step 11: 정적 검증**

```bash
git diff --stat HEAD
```

Expected: 3 파일 수정 (catchUtils.js, CatchGame.jsx, CatchGame.css), 다른 파일 없음.

```bash
grep -n "world.png\|RED_CIRCLE_TOP_PX\|catch-greenie\|unified_5_walk_no_weapon" src/components/CatchGame/
```

Expected: 결과 없음 (위 4개 토큰이 코드에서 사라짐).

```bash
grep -n "RED_CIRCLE_TOP_RATIO\|catch-pillar\|catch-light-beam\|catch-altar-platform" src/components/CatchGame/
```

Expected: 새 4개 토큰이 적절한 위치에 등장.

- [ ] **Step 12: Commit**

```bash
git add src/components/CatchGame/catchUtils.js src/components/CatchGame/CatchGame.jsx src/components/CatchGame/CatchGame.css
git commit -m "refactor: 캐치 게임 시각을 신전 테마 CSS art로 리워크 (#10)"
```

NOTE: type을 `feat`이 아닌 `refactor`로 — 동작 변화 없이 시각만 교체.

---

### Task 2: 최종 검증

**Files:** (수정 없음, 검증만)

- [ ] **Step 1: 빌드 재확인**

```bash
cd /Users/luca/workspace/greedy/quickness-game
npm run build 2>&1 | grep -E "(error|✓|built|Error)" | head -10
```

Expected: `✓ built in ...`. 에러 없음. (postcss `@import` 경고는 pre-existing TenSecondsGame.css 이슈로 무시 — 별도 이슈로 분리됨)

- [ ] **Step 2: 시각 회귀 정적 검증 (controller가 브라우저로 직접 확인 예정)**

다음 명령으로 변경 후 코드 상태를 요약 보고:

```bash
git log --oneline -5
git diff --stat 02fd540 HEAD  # Task 7 commit과 비교
```

Expected: 마지막 커밋이 `refactor: 캐치 게임 시각을 신전 테마 CSS art로 리워크 (#10)`. 3 파일 변경.

- [ ] **Step 3: dev server 실행 안내 (controller가 직접 npm run dev 실행 예정)**

검증 항목 (브라우저에서 controller가 확인):
- [ ] world.png 배경 사라짐, 어두운 보라/네이비 그라데이션 배경
- [ ] 좌·우 기둥 2개 (gradient stone)
- [ ] 위에서 빛줄기 내려옴 (gold), 부드럽게 펄스
- [ ] 빨간 원 (제단) — stage 70% 지점, 펄스 효과 유지
- [ ] stone platform이 빨간 원 아래
- [ ] 그린이 sprite는 더 이상 보이지 않음
- [ ] 게임 시작/캐치/결과/재시작 사이클 정상 동작
- [ ] 점수가 올바르게 누적, 결과 화면 정상
- [ ] 1·2번 게임 회귀 없음

- [ ] **Step 4: 푸시 + PR 안내 (사용자 승인 후 실행)**

```bash
git push -u origin "20260503_#10_캐치_게임_3번_구현"
```

```bash
gh pr create --title "feat: 캐치 게임(3번) 구현 (#10)" --body "$(cat <<'EOF'
## Summary
- PRD §2.3 캐치 미니게임 구현 (자체 CSS art 신전 테마)
- v1 (world.png + 그린이 sprite) → v2 (신전·제단, 캐릭터 미등장) 리워크
- 1·2번 게임과 톤 일관성 + 4번 병렬 게임의 1/3 width 호환 확보
- 점수 판정/입력 로직은 1·2번 패턴 따라 phase state machine + ref-mirror

## Changes
- 신규: src/components/CatchGame/ (catchUtils.js, FallingItem.jsx, CatchGame.jsx, CatchGame.css)
- 수정: src/App.jsx (CatchGame 섹션 추가)
- docs: PRD, v1 스펙, v2 스펙(신전 리워크), 구현 계획

## Test plan
- [x] Build 통과 (`npm run build`)
- [x] 시작 → 캐치 → 결과 사이클 정상
- [x] 정확/근접/실패/놓침 판정 정확 (제단 위치 70%)
- [x] 신전 요소 (배경/기둥/빛줄기/제단/platform) 모두 정상 렌더
- [x] 1·2번 게임 회귀 없음

## Notes
- pre-existing project lint 설정 버그(`eslint-plugin-import-x` 미해결)는 별도 이슈로 분리
- App.jsx의 Vite 데모 정리 + scene routing 도입은 별도 이슈로 분리

Closes #10
EOF
)"
```

NOTE: 푸시·PR 생성은 외부 영향이 있으므로 controller가 사용자 명시 승인 후에만 실행.

---

### Task 3: 표적 가시성 + 피드백 (UX add-on)

**Files:**
- Modify: `src/components/CatchGame/CatchGame.jsx`
- Modify: `src/components/CatchGame/CatchGame.css`

(spec §12 참조)

- [ ] **Step 1: CatchGame.jsx — feedback state + ref + 헬퍼 추가**

상단 state 선언 그룹 (`useState(...)` 호출들 옆)에 추가:
```jsx
const [feedback, setFeedback] = useState(null);  // { kind, label, id } or null
```

ref 그룹 (`useRef(...)` 호출들 옆)에 추가:
```jsx
const feedbackTimeoutRef = useRef(null);
const feedbackIdRef = useRef(0);
```

`cleanupTimers` 함수 본문에 다음 추가 (다른 timer 정리 옆):
```jsx
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = null;
```

`startGame` 본문에서 게임 초기화 시 feedback도 클리어:
```jsx
    setFeedback(null);
```
(기존 `setActiveItems([])`, `setElapsedMs(0)`, `setScore(0)`, `setCounts(...)` 옆에 추가)

`removeItem` 정의 바로 아래에 새 헬퍼 추가:
```jsx
  const showFeedback = useCallback((kind, label) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    const id = ++feedbackIdRef.current;
    setFeedback({ kind, label, id });
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback((prev) => (prev && prev.id === id ? null : prev));
      feedbackTimeoutRef.current = null;
    }, 600);
  }, []);
```

- [ ] **Step 2: CatchGame.jsx — keydown 핸들러에서 피드백 호출**

기존 keydown 핸들러의 ArrowRight 분기에서, `bestId === null` 이후의 흐름을 다음으로 갱신:

기존:
```jsx
        if (bestId === null) return;
        if (bestDist > HIT_RANGE_MAX) {
          // 사거리 밖 입력 — fail 카운트만 (점수 0)
          setCounts((c) => ({ ...c, fail: c.fail + 1 }));
          return;
        }
        const result = judgeHit(bestDist);
        setScore((s) => s + result.score);
        setCounts((c) => ({ ...c, [result.kind]: c[result.kind] + 1 }));
        removeItem(bestId);
```

다음으로 교체 (3개 분기 모두 showFeedback 호출):
```jsx
        if (bestId === null) return;
        if (bestDist > HIT_RANGE_MAX) {
          // 사거리 밖 입력 — fail 카운트만 (점수 0)
          setCounts((c) => ({ ...c, fail: c.fail + 1 }));
          showFeedback('fail', 'FAIL');
          return;
        }
        const result = judgeHit(bestDist);
        setScore((s) => s + result.score);
        setCounts((c) => ({ ...c, [result.kind]: c[result.kind] + 1 }));
        const label = result.kind === 'perfect' ? 'PERFECT +50'
                    : result.kind === 'near'    ? 'GOOD +20'
                    :                              'FAIL';
        showFeedback(result.kind, label);
        removeItem(bestId);
```

또한 `useEffect`의 `addEventListener('keydown', onKey)` deps에 `showFeedback` 추가:

기존:
```jsx
  }, [removeItem, startGame]);
```

다음으로:
```jsx
  }, [removeItem, startGame, showFeedback]);
```

- [ ] **Step 3: CatchGame.jsx — spawnItem의 자연 miss에 피드백 호출**

기존 spawnItem 함수의 setTimeout 콜백 내부 — miss 카운트 증가 위치에 피드백 추가:

기존:
```jsx
    const tid = setTimeout(() => {
      setActiveItems((prev) => {
        const stillThere = prev.some((it) => it.id === id);
        if (stillThere) {
          setCounts((c) => ({ ...c, miss: c.miss + 1 }));
        }
        return prev.filter((it) => it.id !== id);
      });
    }, FALL_DURATION_MS + 300);
```

다음으로 교체:
```jsx
    const tid = setTimeout(() => {
      setActiveItems((prev) => {
        const stillThere = prev.some((it) => it.id === id);
        if (stillThere) {
          setCounts((c) => ({ ...c, miss: c.miss + 1 }));
          showFeedback('miss', 'MISS');
        }
        return prev.filter((it) => it.id !== id);
      });
    }, FALL_DURATION_MS + 300);
```

`spawnItem`의 `useCallback` deps에 `showFeedback` 추가:

기존:
```jsx
  }, []);
```
(spawnItem useCallback 닫는 부분)

다음으로:
```jsx
  }, [showFeedback]);
```

- [ ] **Step 4: CatchGame.jsx — 표적 div 구조 변경 + 피드백 div 렌더**

stage div 내부에서 기존:
```jsx
      <div className="catch-circle" aria-hidden="true" />
```

다음으로 교체 (인너 코어 추가):
```jsx
      <div className="catch-circle" aria-hidden="true">
        <div className="catch-target-inner" />
      </div>
```

그리고 같은 stage div 내부 (FallingItem 렌더 직후, UI overlay 직전)에 피드백 렌더 추가:

```jsx
      {phase === 'running' && feedback && (
        <div
          key={feedback.id}
          className={`catch-feedback catch-feedback-${feedback.kind}`}
          aria-hidden="true"
        >
          {feedback.label}
        </div>
      )}
```

(`{phase === 'running' && activeItems.map(...)}` 블록과 `<div className="catch-ui-overlay">` 블록 사이에 삽입)

- [ ] **Step 5: CatchGame.css — `.catch-circle` 크기 조정 + flex 중앙 정렬**

`.catch-circle` 블록 (Step 8 of Task 1 이후의 모습)을 다음으로 교체:

기존:
```css
.catch-circle {
  position: absolute;
  top: 70%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ff8a8a, #d42b2b 70%);
  box-shadow: 0 0 24px rgba(255, 90, 90, 0.7), inset 0 0 8px rgba(255, 255, 255, 0.4);
  z-index: 3;
}
```

다음으로 교체 (40px로 축소 + 색상 톤 다운 + flex 중앙 정렬):
```css
.catch-circle {
  position: absolute;
  top: 70%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.35), rgba(220, 60, 60, 0.55) 75%);
  box-shadow: 0 0 24px rgba(255, 90, 90, 0.6), inset 0 0 6px rgba(255, 255, 255, 0.3);
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

(Task 7의 cascade `.catch-circle { animation: catch-circle-pulse ... }` 블록은 그대로 유지)

- [ ] **Step 6: CatchGame.css — `.catch-target-inner` + `.catch-feedback` + 애니메이션 추가**

CatchGame.css 파일 끝에 다음 블록 추가:

```css
/* === 캐치 게임 — 표적 인너 코어 + 피드백 === */
.catch-target-inner {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff8c8, #ffd700 70%);
  box-shadow:
    0 0 12px rgba(255, 215, 0, 0.95),
    inset 0 0 6px rgba(255, 255, 255, 0.7);
}

.catch-feedback {
  position: absolute;
  top: 70%;
  left: 50%;
  transform: translate(-50%, -120%);
  font-family: system-ui, sans-serif;
  font-weight: 800;
  font-size: 18px;
  letter-spacing: 1px;
  pointer-events: none;
  z-index: 6;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.85);
  animation: catch-feedback-rise 0.6s ease-out forwards;
  white-space: nowrap;
}

.catch-feedback-perfect { color: #ffd700; }
.catch-feedback-near    { color: #86efac; }
.catch-feedback-fail    { color: #9ca3af; }
.catch-feedback-miss    { color: #f87171; }

@keyframes catch-feedback-rise {
  0%   { opacity: 0; transform: translate(-50%, -100%); }
  20%  { opacity: 1; transform: translate(-50%, -150%); }
  100% { opacity: 0; transform: translate(-50%, -250%); }
}
```

- [ ] **Step 7: 빌드 통과 확인**

```bash
cd /Users/luca/workspace/greedy/quickness-game
npm run build 2>&1 | grep -E "(error|✓|built|Error)" | head -10
```

Expected: `✓ built in ...`. 에러 없음.

- [ ] **Step 8: 정적 검증**

```bash
git diff --stat HEAD
```
Expected: 2 파일 변경 (CatchGame.jsx, CatchGame.css). 다른 파일 없음.

```bash
grep -n "showFeedback\|catch-target-inner\|catch-feedback" src/components/CatchGame/
```
Expected: 새 토큰들이 jsx와 css에 적절히 등장.

- [ ] **Step 9: Commit**

```bash
git add src/components/CatchGame/CatchGame.jsx src/components/CatchGame/CatchGame.css
git commit -m "feat: 캐치 게임 표적 가시성 개선 및 캐치 피드백 추가 (#10)"
```

---

## Self-Review

### 1. Spec coverage

스펙(`docs/superpowers/specs/2026-05-04-catch-game-shrine-rework-design.md`)의 각 섹션과 task 매핑:

- §0 리워크 사유 → Task 1 전체 (world.png/sprite 제거)
- §2.1 테마 (신전·제단) → Task 1 step 9 (신전 CSS 블록)
- §2.2 화면 레이아웃 → Task 1 step 4 (JSX 구조), step 9 (CSS positioning)
- §2.3 시각 요소 (5개) → Task 1 step 6 (배경), step 9 (기둥/빛줄기/platform), step 8 (빨간 원 위치)
- §2.4 위치 (비율 기반) → Task 1 step 1 (constant), step 8 (CSS top), step 9 (다른 요소들 %)
- §3 게임 룰 (변경 없음) → 자동 충족 (코드 수정 안 함)
- §4.1 catchUtils 변경 → Task 1 step 1
- §4.2 CatchGame.jsx 변경 → Task 1 steps 2·3·4·5
- §4.3 CatchGame.css 변경 → Task 1 steps 6·7·8·9
- §5 데이터 흐름 → 변경 없음 (자동 충족)
- §6 키 입력 → 변경 없음 (자동 충족)
- §7 4번 호환 → Task 1 step 9 (모두 % 기반)
- §8 In Scope → 모두 Task 1
- §9 검증 기준 → Task 2 (12개 항목 체크리스트로 분해)
- §10 위험 → 빨간 원 위치 (420 = 0.7×600 동일) Task 1 step 1에서 해소

✅ 모든 spec 요구사항 매핑됨.

### 2. Placeholder scan

- "TBD"/"TODO"/"implement later" 검색: 없음
- 모든 step에 실제 코드/명령/예상 결과 포함
- 단 "(대략 lines XX-XX)" 같은 안내는 *대략적인 위치* 명시일 뿐 실제 변경할 내용은 코드 블록으로 모두 명시됨 (placeholder 아님)

✅ Placeholder 없음.

### 3. Type / 시그니처 일관성

- `RED_CIRCLE_TOP_RATIO`: catchUtils export → CatchGame.jsx import (Task 1 steps 1·2)
- `circleTopPx`: CatchGame.jsx 내 지역 변수, `RED_CIRCLE_TOP_RATIO * STAGE_HEIGHT_PX` (Task 1 step 3)
- 새 CSS 클래스: `.catch-pillar`, `.catch-pillar-left`, `.catch-pillar-right`, `.catch-light-beam`, `.catch-altar-platform` — JSX(step 4)와 CSS(step 9) 모두 동일 이름 사용
- `@keyframes catch-light-pulse` — `.catch-light-beam`의 animation에서 참조 (step 9 내부)
- 제거된 토큰: `RED_CIRCLE_TOP_PX`, `.catch-greenie`, `@keyframes catch-greenie-walk`, `world.png`, `unified_5_walk_no_weapon.png`, `catch-bg`(world.png 사용 부분만 — 이름은 유지하되 내용 교체)

✅ 시그니처/이름 일관성 OK.
