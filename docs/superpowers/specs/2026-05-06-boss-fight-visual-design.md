# 보스전 비주얼 + 무기 분기 + 보스 진입 플로우 — 디자인 (Spec)

- **이슈/브랜치:** 진행 중인 `20260505_#18_PRD_3_5단계_보스전_누적_포인트_기반_랭킹_시스템_구현` 위에 추가 작업
- **작성일:** 2026-05-06
- **선행:** 보스전 메커니즘은 spec `2026-05-05-boss-fight-ranking-design.md`로 이미 구현됨. 이 spec은 비주얼 교체와 진입 플로우 수정만 다룬다.

---

## 1. 목적과 범위

### 1.1 목적

플레이스홀더 이모지(🛡️⚔️/👹)와 다크 그라디언트 배경으로 구현된 보스전을 실제 sprite-sheet + `world.png` 배경으로 교체한다. 동시에 그린이가 갑옷을 얻은 후에는 무기를 든 walk 시트를 사용하도록 분기하고, 미니게임 4 클리어 직후 자동으로 보스전에 진입하던 플로우를 "월드씬에서 보스 체크포인트로 걸어가 Space로 진입"하도록 변경한다.

### 1.2 인-스코프

- `App.jsx` minigame_4 onContinue 변경: `boss_fight` 직접 진입 → `world` 진입(worldStage=5 유지)
- `WorldScene` 그린이 sprite 분기: `state.hasArmor`에 따라 walk_no_weapon ↔ walk_weapon
- `sprites.js` 확장: 그린이 walk_weapon, attack 1~4 + 보스 idle/attack 등록 + BOSS frame 상수
- 신규 `Boss` 컴포넌트 (`src/components/Boss/Boss.{jsx,css}`)
- `BossFightScene` 전면 비주얼 교체: 배경/그린이/보스 sprite, 공격 시 양쪽 attack 동시 재생
- HP 바·idle 패널 가독성 보정 (검은 박스 톤 강화)

### 1.3 아웃-오브-스코프

- 그린이 attack 시트별 정렬 미세 조정/등급 매칭 — 단순 순환만
- 그린이 사망/피격 비주얼 (패배 분기 없음, 변경 없음)
- 사운드 / BGM
- 다른 미니게임 씬 비주얼 / 다른 씬에서의 그린이 sprite 분기

---

## 2. 시트 사양 (실측)

PNG 헤더에서 측정한 결과:

| 자산 | 시트 폭 × 높이 | frame_w × frame_h | frames | duration | loop |
|---|---|---|---|---|---|
| `unified_5_walk_no_weapon.png` | 3200×220 | 400×220 | 8 | 0.8s | true |
| `unified_6_walk_weapon.png` | 3200×220 | 400×220 | 8 | 0.8s | true |
| `unified_1_attack_basic.png` | 3200×220 | 400×220 | 8 | 0.6s | false |
| `unified_2_attack_thrust.png` | 2000×220 | 400×220 | 5 | 0.4s | false |
| `unified_3_attack_upslash.png` | 3200×220 | 400×220 | 8 | 0.6s | false |
| `unified_4_attack_down.png` | 3200×220 | 400×220 | 8 | 0.6s | false |
| `unified_boss_idle.png` | 4000×360 | 500×360 | 8 | 1.6s | true |
| `unified_boss_attack.png` | 4500×360 | 500×360 | 9 | 1.0s | false |

- 그린이 frame: `HERO_FRAME_W=400, HERO_FRAME_H=220` (기존 상수 그대로)
- 보스 frame: `BOSS_FRAME_W=500, BOSS_FRAME_H=360` (신규 상수)
- 그린이/보스 모두 발 8px 여백 정렬 → 동일 `bottom`에 두면 같은 바닥

---

## 3. 진입 플로우 변경

### 3.1 전 (현재)

```
ParallelGame onContinue
  → SET_WORLD_STAGE 5
  → GO_TO_SCENE 'boss_fight'  // 자동 전환
```

### 3.2 후

