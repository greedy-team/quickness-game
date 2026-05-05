# 보스전 비주얼 + 무기 분기 + 보스 진입 플로우 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 플레이스홀더 이모지와 다크 그라디언트로 구현된 보스전을 sprite-sheet + `world.png` 배경으로 교체하고, 갑옷 후 그린이가 무기를 든 walk 시트를 쓰도록 분기하며, 미니게임 4 → 보스전 직진입을 "월드씬 → 보스 체크포인트 Space 진입"으로 변경한다.

**Architecture:** Hero 컴포넌트와 동일한 sprite-sheet 패턴(`--end-pos` CSS 변수 + `steps()` keyframes + `key` 강제 리마운트)을 따른다. 새 Boss 컴포넌트가 같은 패턴으로 보스 sprite를 렌더하고, sprites.js 한 곳에 자산 메타데이터를 모은다. BossFightScene은 props/외부 인터페이스를 유지한 채 내부 비주얼만 전면 교체한다.

**Tech Stack:** React 19, Vite 8, Vanilla JS. 테스트 러너 없음 — 단위 검증은 `if (import.meta.env?.DEV) console.assert(...)` IIFE 패턴, 컴포넌트는 빌드 통과 + 수동 시각 검증.

**Spec:** `docs/superpowers/specs/2026-05-06-boss-fight-visual-design.md`

---

## File Structure

```
public/
  sprites/                                 # 신규 자산 없음 — 기존 PNG 8개 그대로 사용
src/
  constants/
    sprites.js                             # 수정 — HERO_SPRITES 확장 + BOSS_SPRITES + HERO_ATTACK_CYCLE 신규
  components/
    Boss/                                  # 신규 디렉토리
      Boss.jsx
      Boss.css
    BossFightScene/
      BossFightScene.jsx                   # 수정 — 비주얼 전면 개편 (Hero/Boss 사용)
      BossFightScene.css                   # 수정 — world.png 배경, 옛 클래스 제거
  scenes/
    WorldScene.jsx                         # 수정 — 그린이 action을 hasArmor에 따라 분기
  App.jsx                                  # 수정 — minigame_4 onContinue → 'world'
```

**책임 분리:**
- `sprites.js`: sprite 메타데이터(시트 경로, 프레임 수, duration)와 frame 박스 상수의 단일 출처. 자산 변경 시 이 파일만 수정.
- `Boss.jsx`: 보스 sprite 렌더링 단일 책임. Hero와 동일한 패턴.
- `Boss.css`: 보스 keyframes(`boss-play`)와 dying 트랜지션. Hero와 분리해 향후 보스 전용 효과 추가 시 영향 격리.
- `BossFightScene.jsx`: HP/phase 상태 + Space 공격 핸들러. Hero/Boss 컴포넌트 props로만 sprite 제어.
- `BossFightScene.css`: 배경 + HUD/idle 패널. sprite 자체 스타일은 컴포넌트 CSS에서 담당.
- `WorldScene.jsx`: 그린이 sprite action 분기는 단일 boolean(`hasArmor`)으로.
- `App.jsx`: 라우팅 결정. 1줄 수정.

---

## Task 1: sprites.js 확장 (그린이 walk_weapon + attack 4종 + 보스)

**Files:**
- Modify: `src/constants/sprites.js` (전면 교체)

기존 `HERO_FRAME_W`, `HERO_FRAME_H`, `HERO_SPRITES.walk_no_weapon`은 유지. 신규 항목 5개 + `HERO_ATTACK_CYCLE` + `BOSS_FRAME_W/H` + `BOSS_SPRITES` 추가.

- [ ] **Step 1: 파일 전체 교체**

