# 미니게임 화면 확장 설계 (Issue #12 후속)

> **Issue**: [#12 ⚙️ [기능추가][App][SceneRouting]](https://github.com/greedy-team/quickness-game/issues/12) 후속 작업
> **Branch**: `20260504_#12_PRD_1_2_사용자_플로우_구현_scene_routing_Vite_데모_정리`
> **Date**: 2026-05-04
> **Status**: Design (브레인스토밍 완료, 사용자 리뷰 대기)
> **Related Spec**: `docs/superpowers/specs/2026-05-04-scene-routing-design.md`

---

## 1. 배경

App-stage가 1920×960으로 확대되었지만 미니게임 3개의 자체 stage 크기는 아직 작음:
- **TenSecondsGame**: 이미 `width: 100% / height: 100%` 적용됨 (별도 작업 불필요)
- **ColorReactionGame**: `width: 100% / max-width: 800px / height: 600px` (4:3 비율, 새 stage 안에서 좌우 빈 공간)
- **CatchGame**: `width: min(1200px, 100%) / height: 600px` (2:1 비율 정확하지만 1920×960보다 작음, 위쪽만 차지)

세 게임 모두 새 stage 1920×960을 가득 채워 시각적 임팩트를 회복해야 함.

## 2. 제약 사항

- **CatchGame 게임 로직**: `catchUtils.js`에 `STAGE_HEIGHT_PX = 600` 상수가 있고, 떨어지는 아이템 위치 계산이 이 값에 종속. 이 값을 변경하면 게임 난이도/타이밍이 미세하게 바뀜.
- **ColorReactionGame 게임 로직**: 좌표 의존성 없음 (단순 색상 변경 + 키 입력 반응)
- **TenSecondsGame 게임 로직**: 좌표 의존성 없음 (타이머 기반)

## 3. 채택안: transform: scale fit (옵션 B)

**핵심 아이디어**: 게임의 base 좌표 시스템을 유지하고, CSS `transform: scale()`로 시각만 확대. 게임 로직은 전혀 건드리지 않음.

### 3.1 적용 방식

| 게임 | base size | 적용 방식 | 결과 |
|---|---|---|---|
| **TenSecondsGame** | 자체 stage 없음 (flex layout) | `width: 100% / height: 100%` (stretch) | 1920×960 가득 |
| **ColorReactionGame** | **1200×600** (현재 800에서 width 확장) | `transform: scale(1.6)` + center | 1920×960 fit |
| **CatchGame** | 1200×600 (그대로) | `transform: scale(1.6)` + center | 1920×960 fit |

**Scale 계산**: `min(1920/1200, 960/600) = min(1.6, 1.6) = 1.6` → ColorReactionGame · CatchGame 모두 정확히 1.6배. letterbox 없음.

**TenSecondsGame**은 자체 stage 사이즈 없이 flex centering으로 stretch가 자연스러움. transform: scale 적용 시 base size를 따로 정의해야 하는데 의미 없음. 그냥 width/height 100% 유지.

### 3.2 ColorReactionGame base size 변경 근거

현재 `max-width: 800px`라 stage가 4:3 비율. 1200으로 늘리면 2:1 비율이 되어 transform: scale 적용 시 letterbox 없이 stage 가득 fit.

안의 요소들 영향:
- **돌석상 (`.stone-statue-container`)**: flex centering으로 정렬 → width 늘려도 자동 가운데 정렬, 시각 영향 없음
- **timer (`.dungeon-timer`)**: `position: absolute; top: 20px` → 좌측 정렬, 영향 없음
- **UI overlay 패널들**: flex centering → 자연 정렬

결론: ColorReactionGame은 base width만 확장하면 안의 모든 요소가 자연스럽게 재배치됨.

## 4. 구현 변경

### 4.1 `src/components/ColorReactionGame/ColorReactionGame.css`

```css
/* .dungeon-world (line 5~16 정도) */
.dungeon-world {
  position: relative;
  width: 1200px;        /* 변경: 100% + max-width 800 → 1200 fixed */
  height: 600px;
  /* 나머지 그대로 */

  /* transform scale fit (부모 stage 1920x960) */
  transform: scale(1.6);
  transform-origin: center center;
  margin: 0;            /* 기존 margin: 0 auto 제거 (flex centering 부모가 처리) */
}
```

**부모 정렬**: `App.jsx`에서 ColorReactionGame이 렌더되는 컨테이너는 `.app-stage` (이미 부모). `.app-stage` 안에서 ColorReactionGame이 absolute centering 되도록 wrapper 추가하거나, `.dungeon-world` 자체에 `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(1.6);` 적용.

선택: **`.dungeon-world`에 absolute centering + scale 합침** (wrapper 없이 1줄 변경).

```css
.dungeon-world {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1200px;
  height: 600px;
  transform: translate(-50%, -50%) scale(1.6);
  transform-origin: center center;
  /* 나머지 background, box-shadow 등 그대로 */
}
```

### 4.2 `src/components/CatchGame/CatchGame.css`

```css
/* .catch-stage */
.catch-stage {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1200px;        /* 변경: min(1200px, 100%) → 1200 fixed */
  height: 600px;
  transform: translate(-50%, -50%) scale(1.6);
  transform-origin: center center;
  /* 나머지 그대로 */
}
```

`STAGE_HEIGHT_PX = 600` 상수는 변경 없음. 떨어지는 아이템 위치 계산은 600px base 그대로 작동, 시각만 1.6배.

CatchGame.css line 17의 `--catch-stage-height: 600px` keyframe 정의도 그대로 (떨어지는 애니메이션 거리 600px → scale 적용으로 시각 960px).

### 4.3 TenSecondsGame

변경 없음. 이미 `.game-world { width: 100%; height: 100%; min-height: 100%; }` 적용됨 (앞 commit `2026-05-04` task 12 fix).

## 5. 검증

- `rtk proxy npm run build` 통과
- `npm run dev`로 풀 플레이:
  - MG1 (TenSecondsGame): stage 가득 채우고 흔들림/카운터 효과 자연스러움
  - MG2 (ColorReactionGame): 돌석상이 가운데, letterbox 없이 stage 가득
  - MG3 (CatchGame): 떨어지는 아이템 위치/타이밍 동일 (게임 로직 보존), 시각만 1.6배

## 6. 트레이드오프 및 대안

### 채택안 (transform: scale fit)
- ✅ 게임 로직 무영향
- ✅ 픽셀 art 비율 유지
- ✅ 코드 변경 최소 (CSS 5~10줄)
- ⚠️ 픽셀 art가 1.6배 보간되어 살짝 흐릿할 수 있음 (`image-rendering: pixelated` 적용 시 완화)

### 대안 A: width/height 100% stretch
- 비율 깨짐
- ColorReactionGame은 안 요소가 flex centering이라 OK
- CatchGame은 떨어지는 아이템 위치 계산 stage height에 종속 → stretch 시 시각/로직 어긋남
- 채택 안 함

### 대안 C: 게임 좌표 시스템 자체 비례 확대
- CatchGame `STAGE_HEIGHT_PX = 600 → 960`, `FALL_DURATION_MS` 비례 조정 등
- 게임 난이도/타이밍 변경 위험
- 작업량 큼
- 채택 안 함

## 7. Out of Scope

- 미니게임 자체 콘텐츠 변경 (UI 디자인, 점수 공식, 게임 로직 등)
- 추가 미니게임 (MG4, 보스전 등)은 별도 이슈
- 픽셀 art 재제작 (1.6배 보간 흐림이 심하면 향후 별도 작업)