```
ParallelGame onContinue
  → SET_WORLD_STAGE 5
  → GO_TO_SCENE 'world'        // 보스 체크포인트 활성 화면으로
WorldScene (worldStage=5, SCREEN2[1] '보스' 활성)
  → 그린이가 보스 체크포인트(centerX=1440)로 이동
  → Space 키 (체크포인트 hit-range 내) → GO_TO_SCENE 'boss_fight'
BossFightScene → ...
```

`WorldScene` 자체에는 추가 분기 불필요 (현재 SCREEN2[1] = 보스 체크포인트 → `'boss_fight'` 디스패치 로직이 이미 존재).

---

## 4. sprites.js 확장

```js
// src/constants/sprites.js
export const HERO_FRAME_W = 400;
export const HERO_FRAME_H = 220;

export const HERO_SPRITES = {
  walk_no_weapon: { src: '/sprites/unified_5_walk_no_weapon.png', frames: 8, duration: '0.8s', loop: true },
  walk_weapon:    { src: '/sprites/unified_6_walk_weapon.png',    frames: 8, duration: '0.8s', loop: true },
  attack_basic:   { src: '/sprites/unified_1_attack_basic.png',   frames: 8, duration: '0.6s', loop: false },
  attack_thrust:  { src: '/sprites/unified_2_attack_thrust.png',  frames: 5, duration: '0.4s', loop: false },
  attack_upslash: { src: '/sprites/unified_3_attack_upslash.png', frames: 8, duration: '0.6s', loop: false },
  attack_down:    { src: '/sprites/unified_4_attack_down.png',    frames: 8, duration: '0.6s', loop: false },
};

// 그린이 attack 순환 순서
export const HERO_ATTACK_CYCLE = ['attack_basic', 'attack_thrust', 'attack_upslash', 'attack_down'];

// 보스
export const BOSS_FRAME_W = 500;
export const BOSS_FRAME_H = 360;
export const BOSS_SPRITES = {
  idle:   { src: '/sprites/unified_boss_idle.png',   frames: 8, duration: '1.6s', loop: true },
  attack: { src: '/sprites/unified_boss_attack.png', frames: 9, duration: '1.0s', loop: false },
};
```

---

## 5. WorldScene 그린이 분기

`WorldScene.jsx`에서 `Hero`에 `action` prop으로 분기:

```jsx
const heroAction = state.hasArmor ? 'walk_weapon' : 'walk_no_weapon';
<Hero x={heroX} action={heroAction} playing={isMoving} facing={facing} />
```

`Hero` 컴포넌트는 `key={action}`이 caller에서 들어와야 sprite 시트 교체 시 애니메이션 리셋되는 기존 패턴(`Hero.jsx` 주석 참조). 단, walk_no_weapon ↔ walk_weapon 전환은 armor 씬 통과 시점 1회뿐이고 두 시트 모두 8 frames / 0.8s라 key 강제 리마운트 없이도 매끄러움. 안전하게 `key={heroAction}` 추가.

---

## 6. Boss 컴포넌트

`src/components/Boss/Boss.jsx` (Hero와 동일 패턴):

```jsx
import { BOSS_SPRITES, BOSS_FRAME_W, BOSS_FRAME_H } from '../../constants/sprites';
import './Boss.css';

export default function Boss({ action = 'idle', x = 1400, bottom = 151 }) {
  const a = BOSS_SPRITES[action];
  if (!a) return null;
  return (
    <div
      className="boss-sprite"
      style={{
        bottom, left: x,
        width: BOSS_FRAME_W, height: BOSS_FRAME_H,
        backgroundImage: `url(${a.src})`,
        backgroundSize: `${BOSS_FRAME_W * a.frames}px ${BOSS_FRAME_H}px`,
        animation: `boss-play ${a.duration} steps(${a.frames}) ${a.loop ? 'infinite' : 'forwards'}`,
        ['--end-pos']: `-${BOSS_FRAME_W * a.frames}px`,
        transform: 'scaleX(-1)', // 빔이 좌측(그린이)으로 향하게
      }}
    />
  );
}
```

