# 용사 그린이의 대모험 — PRD

> **부제**: 순발력 게임
> **장르**: 픽셀 아트 미니게임 모음 (반응속도 트레이닝 + 보스전)
> **플랫폼**: 웹 (React)
> **총 플레이 시간**: 약 1분 20초 (가이드 20s + 플레이 60s)

---

## 1. 게임 개요

순발력과 집중력을 잃지 않고 미션을 수행하는 미니게임. 주인공 **"그린이"**(기린 캐릭터)가 4개의 순발력 미니게임을 통해 점수를 쌓고, 마지막에 갑옷을 장착해 보스를 처치하는 스토리텔링형 게임.

### 1.1 핵심 컨셉
- **그린이의 성장 서사**: 무기 없이 시작 → 미니게임으로 훈련 → 갑옷 획득 → 보스 토벌
- **누적 점수 = 보스 데미지**: 미니게임에서 모은 점수가 보스에게 가하는 데미지로 환산됨

### 1.2 사용자 플로우

```
[시작 화면]
   ↓
[인트로] 그린이 등장 (무기 X), 좌우 이동 안내
   ↓
[미니게임 1] 10초 맞추기 (← 키)
   ↓
[미니게임 2] 색상반응 (↑ 키)
   ↓
[미니게임 3] 캐치 (→ 키)
   ↓
[갑옷 장착 연출] 그린이가 갑옷·검·방패 획득 (스프라이트 변경)
   ↓
[미니게임 4] 병렬 진행 (← ↑ → 동시)
   ↓
[보스전 진입] 그린이가 우측 성 앞으로 이동, 보스 등장
   ↓
[보스 공격 페이즈] 누적 점수 → 데미지로 환산, 공격 모션 4종 사용
   ↓
[엔딩] 최종 점수 + 클리어 화면
```

---

## 2. 미니게임 명세

### 2.1 미니게임 1 — 10초 맞추기 (10초)
- **목표**: 정확히 10초가 됐을 때 `←` 키 입력
- **점수 기준**:
  - ±0.1초 이내: 100점
  - ±0.3초 이내: 70점
  - ±0.5초 이내: 40점
  - 그 외: 10점
  - 누르지 않음: 0점
- **UI**: 카운트는 표시하지 않음 (선택사항이지만 표시 안 하는 쪽이 더 도전적)

### 2.2 미니게임 2 — 색상반응 (10초 이내)
- **목표**: 화면이 초록색 → 빨간색으로 바뀌는 순간 `↑` 키 입력
- **변경 타이밍**: 시작 후 **3~7초 사이 무작위**
- **점수 기준**:
  - 0.2초 이내 반응: 100점
  - 0.4초 이내: 70점
  - 0.6초 이내: 40점
  - 그 이상: 10점
  - 빨간색 되기 전에 누름 (페이크): -20점
  - 누르지 않음: 0점
- **UI**: 화면 전체 배경색 변경 + 상단에 작은 카운터(선택)

### 2.3 미니게임 3 — 캐치 (10초)
- **목표**: 화면 위→아래로 빠르게 떨어지는 아이템이 화면 중앙의 **빨간 원** 위치에 왔을 때 `→` 키 입력
- **아이템**: 3가지 종류 (예: 별, 보석, 코인)
- **출현 횟수**: 10초 동안 5~7개 무작위 등장
- **점수 기준**:
  - 정확한 위치 (빨간 원 안): 50점
  - 약간 벗어남 (±20px): 20점
  - 빨간 원 밖: 0점
  - 놓침: 0점
- **UI**: 화면 중앙 가로축에 빨간 원, 아이템은 위에서 떨어짐

### 2.4 미니게임 4 — 병렬 진행 (10초)
- **목표**: 1, 2, 3번을 한 화면에서 동시에 진행
- **레이아웃**: 화면을 좌·중·우 3분할
  - 좌측: 10초 맞추기 (`←`)
  - 중앙: 색상반응 (`↑`)
  - 우측: 캐치 (`→`)
- **점수**: 각 게임의 점수 합산, 단 **2배 보너스** 적용
- **난이도 가중**: 캐치 게임 아이템 속도 1.5배

---

## 3. 보스전 명세