```javascript
// src/constants/sprites.js
export const HERO_FRAME_W = 400;
export const HERO_FRAME_H = 220;

export const HERO_SPRITES = {
  walk_no_weapon: {
    src: '/sprites/unified_5_walk_no_weapon.png',
    frames: 8,
    duration: '0.8s',
    loop: true,
  },
  walk_weapon: {
    src: '/sprites/unified_6_walk_weapon.png',
    frames: 8,
    duration: '0.8s',
    loop: true,
  },
  attack_basic: {
    src: '/sprites/unified_1_attack_basic.png',
    frames: 8,
    duration: '0.6s',
    loop: false,
  },
  attack_thrust: {
    src: '/sprites/unified_2_attack_thrust.png',
    frames: 5,
    duration: '0.4s',
    loop: false,
  },
  attack_upslash: {
    src: '/sprites/unified_3_attack_upslash.png',
    frames: 8,
    duration: '0.6s',
    loop: false,
  },
  attack_down: {
    src: '/sprites/unified_4_attack_down.png',
    frames: 8,
    duration: '0.6s',
    loop: false,
  },
};

// BossFightScene에서 매 공격마다 다음 인덱스로 순환
export const HERO_ATTACK_CYCLE = [
  'attack_basic',
  'attack_thrust',
  'attack_upslash',
  'attack_down',
];

export const BOSS_FRAME_W = 500;
export const BOSS_FRAME_H = 360;

export const BOSS_SPRITES = {
  idle: {
    src: '/sprites/unified_boss_idle.png',
    frames: 8,
    duration: '1.6s',
    loop: true,
  },
  attack: {
    src: '/sprites/unified_boss_attack.png',
    frames: 9,
    duration: '1.0s',
    loop: false,
  },
};

if (import.meta.env?.DEV) {
  console.assert(HERO_SPRITES.walk_weapon.frames === 8, 'sprites: walk_weapon 8 frames');
  console.assert(HERO_SPRITES.attack_thrust.frames === 5, 'sprites: thrust 5 frames');
  console.assert(HERO_ATTACK_CYCLE.length === 4, 'sprites: attack cycle 4 items');
  console.assert(HERO_ATTACK_CYCLE.every((k) => HERO_SPRITES[k]), 'sprites: cycle keys exist');
  console.assert(BOSS_SPRITES.idle.loop === true, 'sprites: boss idle loops');
  console.assert(BOSS_SPRITES.attack.loop === false, 'sprites: boss attack one-shot');
  console.assert(BOSS_FRAME_W === 500 && BOSS_FRAME_H === 360, 'sprites: boss frame 500x360');
}
```

- [ ] **Step 2: 빌드 + 기존 walk_no_weapon import 무결 확인**

```bash
npm run build
grep -rn "HERO_SPRITES\|HERO_FRAME" src/
```

Expected: 빌드 성공. grep으로 `Hero.jsx`만 매치(정상 사용처) — 다른 곳 의존 없음 확인.

- [ ] **Step 3: Commit**

```bash
git add src/constants/sprites.js
git commit -m "feat: sprites.js에 그린이 attack 4종 + 보스 시트 추가 (#18)"
```

---

## Task 2: Boss 컴포넌트 신규

**Files:**
- Create: `src/components/Boss/Boss.jsx`
- Create: `src/components/Boss/Boss.css`

Hero와 동일한 sprite-sheet 패턴. `scaleX(-1)`로 빔이 좌측(그린이) 향하게 반전. caller에서 `key={action}`로 리마운트.

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p src/components/Boss
```

- [ ] **Step 2: `Boss.jsx` 작성**

```jsx
// src/components/Boss/Boss.jsx
import { BOSS_SPRITES, BOSS_FRAME_W, BOSS_FRAME_H } from '../../constants/sprites';
import './Boss.css';

/**
 * Sprite-sheet boss renderer.
 * NOTE: 애니메이션을 다시 시작하려면 caller가 `<Boss key={action} ... />`처럼 key를 넣어야 한다.
 */
