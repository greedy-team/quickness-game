# 미니게임 화면 확장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 세 미니게임이 새 app-stage(1920×960)을 가득 채우도록 CSS 변경. 게임 좌표/로직은 보존.

**Architecture:** ColorReactionGame과 CatchGame은 base size 1200×600 + `transform: translate(-50%, -50%) scale(1.6)`로 absolute centering & fit. TenSecondsGame은 이미 100%/100% 적용되어 있어 변경 없음.

**Tech Stack:** CSS 변경만. 게임 로직 (catchUtils.js의 STAGE_HEIGHT_PX 등) 보존.

**Spec:** `docs/superpowers/specs/2026-05-04-minigame-stage-expand-design.md`

> **Test 정책:** Vitest 미도입 (앞 PR과 동일). 각 task 끝에서 `rtk proxy npm run build` + `npm run dev`로 수동 시연.

---

## Task 1: ColorReactionGame.css 확장

**Files:**
- Modify: `src/components/ColorReactionGame/ColorReactionGame.css` (lines 2~18 영역)

**현재 (lines 2~18)**:

```css
.dungeon-world {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 800px;
  height: 600px;
  margin: 0 auto;
  font-family: 'NeoDunggeunmo', monospace;
  background: radial-gradient(circle at center, #1a1a2e 0%, #000000 100%);
  overflow: hidden;
  border: 4px solid #111;
  box-shadow: inset 0 0 100px rgba(0,0,0,0.9);
  transition: background 0.1s ease;
}
```

- [ ] **Step 1: `.dungeon-world` 변경**

`width: 100%`, `max-width: 800px`, `height: 600px`, `margin: 0 auto` 4줄을 absolute centering + scale로 교체:

```css
.dungeon-world {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 1200px;
  height: 600px;
  transform: translate(-50%, -50%) scale(1.6);
  transform-origin: center center;
  font-family: 'NeoDunggeunmo', monospace;
  background: radial-gradient(circle at center, #1a1a2e 0%, #000000 100%);
  overflow: hidden;
  border: 4px solid #111;
  box-shadow: inset 0 0 100px rgba(0,0,0,0.9);
  transition: background 0.1s ease;
}
```

핵심 변경: `position: absolute` + `top: 50% / left: 50%` + `width: 1200px` (max-width 제거, 4:3 → 2:1 비율) + `transform: translate(-50%, -50%) scale(1.6)` (centering + fit).

- [ ] **Step 2: Build verify**

```bash
rtk proxy npm run build
```

Expected: build passes (모듈 transform OK).

- [ ] **Step 3: Dev 수동 확인**

```bash
npm run dev
```

테스트 시나리오: intro → world → MG2 진입(↑) → 돌석상이 새 stage 가득 가운데 표시 + letterbox 없음. 안광 + UI 패널들 자연스러움.

- [ ] **Step 4: Commit**

```bash
git add src/components/ColorReactionGame/ColorReactionGame.css
git commit -m "feat: ColorReactionGame stage 1200x600 base + scale 1.6 fit (#12)"
```

---

## Task 2: CatchGame.css 확장

**Files:**
- Modify: `src/components/CatchGame/CatchGame.css` (lines 32~41 영역)

**현재 (lines 32~41)**:

```css
.catch-stage {
  position: relative;
  width: min(1200px, 100%);
  height: 600px;
  margin: 0 auto;
  background: #1a1a2e;
  overflow: hidden;
  border: 2px solid #333;
  --catch-stage-height: 600px;
}
```

- [ ] **Step 1: `.catch-stage` 변경**

`position: relative` → `absolute`, `width`/`margin` 변경, `transform` 추가:

```css
.catch-stage {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1200px;
  height: 600px;
  transform: translate(-50%, -50%) scale(1.6);
  transform-origin: center center;
  background: #1a1a2e;
  overflow: hidden;
  border: 2px solid #333;
  --catch-stage-height: 600px;
}
```

핵심 변경: `position: absolute` + `top/left: 50%` + `width: 1200px` (min() 제거, fixed) + `transform: translate(-50%, -50%) scale(1.6)`. `--catch-stage-height: 600px` CSS 변수 그대로 유지 (떨어지는 애니메이션 거리 600px → scale로 시각 960px).

> **중요**: `src/components/CatchGame/catchUtils.js`의 `STAGE_HEIGHT_PX = 600` 상수는 절대 건드리지 않음. 게임 로직(아이템 위치 계산, RED_CIRCLE_TOP_RATIO * STAGE_HEIGHT_PX)이 600 base 그대로 작동, 시각만 1.6배.

- [ ] **Step 2: Build verify**

```bash
rtk proxy npm run build
```

Expected: build passes.

- [ ] **Step 3: Dev 수동 확인**

```bash
npm run dev
```

테스트 시나리오: world stage 2 → MG3 진입(→) → 캐치 게임이 stage 가득 + 떨어지는 아이템 위치/타이밍이 직관적 (정확히 1.6배 시각 확대). 빨간 원이 화면 70% 위치에 자연스럽게.

- [ ] **Step 4: Commit**

```bash
git add src/components/CatchGame/CatchGame.css
git commit -m "feat: CatchGame stage 1200x600 base + scale 1.6 fit (게임 로직 보존) (#12)"
```

---

## Task 3: 통합 검증

**Files:**
- 변경 없음

- [ ] **Step 1: Final build**

```bash
rtk proxy npm run build
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 2: 풀 플레이 시나리오**

```bash
npm run dev
```

체크리스트:
1. [ ] intro → world stage 0 → 그린이 좌측 등장
2. [ ] MG1 진입(←) → TenSecondsGame이 stage 가득 (이전과 동일, 변경 없음)
3. [ ] MG1 클리어 → world stage 1 → 그린이가 MG1 체크포인트 옆에서 재시작
4. [ ] MG2 진입(↑) → ColorReactionGame이 stage 가득, 돌석상 가운데 + 안광 효과 자연
5. [ ] MG2 클리어 → world stage 2 → MG2 위치
6. [ ] MG3 진입(→) → CatchGame이 stage 가득, 떨어지는 아이템 정확한 타이밍 + 빨간 원 70% 위치
7. [ ] MG3 클리어 → armor → world stage 4 → MG4 → boss → ending
8. [ ] 콘솔 에러 0
9. [ ] viewport 크기 변경 (브라우저 창 리사이즈) 시 stage 자동 비례 fit

- [ ] **Step 3: 잔여 정리 (필요 시)**

체크리스트 실패 항목 있으면 fix 후 commit. 없으면 다음 step.

---

## Self-Review

- ✅ Spec §3.1 표 모든 항목이 task로 매핑됨 (TenSeconds=변경 없음, ColorReaction=Task 1, Catch=Task 2)
- ✅ Spec §4.1 ColorReactionGame absolute centering + scale → Task 1 코드와 정확히 일치
- ✅ Spec §4.2 CatchGame STAGE_HEIGHT_PX 보존 → Task 2 step 1 노트에 명시
- ✅ Spec §5 검증 체크리스트 → Task 3에 그대로 반영
- ✅ Placeholder 없음 (모든 step에 정확한 코드 + 명령어)
- ✅ Type/property 일관: `transform-origin: center center`, `scale(1.6)`, `width: 1200px`, `height: 600px` 두 task 모두 동일