### 3.1 진입
- 미니게임 4 종료 후 갑옷 장착된 그린이가 화면 우측으로 이동
- 보스("어둠의 군주" 등 명칭은 자유)가 성 앞에서 등장
- 화면 전체에 어두운 보라색 오버레이 적용 (보스전 분위기)

### 3.2 데미지 산출
- **누적 점수 → 보스 HP 데미지**: 1점 = 1 데미지
- 보스 HP: **1500** (예상 평균 점수가 800~1200 정도이므로 약간의 도전감)
- 점수 부족 시 보스가 살아남고, 보스 공격으로 게임 오버 가능

### 3.3 전투 플로우
1. 보스 idle 모션 재생 (자동 반복)
2. 그린이가 공격 키 입력 → 공격 모션 4종 중 선택 사용
   - `Space`: 기본 베기 (데미지 100)
   - `Z`: 찌르기 (데미지 80, 빠름)
   - `X`: 위로 베기 (데미지 120)
   - `C`: 내려치기 (데미지 150, 느림)
3. 데미지 누적량 = 미니게임 누적 점수까지 사용 가능
4. 누적 점수가 0이 되면 더 이상 공격 불가
5. 보스 HP 0 → 클리어
6. 보스 공격 모션 (랜덤 타이밍, 빔 발사) → 그린이 회피 또는 피격

> **MVP 단순화**: 위 시스템이 복잡하면 1차 버전은 "공격 키 한 번 = 누적 점수만큼 데미지 한 번에" 처럼 단순화 가능

### 3.4 엔딩
- 보스 격파 시 클리어 화면 (총점 + 등급 표시)
- 등급 기준: S(1500+), A(1200+), B(900+), C(600+), D(그 이하)

---

## 4. 콘텐츠 일관성 — "그린이" 스토리텔링

### 4.1 캐릭터 설정
- **이름**: 그린이
- **종족**: 기린 (초록색)
- **특징**: 머리에 노란 뿔(촉각) 2개, 흰 점박이 무늬
- **성장 단계**:
  1. 무방비 그린이 (미니게임 1~3): 갑옷·무기 없음
  2. 용사 그린이 (미니게임 4 ~ 보스전): 갑옷·검·방패 장착

### 4.2 스토리 흐름 예시 (게임 내 텍스트로 활용)

> 평화롭던 그린 왕국에 어둠의 군주가 나타나 성을 점령했다.
> 우리의 그린이는 아직 약하지만, 훈련을 통해 점점 강해질 수 있다.
>
> **[미니게임 1 전]** "정확한 타이밍을 익혀라!"
> **[미니게임 2 전]** "위험 신호를 빠르게 포착하라!"
> **[미니게임 3 전]** "흐름을 읽고 잡아내라!"
> **[갑옷 장착]** "훈련을 마친 그린이! 갑옷과 검을 손에 넣었다!"
> **[미니게임 4 전]** "모든 감각을 동시에 사용하라!"
> **[보스전]** "어둠의 군주를 무찔러 왕국을 되찾아라!"

---

## 5. 기술 스택 및 프로젝트 구조

### 5.1 기술 스택
- **프레임워크**: React 18+ (Vite 권장)
- **언어**: JavaScript 또는 TypeScript
- **스타일**: 인라인 style + 별도 CSS 파일 (keyframes 정의용)
- **상태 관리**: React Context 또는 Zustand (가벼운 전역 상태)
- **추가 라이브러리**: 불필요 (브라우저 네이티브 API로 충분)

### 5.2 폴더 구조 권장

```
src/
├── App.jsx                    # 라우터 / 씬 전환 컨트롤러
├── main.jsx
├── index.css                  # @keyframes play 등 전역 CSS
├── store/
│   └── gameStore.js           # 점수, 현재 씬, 그린이 상태 등
├── scenes/
│   ├── IntroScene.jsx         # 시작 화면 + 좌우 이동 튜토리얼
│   ├── MiniGame1.jsx          # 10초 맞추기
│   ├── MiniGame2.jsx          # 색상반응
│   ├── MiniGame3.jsx          # 캐치
│   ├── ArmorScene.jsx         # 갑옷 장착 연출
│   ├── MiniGame4.jsx          # 병렬 진행
│   ├── BossFightScene.jsx     # 보스전
│   └── EndingScene.jsx        # 엔딩
├── components/
│   ├── Hero.jsx               # 그린이 캐릭터 컴포넌트
│   ├── Boss.jsx               # 보스 캐릭터 컴포넌트
│   ├── Stage.jsx              # 배경 + 공통 레이아웃
│   └── ScoreBoard.jsx         # 점수 UI
└── constants/
    └── sprites.js             # 스프라이트 메타데이터
public/
├── sprites/                   # 캐릭터 스프라이트 시트들
└── bg/
    └── world.png              # 배경 이미지
```