export default function Boss({
  action = 'idle',
  x = 1400,
  bottom = 151,
  dying = false,
}) {
  const a = BOSS_SPRITES[action];
  if (!a) return null;
  return (
    <div
      className={dying ? 'boss-sprite is-dying' : 'boss-sprite'}
      style={{
        bottom,
        left: x,
        width: BOSS_FRAME_W,
        height: BOSS_FRAME_H,
        backgroundImage: `url(${a.src})`,
        backgroundSize: `${BOSS_FRAME_W * a.frames}px ${BOSS_FRAME_H}px`,
        animation: `boss-play ${a.duration} steps(${a.frames}) ${a.loop ? 'infinite' : 'forwards'}`,
        ['--end-pos']: `-${BOSS_FRAME_W * a.frames}px`,
      }}
    />
  );
}
```

- [ ] **Step 3: `Boss.css` 작성**

```css
@keyframes boss-play {
  to { background-position: var(--end-pos) 0; }
}

.boss-sprite {
  position: absolute;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  pointer-events: none;
  /* 빔이 우측 발사 → 좌측(그린이)으로 향하게 반전 */
  transform: scaleX(-1);
}

.boss-sprite.is-dying {
  animation-play-state: paused !important;
  opacity: 0;
  transform: scaleX(-1) scale(0.5);
  transition: opacity 600ms ease-out, transform 600ms ease-out;
}
```

- [ ] **Step 4: 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공. (아직 import하는 곳 없음 — Task 5에서 BossFightScene이 사용)

- [ ] **Step 5: Commit**

```bash
git add src/components/Boss/
git commit -m "feat: Boss sprite 컴포넌트 (#18)"
```

---

## Task 3: WorldScene 그린이 action 분기

**Files:**
- Modify: `src/scenes/WorldScene.jsx` (Hero 사용 부분만)

`state.hasArmor` 분기로 walk_no_weapon ↔ walk_weapon. 갑옷 씬을 통과한 그린이가 무기를 든 시트로 보임.

- [ ] **Step 1: `WorldScene.jsx`에서 Hero 사용 부분 수정**

기존(127-133번째 줄):
```jsx
      <Hero
        x={heroX}
        action="walk_no_weapon"
        playing={isMoving}
        facing={facing}
      />
```

다음으로 교체:
```jsx
      <Hero
        x={heroX}
        action={state.hasArmor ? 'walk_weapon' : 'walk_no_weapon'}
        key={state.hasArmor ? 'walk_weapon' : 'walk_no_weapon'}
        playing={isMoving}
        facing={facing}
      />
```

`key` 추가 이유: armor 씬을 거쳐 `hasArmor`가 true로 바뀐 뒤 다시 world에 진입할 때 sprite 시트가 매끄럽게 교체되도록. 두 시트 모두 frames=8 / 0.8s라 key 없어도 시각적으로 큰 차이는 없지만 안전 가드.

- [ ] **Step 2: 빌드 + dev 서버에서 분기 확인**

```bash
npm run build
```

Expected: 빌드 성공. (수동 검증은 Task 7에서 일괄)

- [ ] **Step 3: Commit**

```bash
git add src/scenes/WorldScene.jsx
git commit -m "feat: 월드씬 그린이 무기 분기 (hasArmor) (#18)"
```

---

## Task 4: App.jsx — minigame_4 → world 진입

**Files:**
- Modify: `src/App.jsx` (minigame_4 분기의 onContinue만)

기존: 미니게임 4 클리어 → `boss_fight` 직진입. 변경 후: `world`로 보내 worldStage=5의 보스 체크포인트에서 Space로 진입.

- [ ] **Step 1: `App.jsx` minigame_4 분기 수정**

기존 (현재 src/App.jsx):
```jsx
      {state.scene === 'minigame_4' && (
        <ParallelGame
          onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
          onContinue={() => {
            dispatch({ type: 'SET_WORLD_STAGE', payload: 5 });
            dispatch({ type: 'GO_TO_SCENE', payload: 'boss_fight' });
          }}
        />
      )}