`Boss.css`:

```css
@keyframes boss-play {
  to { background-position: var(--end-pos) 0; }
}
.boss-sprite {
  position: absolute;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  pointer-events: none;
}
.boss-sprite.is-dying {
  animation-play-state: paused !important;
  opacity: 0;
  transform: scaleX(-1) scale(0.5);
  transition: opacity 600ms, transform 600ms;
}
```

`hero-play`와 keyframes 이름을 분리하는 이유: 두 keyframes 정의가 동일하더라도 컴포넌트별 격리 + 향후 보스 전용 효과(예: 미세 떨림) 추가 시 영향 분리.

`key={action}`은 caller(BossFightScene)에서 강제 — Hero 컴포넌트와 같은 규약.

---

## 7. BossFightScene 개편

### 7.1 props / state (변경/유지)

- props: `totalScore, onCleared` (변경 없음)
- state: `bossHP`, `phase ('fighting'|'dying')` (유지) + 신규
  - `bossActionTick: number` — 보스 attack 키 리마운트용
  - `heroAttackTick: number` — 그린이 attack 키 리마운트용
- ref:
  - `clearedRef` (유지)
  - `attackCycleRef: number` (그린이 attack 순환 인덱스 0~3)
  - `bossActionTimerRef`, `heroActionTimerRef` (idle 복귀 setTimeout 핸들)

### 7.2 공격 로직 (Space)

```jsx
const onAttackKey = () => {
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
  // 각 시트 duration 후 idle 복귀
  clearTimeout(bossActionTimerRef.current);
  bossActionTimerRef.current = setTimeout(() => setBossAction('idle'), 1000); // boss attack 1.0s
  clearTimeout(heroActionTimerRef.current);
  heroActionTimerRef.current = setTimeout(() => setHeroAttack(null), 700); // 가장 긴 그린이 attack 0.6s + 여유
};
```

`heroAttack === null` 일 때는 `walk_weapon`으로 정적 표시(playing=false).

### 7.3 렌더 구조

```jsx
<div className={`boss-fight-stage ${phase === 'dying' ? 'is-dying' : ''}`}>
  <div className="boss-fight-hud">...HP 바...</div>
  <div className="boss-fight-arena">
    <Hero
      key={heroAttack ? `attack-${heroAttackTick}` : 'idle'}
      action={heroAttack ?? 'walk_weapon'}
      x={900} bottom={151}
      facing="right"
      playing={!!heroAttack} // 정적이면 first frame 고정, 공격 중엔 forwards 재생
    />
    <Boss
      key={`boss-${bossActionTick}`}
      action={bossAction}
      x={1400} bottom={151}
    />
  </div>
  <div className="boss-fight-idle-panel">...Space로 공격...</div>
</div>
```

`Hero`의 `playing={false}`일 때 walk_weapon은 첫 프레임 정지 — 갑옷 입은 그린이가 가만히 서 있는 비주얼.

### 7.4 사망 처리

- `bossHP <= 0` → phase='dying' → `clearedRef` true → 600ms 후 `onCleared`.
- 사망 동안 `boss-sprite.is-dying` 클래스로 페이드+축소.
- 그린이는 dying 동안 정적 유지.

### 7.5 CSS 변경 (`BossFightScene.css`)

- `.boss-fight-stage` 배경 교체:
  ```css
  background: url('/bg/world.png') center bottom / cover no-repeat,
              linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.4) 100%);
  image-rendering: pixelated;
  ```
- 기존 emoji용 클래스 제거: `.boss-fight-hero`, `.boss-fight-hero-name`, `.boss-fight-boss`, `.boss-fight-boss[data-hit]`, `@keyframes boss-hit`, `.boss-fight-boss.is-dying`.
- `.boss-fight-arena`: flex 정렬 제거. 자식 sprite가 absolute로 자기 위치를 잡으므로 단순한 영역 컨테이너.
- HP 바·idle 패널은 검은 박스 강화로 가독성 유지(이미 그 패턴이라 기존 스타일 거의 유지).