---

## 6. 자산 (Assets) 명세

### 6.1 캐릭터 스프라이트 (모두 통일된 박스)

#### 그린이 (용사)
- **박스 크기**: 400 × 220px
- **캐릭터 키**: 180px
- **발 정렬**: 박스 하단에서 8px 위 (모든 시트 동일)
- **배경**: 투명

| 파일 | 용도 | 프레임 수 | 시트 크기 | 권장 duration |
|---|---|---|---|---|
| `unified_5_walk_no_weapon.png` | 무방비 걷기 (미니게임 1~3) | 8 | 3200×220 | 0.8s |
| `unified_6_walk_weapon.png` | 갑옷 걷기 (미니게임 4 이후) | 8 | 3200×220 | 0.8s |
| `unified_1_attack_basic.png` | 기본 베기 (보스전) | 8 | 3200×220 | 0.7s |
| `unified_2_attack_thrust.png` | 찌르기 (보스전) | 5 | 2000×220 | 0.5s |
| `unified_3_attack_upslash.png` | 위로 베기 (보스전) | 8 | 3200×220 | 0.7s |
| `unified_4_attack_down.png` | 내려치기 (보스전) | 8 | 3200×220 | 0.7s |

#### 보스
- **박스 크기**: 500 × 360px
- **캐릭터 키**: 280px (그린이의 약 1.55배)
- **발 정렬**: 박스 하단에서 8px 위 (그린이와 동일하므로 같은 바닥에 둘 수 있음)
- **배경**: 투명
- **방향**: `transform: scaleX(-1)` 적용 필요 (좌측의 그린이를 향하도록)

| 파일 | 용도 | 프레임 수 | 시트 크기 | 권장 duration |
|---|---|---|---|---|
| `unified_boss_idle.png` | 가만히 (화염 흔들림) | 8 | 4000×360 | 1.6s |
| `unified_boss_attack.png` | 빔 공격 | 9 | 4500×360 | 1.0s |

### 6.2 배경
- **파일**: `/bg/world.png`
- **크기**: 1774 × 887 (비율 약 2:1)
- **풀밭 라인**: 이미지 상단 기준 y=651 (하단에서 236px)
- **권장 표시 비율**: 가로:세로 = 2:1 (예: 1200×600, 1400×700)

### 6.3 풀밭 발 위치 계산 공식

```js
// 컨테이너 높이가 STAGE_H일 때 캐릭터의 bottom 값
const FLOOR_Y_RATIO = 651 / 887;  // 풀밭이 이미지 위에서 차지하는 비율
const FLOOR_Y_FROM_BOTTOM = STAGE_H * (1 - FLOOR_Y_RATIO); // 풀밭이 하단에서 떨어진 거리
const CHARACTER_BOTTOM = FLOOR_Y_FROM_BOTTOM - 8; // 발 정렬 보정

// STAGE_H = 600 → CHARACTER_BOTTOM ≈ 151px
```

---

## 7. 핵심 코드 패턴

### 7.1 스프라이트 메타데이터 (`constants/sprites.js`)

```js
export const HERO_FRAME_W = 400;
export const HERO_FRAME_H = 220;
export const BOSS_FRAME_W = 500;
export const BOSS_FRAME_H = 360;

export const HERO_SPRITES = {
  walk_no_weapon: { src: '/sprites/unified_5_walk_no_weapon.png', frames: 8, duration: '0.8s', loop: true },
  walk_weapon:    { src: '/sprites/unified_6_walk_weapon.png',    frames: 8, duration: '0.8s', loop: true },
  attack_basic:   { src: '/sprites/unified_1_attack_basic.png',   frames: 8, duration: '0.5s', loop: false, damage: 100 },
  attack_thrust:  { src: '/sprites/unified_2_attack_thrust.png',  frames: 5, duration: '0.4s', loop: false, damage: 80 },
  attack_upslash: { src: '/sprites/unified_3_attack_upslash.png', frames: 8, duration: '0.5s', loop: false, damage: 120 },
  attack_down:    { src: '/sprites/unified_4_attack_down.png',    frames: 8, duration: '0.5s', loop: false, damage: 150 },
};

export const BOSS_SPRITES = {
  idle:   { src: '/sprites/unified_boss_idle.png',   frames: 8, duration: '1.6s', loop: true },
  attack: { src: '/sprites/unified_boss_attack.png', frames: 9, duration: '1.0s', loop: false },
};
```