```

다음으로 교체 (1줄만 변경 — `'boss_fight'` → `'world'`):
```jsx
      {state.scene === 'minigame_4' && (
        <ParallelGame
          onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
          onContinue={() => {
            dispatch({ type: 'SET_WORLD_STAGE', payload: 5 });
            dispatch({ type: 'GO_TO_SCENE', payload: 'world' });
          }}
        />
      )}
```

다른 분기는 변경 없음. `WorldScene`의 `SCREEN2[1]` 보스 체크포인트가 이미 `'boss_fight'`를 디스패치하므로 추가 변경 불필요.

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: 미니게임4 클리어 후 월드씬으로, 보스 체크포인트에서 진입 (#18)"
```

---

## Task 5: BossFightScene 비주얼 전면 개편

**Files:**
- Modify: `src/components/BossFightScene/BossFightScene.jsx` (전면 교체)
- Modify: `src/components/BossFightScene/BossFightScene.css` (전면 교체)

이모지 + shake → Hero/Boss sprite + sprite 자체 attack 애니. 외부 props/onCleared 인터페이스는 유지.

- [ ] **Step 1: `BossFightScene.jsx` 전체 교체**

```jsx
// src/components/BossFightScene/BossFightScene.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import Hero from '../Hero';
import Boss from '../Boss/Boss';
import { HERO_ATTACK_CYCLE, HERO_SPRITES } from '../../constants/sprites';
import { BOSS_MAX_HP, clampDamage } from './bossUtils';
import './BossFightScene.css';

const DEATH_ANIM_MS = 600;
const BOSS_ATTACK_DURATION_MS = 1000;
const HERO_ATTACK_RESET_MS = 700;

export default function BossFightScene({ totalScore, onCleared }) {
  const [bossHP, setBossHP] = useState(BOSS_MAX_HP);
  const [phase, setPhase] = useState('fighting'); // 'fighting' | 'dying'
  const [bossAction, setBossAction] = useState('idle');
  const [bossActionTick, setBossActionTick] = useState(0);
  const [heroAttack, setHeroAttack] = useState(null); // null = idle (walk_weapon 정지), or attack_xxx key
  const [heroAttackTick, setHeroAttackTick] = useState(0);
  const damage = clampDamage(totalScore);
  const clearedRef = useRef(false);
  const attackCycleRef = useRef(0);
  const bossActionTimerRef = useRef(null);
  const heroActionTimerRef = useRef(null);

  const triggerAttack = useCallback(() => {
    if (phase !== 'fighting') return;
    // HP 차감
    setBossHP((hp) => Math.max(0, hp - damage));
    // 그린이 attack 시트 순환
    const idx = attackCycleRef.current;
    attackCycleRef.current = (idx + 1) % HERO_ATTACK_CYCLE.length;
    setHeroAttack(HERO_ATTACK_CYCLE[idx]);
    setHeroAttackTick((n) => n + 1);
    // 보스 attack 1회 재생
    setBossAction('attack');
    setBossActionTick((n) => n + 1);
    // idle 복귀 타이머
    if (bossActionTimerRef.current) clearTimeout(bossActionTimerRef.current);
    bossActionTimerRef.current = setTimeout(() => {
      setBossAction('idle');
    }, BOSS_ATTACK_DURATION_MS);
    if (heroActionTimerRef.current) clearTimeout(heroActionTimerRef.current);
    heroActionTimerRef.current = setTimeout(() => {
      setHeroAttack(null);
    }, HERO_ATTACK_RESET_MS);
  }, [phase, damage]);

  // HP 0 도달 시 사망 연출 → onCleared
  useEffect(() => {
    if (bossHP > 0) return;
    if (clearedRef.current) return;
    clearedRef.current = true;
    setPhase('dying');
    const timer = setTimeout(() => {
      onCleared?.();
    }, DEATH_ANIM_MS);
    return () => clearTimeout(timer);
  }, [bossHP, onCleared]);

  // 키 입력: Space/Enter → 공격
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      e.preventDefault();
      triggerAttack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggerAttack]);

  // 언마운트 시 타이머 정리
  useEffect(() => () => {
    if (bossActionTimerRef.current) clearTimeout(bossActionTimerRef.current);
    if (heroActionTimerRef.current) clearTimeout(heroActionTimerRef.current);
  }, []);

  const hpRatio = Math.max(0, bossHP / BOSS_MAX_HP);
  const heroAction = heroAttack ?? 'walk_weapon';
  const heroPlaying = !!heroAttack; // 공격 중이면 forwards 재생, idle이면 첫 프레임 정지

  return (
    <div className="boss-fight-stage">
      <div className="boss-fight-hud">
        <div className="boss-fight-hp-label">
          <span>👹 BOSS HP</span>
          <span>{bossHP} / {BOSS_MAX_HP}</span>
        </div>
        <div className="boss-fight-hp-bar">
          <div
            className="boss-fight-hp-fill"
            style={{ width: `${hpRatio * 100}%` }}
          />
        </div>
      </div>

      <div className="boss-fight-arena">
        <Hero
          key={heroAttack ? `hero-attack-${heroAttackTick}` : 'hero-idle'}
          action={heroAction}
          x={900}
          bottom={151}
          facing="right"
          playing={heroPlaying}
        />
        <Boss
          key={`boss-${bossActionTick}`}
          action={bossAction}
          x={1400}
          bottom={151}
          dying={phase === 'dying'}
        />
      </div>

      <div className="boss-fight-idle-panel">
        <p className="boss-fight-instruction">
          <b>Space</b>로 공격! (1타 데미지: <b>{damage}</b>)
        </p>
        <p className="boss-fight-tip">
          누적 점수가 그대로 데미지가 됩니다. 점수는 보존돼요.
        </p>
      </div>
    </div>
  );
}
```