---

## 8. App.jsx 변경

`minigame_4` 분기의 `onContinue` 1줄만 변경:

```jsx
onContinue={() => {
  dispatch({ type: 'SET_WORLD_STAGE', payload: 5 });
  dispatch({ type: 'GO_TO_SCENE', payload: 'world' });  // 'boss_fight' → 'world'
}}
```

다른 분기 변경 없음. WorldScene SCREEN2[1] 보스 체크포인트가 이미 `'boss_fight'`를 디스패치하므로 추가 변경 불필요.

---

## 9. 동작 시 주의점 (사용자 메시지 반영)

- **`transform: scaleX(-1)` 보스 필수** — 시트의 빔이 우측 발사. 그린이는 좌측에 위치하므로 보스를 좌우 반전.
- **attack 시트 1회 재생 후 idle 복귀** — `key` 변경으로 리마운트 강제 + `forwards` 후 `setTimeout`으로 명시적 idle 전환. `onAnimationEnd`도 가능하지만 이미 `setTimeout` 패턴이 코드 단순.
- **idle duration 1.6s** — 화염이 천천히 흔들리도록 (사용자 명시).
- **두 시트 같은 `bottom=151`** — 같은 바닥 정렬.
- **그린이 attack thrust(5 frames, 0.4s)는 짧음** — `setTimeout` idle 복귀를 700ms 통일하면 thrust 끝난 뒤 0.3s 정도 마지막 프레임 보임. 자연스러우므로 통일값 사용.
- **공격 거리(대치 구도)** — 그린이 x=900, 보스 x=1400으로 두 sprite 박스가 인접하게 배치해 검 이펙트가 보스 박스에 닿는 시각을 확보. 정확한 x값은 sprite 본체 픽셀 위치(보스 본체는 시트의 박스 안 280px 영역, scaleX(-1) 후 시각적 우측)를 보면서 implementation 단계에서 미세 조정 가능.

---

## 10. 테스트 / 수동 검증

- 미니게임 1~4 클리어 후 `world`(worldStage=5) 진입 확인. 보스 체크포인트 활성, MG4 체크는 done 표시.
- 그린이가 보스 체크포인트로 이동 가능, 진입 토스트 표시.
- 보스 체크포인트에서 Space 키 → BossFightScene 전환.
- BossFightScene: world.png 배경, 그린이 sprite(walk_weapon 정지), 보스 idle 루프 확인.
- Space 연타: 그린이 attack 4종 순환(basic→thrust→upslash→down→basic…), 보스 attack 동시 재생, HP 차감.
- HP 0 → 보스 페이드아웃 → 닉네임 입력 모달.
- 월드씬에서도 그린이가 무기 들고 걷는지 확인 (armor 씬 후).

---

## 11. 마이그레이션 / 호환성

- 기존 `BossFightScene` 비주얼은 완전히 교체되지만 외부 인터페이스(`totalScore`, `onCleared`)는 변경 없음.
- 기존 보스전 메커니즘(`bossUtils.clampDamage`, HP 차감) 그대로 유지.
- 사용자 데이터 영향 없음 (랭킹 데이터 unchanged).
- minigame_4 → boss_fight 직진입을 사용하던 다른 코드 없음 — 변경 안전.

---

## 12. 작업 체크리스트

- [ ] `sprites.js` 확장 (walk_weapon, attack 1~4, BOSS_*)
- [ ] `Boss` 컴포넌트 + CSS 신규
- [ ] `WorldScene` Hero action 분기 (`hasArmor`)
- [ ] `App.jsx` minigame_4 onContinue → `'world'`
- [ ] `BossFightScene.jsx` 비주얼 전면 개편 (Hero + Boss 사용, attack 동시 재생, 사망 페이드)
- [ ] `BossFightScene.css` 배경/오래된 클래스 제거/페이드 처리
- [ ] 수동 검증 (§10)