### 7.2 keyframes (`index.css`)

```css
@keyframes play {
  to { background-position: var(--end-pos) 0; }
}
```

### 7.3 그린이 컴포넌트 패턴 (`components/Hero.jsx`)

```jsx
import { HERO_SPRITES, HERO_FRAME_W, HERO_FRAME_H } from '../constants/sprites';

export default function Hero({ action = 'walk_weapon', x = 200, bottom = 151, facing = 'right' }) {
  const a = HERO_SPRITES[action];
  return (
    <div
      key={action}
      style={{
        position: 'absolute',
        bottom, left: x,
        width: HERO_FRAME_W,
        height: HERO_FRAME_H,
        backgroundImage: `url(${a.src})`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        animation: `play ${a.duration} steps(${a.frames}) ${a.loop ? 'infinite' : 'forwards'}`,
        ['--end-pos']: `-${HERO_FRAME_W * a.frames}px`,
        transform: facing === 'left' ? 'scaleX(-1)' : 'none',
      }}
    />
  );
}
```

### 7.4 보스 컴포넌트 패턴 (`components/Boss.jsx`)

```jsx
import { BOSS_SPRITES, BOSS_FRAME_W, BOSS_FRAME_H } from '../constants/sprites';

export default function Boss({ action = 'idle', x = 700, bottom = 151 }) {
  const a = BOSS_SPRITES[action];
  return (
    <div
      key={action}
      style={{
        position: 'absolute',
        bottom, left: x,
        width: BOSS_FRAME_W,
        height: BOSS_FRAME_H,
        backgroundImage: `url(${a.src})`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        animation: `play ${a.duration} steps(${a.frames}) ${a.loop ? 'infinite' : 'forwards'}`,
        ['--end-pos']: `-${BOSS_FRAME_W * a.frames}px`,
        transform: 'scaleX(-1)', // 보스는 항상 좌측을 봄 (그린이를 향함)
      }}
    />
  );
}
```

### 7.5 스테이지(배경) 컴포넌트 (`components/Stage.jsx`)

```jsx
export default function Stage({ children, dark = false, width = 1200, height = 600 }) {
  return (
    <div style={{
      position: 'relative',
      width, height,
      backgroundImage: 'url(/bg/world.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center bottom',
      imageRendering: 'pixelated',
      overflow: 'hidden',
      border: '2px solid #333',
    }}>
      {children}
      {/* 보스전용 어두운 오버레이 */}
      {dark && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(rgba(20,0,40,0.4), rgba(80,0,60,0.6))',
          pointerEvents: 'none',
          zIndex: 1,
        }} />
      )}
    </div>
  );
}
```

### 7.6 키보드 입력 + 게임 루프 패턴

```jsx
import { useState, useEffect, useRef } from 'react';

function useKeyboardMovement({ enabled, onMove }) {
  const keysRef = useRef({});
  useEffect(() => {
    if (!enabled) return;
    const down = e => { keysRef.current[e.key] = true; };
    const up = e => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let rafId;
    const loop = () => {
      onMove(keysRef.current);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, onMove]);
}
```

### 7.7 전역 상태 패턴 (`store/gameStore.js`, Zustand 예시)

```js
import { create } from 'zustand';

export const useGameStore = create((set) => ({
  scene: 'intro',           // 'intro' | 'minigame_1~4' | 'armor' | 'boss_fight' | 'ending'
  totalScore: 0,
  hasArmor: false,
  bossHP: 1500,

  setScene: (scene) => set({ scene }),
  addScore: (s) => set((state) => ({ totalScore: state.totalScore + s })),
  equipArmor: () => set({ hasArmor: true }),
  damageBoss: (d) => set((state) => ({ bossHP: Math.max(0, state.bossHP - d) })),
  reset: () => set({ scene: 'intro', totalScore: 0, hasArmor: false, bossHP: 1500 }),
}));
```