핵심 포인트:
- `heroAttack === null`일 때 `heroAction='walk_weapon'` + `playing=false` → 첫 프레임에서 정지(갑옷 든 그린이가 가만히 서 있음).
- attack 시트 4종을 `attackCycleRef`로 순환(0→1→2→3→0…).
- `key`에 tick을 포함시켜 같은 시트 재공격 시에도 리마운트 강제 → 애니 처음부터 재생.
- 사망 시 `dying` prop으로 보스만 페이드, 그린이는 정적 유지.
- 언마운트 cleanup으로 타이머 누수 방지.

- [ ] **Step 2: `BossFightScene.css` 전체 교체**

```css
/* src/components/BossFightScene/BossFightScene.css */
.boss-fight-stage {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.45) 100%),
    url('/bg/world.png') center bottom / cover no-repeat;
  image-rendering: pixelated;
  color: #fff;
  overflow: hidden;
}

.boss-fight-hud {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0, 0, 0, 0.75);
  border: 3px solid #fff;
  padding: 12px 16px;
  z-index: 10;
}
.boss-fight-hp-label {
  display: flex;
  justify-content: space-between;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
}
.boss-fight-hp-bar {
  width: 100%;
  height: 24px;
  background: #1a1a1a;
  border: 3px solid #fff;
  overflow: hidden;
}
.boss-fight-hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff4444 0%, #ff8800 100%);
  transition: width 200ms ease-out;
}

.boss-fight-arena {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.boss-fight-idle-panel {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid #fff;
  padding: 12px 20px;
  z-index: 10;
}
.boss-fight-instruction { font-size: 18px; margin: 0 0 4px; }
.boss-fight-tip { font-size: 13px; margin: 0; opacity: 0.7; }
```

기존에 있던 다음 클래스/keyframes는 모두 제거됨:
- `.boss-fight-hero`, `.boss-fight-hero-name`
- `.boss-fight-boss`, `.boss-fight-boss[data-hit]`, `.boss-fight-boss.is-dying`
- `@keyframes boss-hit`

이들의 책임은 Hero/Boss 컴포넌트와 그 자체 CSS로 이전됨.

- [ ] **Step 3: 빌드 + lint**

```bash
npm run build
```

(주의: `npm run lint`는 pre-existing config 이슈로 실패 — 무시.)

Expected: 빌드 성공.

- [ ] **Step 4: Commit**

```bash
git add src/components/BossFightScene/BossFightScene.jsx src/components/BossFightScene/BossFightScene.css
git commit -m "feat: BossFightScene 비주얼 sprite로 전면 개편 (#18)"
```

---

## Task 6: 빌드 통합 검증

**Files:** 없음 (검증만)

모든 변경이 빌드/import 그래프에 정상 반영되는지 최종 확인.

- [ ] **Step 1: 클린 빌드**

```bash
npm run build 2>&1 | tail -20
```

Expected: 빌드 성공. 53+ 모듈 transformed. asset 경로(/sprites/, /bg/)는 빌드에 영향 없음(public/).

- [ ] **Step 2: import 그래프 정합성 확인**

```bash
grep -rn "HERO_SPRITES\|BOSS_SPRITES\|HERO_ATTACK_CYCLE\|HERO_FRAME_W\|BOSS_FRAME_W" src/
```

Expected:
- `src/constants/sprites.js`: 정의
- `src/components/Hero.jsx`: HERO_SPRITES, HERO_FRAME_W/H
- `src/components/Boss/Boss.jsx`: BOSS_SPRITES, BOSS_FRAME_W/H
- `src/components/BossFightScene/BossFightScene.jsx`: HERO_ATTACK_CYCLE, HERO_SPRITES (옵션)
- 다른 곳 없음

- [ ] **Step 3: 옛 클래스 제거 확인**

```bash
grep -rn "boss-fight-hero\|boss-fight-boss\|boss-hit" src/
```

Expected: 매치 없음.

- [ ] **Step 4: 변경 없으면 commit 없음 (검증만)**

---

## Task 7: 수동 시각 검증

**Files:** 없음 (검증만)

dev 서버로 모든 시나리오 시각적으로 통과 확인. 문제 발견 시 해당 task로 돌아가 수정.

- [ ] **Step 1: dev 서버 기동**

```bash
npm run dev
```

브라우저로 `http://localhost:5173/` 접속. 콘솔(F12) 열어두기. assert 실패 메시지 없는지 확인.

- [ ] **Step 2: 시나리오 1 — 월드씬 그린이 무기 분기**

1. 인트로 → Space로 시작 → 미니게임 1, 2, 3 클리어 (또는 빠르게 타임아웃)
2. armor 씬에서 Space → world 진입 (worldStage=4)
3. 그린이가 **`unified_6_walk_weapon.png`** 시트로 걷는지 확인 (검을 들고 있음)
4. 미니게임 4 체크포인트로 이동 → MG4 진입

Expected: armor 씬 후 그린이 sprite 변경됨. 콘솔 에러 없음.

- [ ] **Step 3: 시나리오 2 — 미니게임 4 → world 보스 체크포인트 → 보스전**

1. 미니게임 4 클리어
2. (이전: 자동 보스전 진입) → (변경 후: world 진입, worldStage=5)
3. 화면 2 활성: MG4 체크는 done(✓), 보스 체크포인트 활성(펄스 애니메이션)
4. 그린이가 보스 체크포인트(우측, x=1440)로 이동
5. 도착 시 "Space로 입장" 토스트 표시
6. Space 키 → BossFightScene 전환

Expected: 자동 진입이 아닌 사용자 입력으로 보스전 진입.

- [ ] **Step 4: 시나리오 3 — 보스전 비주얼**

1. BossFightScene 진입 시 다음 확인:
   - 배경: world.png (다크 그라디언트 오버레이)
   - 좌측: 갑옷 그린이 sprite(walk_weapon 첫 프레임 정지) at x≈900
   - 우측: 보스 sprite(idle 루프, 화염이 천천히 흔들림) at x=1400, scaleX(-1)로 좌측 향함
   - 상단: HP 바(2000/2000)
   - 하단: idle 패널 "Space로 공격! (1타 데미지: NNN)"
   - 그린이/보스 발 라인이 같은 바닥에 있음