---

## 8. 일정

| 마감 | 담당 | 작업 |
|---|---|---|
| 5/2 (토) | 규민 | 미니게임 1, 2 완성 |
| 5/2 (토) | 의민 | 미니게임 3 완성 |
| 5/4 (월) | 의민 | 미니게임 4 + 4개 게임 연결 |
| 5/8 (금) | 전체 | UX/UI 다듬기, 보스전 통합 |
| 5/10 (일) | 혜빈 | 응원과 격려 |

---

## 9. 기능 요구사항 체크리스트

### 9.1 필수 기능
- [ ] 게임 진행 단계마다 점수 표시 (현재 점수 + 누적 점수)
- [ ] 최종 점수 표시 (엔딩 씬)
- [ ] "그린이" 스토리텔링 일관성 유지 (씬 전환 시 캐릭터 등장, 텍스트 안내)
- [ ] 키보드 입력 정확도 (반응 시간 측정)
- [ ] 4개 미니게임 모두 동작
- [ ] 갑옷 장착 시 스프라이트 변경 (5번 → 6번)
- [ ] 보스전 진입 및 데미지 시스템
- [ ] 엔딩 화면 + 등급 표시

### 9.2 선택 기능 (시간 남으면)
- [ ] 배경음 + 효과음
- [ ] 보스 공격에 대한 회피 시스템
- [ ] 패럴랙스 배경 효과
- [ ] 점수 애니메이션 (숫자 증가)
- [ ] 스코어 랭킹 저장 (localStorage)

### 9.3 비기능 요구사항
- [ ] 모든 픽셀 자산은 `imageRendering: pixelated` 적용
- [ ] 컨테이너 비율 2:1 유지 (배경 풀밭 라인 정확도)
- [ ] 60fps 부드러운 애니메이션 (`requestAnimationFrame` 사용)
- [ ] 키보드 이벤트 cleanup (메모리 누수 방지)

---

## 10. 주의사항 및 팁

### 10.1 흔히 발생하는 이슈

1. **스프라이트가 흐릿하게 보임** → `imageRendering: pixelated` 빼먹은 경우. 모든 sprite 컴포넌트 + Stage에 적용 필수.
2. **애니메이션이 모션 바뀔 때 재시작 안 됨** → `<div key={action} ...>` 누락. action이 바뀌면 React가 새로 mount하도록.
3. **공격 모션 후 idle 복귀 안 됨** → `loop: false`인 경우 `animationend` 이벤트 또는 `setTimeout`으로 명시적 처리 필요.
4. **화살표 키 눌렀을 때 페이지 스크롤됨** → `e.preventDefault()` 호출.
5. **보스 빔이 오른쪽으로 발사됨** → 보스에 `transform: scaleX(-1)` 적용 안 한 경우.
6. **풀밭 위에 발이 안 닿음** → 컨테이너 비율이 2:1 아닌 경우. 또는 `bottom` 계산 공식 확인.

### 10.2 퍼포먼스 팁
- 스프라이트 시트는 모두 `public/sprites/`에 두고 절대 경로(`/sprites/...`)로 참조
- 같은 스프라이트를 여러 컴포넌트에서 쓰면 브라우저가 자동 캐싱하므로 별도 preload 불필요
- 불필요한 리렌더 방지: `keysRef`처럼 ref 활용

### 10.3 Claude Code에게 작업 지시할 때 우선순위
1. **먼저 인프라 셋업**: `Stage`, `Hero`, `Boss` 컴포넌트 + 전역 상태 + 씬 라우팅
2. **씬 단위로 구현**: Intro → MiniGame1 → MiniGame2 → ... → BossFight → Ending
3. **각 씬은 독립적으로 동작 가능하게**: 씬 단위로 테스트 가능해야 디버깅 쉬움
4. **마지막에 통합 + UI 다듬기**

---

## 11. 참고 자료

- 캐릭터 스프라이트는 `/sprites/` 폴더에 배치
- 배경 이미지는 `/bg/world.png`로 배치
- 스프라이트 시트 모두 통일 규격 (그린이 400×220, 보스 500×360, 발 정렬 동일)
- 스프라이트 시트는 마젠타 배경 제거 + 투명 처리 완료된 상태