2. Space 1회:
   - 그린이가 attack_basic 1회 재생(검 휘두름)
   - 보스가 attack 1회 재생(빔이 좌측으로 발사)
   - HP 차감
   - 그린이 검 이펙트가 보스 박스에 닿는 것이 시각적으로 확인됨
   - 두 sprite 끝나면 idle 복귀

Expected: 모두 매끄럽게 동작. 콘솔 에러 없음.

- [ ] **Step 5: 시나리오 4 — attack 시트 4종 순환**

1. Space 4회 연속 → 그린이가 basic → thrust → upslash → down 순으로 재생
2. Space 5회째 → 다시 basic
3. attack_thrust(5 frames, 0.4s)도 자연스럽게 재생되는지 확인 (짧지만 어색하지 않음)

Expected: 4종이 정확한 순서로 순환. 보스 attack은 매번 동일.

- [ ] **Step 6: 시나리오 5 — 보스 사망**

1. Space 연타로 HP 0 도달
2. 보스 sprite가 페이드아웃 + 0.5배 축소 (600ms)
3. 그린이는 정적 유지
4. NicknamePromptModal로 자동 전환

Expected: 사망 연출 후 닉네임 입력 모달 정상 진입.

- [ ] **Step 7: 시나리오 6 — 통합 플로우 (랭킹까지)**

전체 플로우 한 번에:
1. 인트로 → 시작
2. 미니게임 1~4 클리어
3. armor 씬(검+갑옷 받음 — 그린이 sprite 무기로 바뀜 확인)
4. 미니게임 4 클리어
5. world (worldStage=5) → 보스 체크포인트 → Space
6. 보스전 sprite 비주얼 → Space 연타 → 사망
7. 닉네임 입력 → 랭킹씬 → 계속하기 → ending

Expected: 모든 단계 끊김 없음. 이전에 만든 랭킹/닉네임 모듈은 변경 없으므로 정상 동작.

- [ ] **Step 8: 문제 발견 시 해당 task로 돌아가 수정 후 commit. 검증만으로 변경 없으면 commit 없음.**

---

## Self-Review 결과

**Spec coverage:**
- §2 시트 사양 → Task 1 (sprites.js 등록) ✅
- §3 진입 플로우 → Task 4 (App.jsx) ✅
- §4 sprites.js 확장 → Task 1 ✅
- §5 WorldScene 그린이 분기 → Task 3 ✅
- §6 Boss 컴포넌트 → Task 2 ✅
- §7 BossFightScene 개편 → Task 5 ✅
- §8 App.jsx 변경 → Task 4 ✅
- §9 동작 주의점 → Task 2 (scaleX), Task 5 (key 강제 리마운트, setTimeout idle 복귀) ✅
- §10 수동 검증 → Task 7 ✅
- §11 마이그레이션 (props 인터페이스 유지) → Task 5 (외부 props 변경 없음) ✅

**Type/시그니처 일관성:**
- `HERO_SPRITES` 키: walk_no_weapon / walk_weapon / attack_basic / attack_thrust / attack_upslash / attack_down — Task 1, 3, 5에서 일관
- `HERO_ATTACK_CYCLE`: 4개 키 (`attack_basic, attack_thrust, attack_upslash, attack_down`) — Task 1, 5
- `BOSS_SPRITES` 키: idle / attack — Task 1, 2, 5
- `Hero` props (action, x, bottom, facing, playing, key) — Task 3, 5에서 동일하게 사용
- `Boss` props (action, x, bottom, dying, key) — Task 2 정의, Task 5 사용
- `BOSS_MAX_HP`, `clampDamage` — bossUtils.js (이미 존재) → Task 5에서 사용
- BossFightScene 외부 props (`totalScore, onCleared`) — App.jsx와 호환 유지

**Placeholder scan:** 모든 step에 실제 코드/명령 포함. "TODO" 등 없음.
