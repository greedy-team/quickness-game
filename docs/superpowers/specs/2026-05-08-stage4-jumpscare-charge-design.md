# Stage 4 Jumpscare — Two-Phase Charge Animation Design Spec

- **Date:** 2026-05-08
- **Scope:** `Stage4JumpscareOverlay`의 zoom 애니메이션을 등장 → 정적 응시 → 차징(2.7배 화면 밖 넘침) 3단으로 재구성
- **Out of scope:** Phase 머신, 사운드, 이미지 자산, merge overlay vignette

---

## 1. 목표

Stage 4 점프스케어가 단순 "팡 표시"가 아니라 **"멀리서 다가옴 → 정면 응시 → 달려옴"**의 호러 시퀀스로 느껴지도록, 2초 jumpscare phase 내에서 두 단계의 scale 변화를 만든다.

## 2. 배경 / 현재 상태

- `JUMPSCARE_DURATION_MS = 2000`
- 현재 애니메이션: 0.10 → 1.05 (overshoot) → 1.0 settle, 500ms (linear)
- 현재 결과: 이미지가 빠르게 등장하고 1.5초간 정지 → 정적 노출이 길어 임팩트 떨어짐
- 사용자 피드백: "1초 정지 후 2~3배 더 커지면 달려오는 느낌"

## 3. 결정 사항

### 3.1 3단 시퀀스 (총 2000ms, 정확히 phase 길이와 일치)

| 단계 | 키프레임 | 시간 | 동작 |
|------|---------|------|------|
| Phase A (등장) | 0% → 25% | 0~500ms | 작은 점(scale 0.10) → 보통 크기(scale 1.0). blur/brightness가 점점 사라지며 멀리서 다가오는 느낌 |
| Pause (정적 응시) | 25% → 75% | 500~1500ms | scale 1.0 고정, 1초간 정면 응시 |
| Phase B (차징) | 75% → 100% | 1500~2000ms | scale 1.0 → 2.7. 가속 곡선 (75→85→93→100%로 비선형 스텝) |

### 3.2 차징 최종 scale = 2.7

1024×1536 portrait 이미지가 1920×1080 landscape viewport에서:
- scale 1.0 표시 크기: ~720 × 1080 (높이 끝까지)
- scale 2.7 표시 크기: ~1944 × 2916 → 가로 viewport 거의 채움 + 위아래 자연스럽게 넘침

**근거:** scale 2.0은 좌우 검은 띠가 남아 차징 임팩트 약함. 3.0은 화면 가운데 영역만 보여 정체불명. 2.7이 "얼굴이 코앞까지 옴" 느낌의 sweet spot.

### 3.3 잘림 메커니즘 — transform overflow

`object-fit: contain` 유지. Phase A/Pause는 viewport에 fit하여 잘림 없음. Phase B의 `transform: scale > 1.0`이 이미지를 viewport 밖으로 자연스럽게 넘기며, viewport 경계에 의해 시각적으로 잘림.

**핵심:** `object-fit: cover`로 종횡비를 강제로 잘라내는 게 아니라, 이미지 본체는 그대로 두고 화면 밖으로 밀려나가서 잘림. 잘려도 "잘려서 표시되는" 게 아니라 "더 가까이 와서 자연스럽게 다 안 보임"의 시각 인상.

### 3.4 Phase B 가속 곡선

Phase B 내부에 비선형 스텝을 둬서 "anticipation → quick burst" 느낌:
- 75% (1.5s): scale 1.0 (정지 직후)
- 85% (1.7s): scale 1.3 (천천히 시작)
- 93% (1.86s): scale 1.95 (가속)
- 100% (2.0s): scale 2.7 (절정, 코앞)

전체 timing function은 `linear` — 가속은 키프레임 간격 자체로 표현.

## 4. 변경 사항

### 4.1 `src/stages/stage4/Stage4JumpscareOverlay.css`

이미지 셀렉터 + keyframes 교체. 그 외 selector(.stage4-jumpscare-overlay 등)는 변경 없음.

```css
.stage4-jumpscare-overlay__image {
  max-width: 100vw;
  max-height: 100vh;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  animation: stage4-jumpscare-zoom 2000ms linear forwards;
}

@keyframes stage4-jumpscare-zoom {
  /* Phase A: 등장 */
  0%   { transform: scale(0.10); filter: brightness(0.5) blur(3px); }
  10%  { transform: scale(0.20); filter: brightness(0.75) blur(2px); }
  18%  { transform: scale(0.45); filter: brightness(0.9)  blur(1px); }
  23%  { transform: scale(0.85); filter: brightness(1.0)  blur(0); }
  25%  { transform: scale(1.0);  filter: brightness(1.0); }

  /* Pause: 정적 응시 */
  75%  { transform: scale(1.0); }

  /* Phase B: 차징 */
  85%  { transform: scale(1.3); }
  93%  { transform: scale(1.95); }
  100% { transform: scale(2.7); }
}
```

### 4.2 그 외 파일

변경 없음.

## 5. 동작 흐름

| t | 사용자가 보는 것 |
|---|----------------|
| 0s | 검은 화면 가운데 작고 흐릿한 점 |
| 0.2s | 점점 커지며 윤곽 드러남 |
| 0.5s | normal 크기, 1024×1536 비율 그대로 viewport 안에 fit |
| 0.5s~1.5s | **정면 응시 1초** (사용자에게 가장 무서운 정적 순간) |
| 1.7s | 살짝 커짐 (anticipation) |
| 1.9s | 빠르게 커짐 |
| 2.0s | 화면을 가득 메운 거대한 얼굴/몸. 위아래로 화면 밖 넘쳐 잘림 |
| 2.0s+ | done → /ending 이동, jumpscare overlay 언마운트 |

## 6. 테스트 시나리오

| # | 시나리오 | 기대 |
|---|---------|------|
| 1 | jumpscare 진입 직후 | 작은 점이 흐릿하게 보임 |
| 2 | 0.5초 후 | normal 크기 도달, 검은 띠 살짝 보임 |
| 3 | 0.5~1.5초 (정적) | 이미지 움직임 없음, 정면 응시 |
| 4 | 1.5초 직후 | 살짝 커지기 시작 |
| 5 | 2.0초 직전 | 화면을 압도하는 큰 이미지, 가장자리 자연 잘림 |
| 6 | 2.0초 직후 | /ending 라우트로 전환 |

## 7. 위험 / 비대상

### 위험
- **세로형 viewport(모바일):** portrait 이미지가 viewport와 비율 맞아 normal 크기에서 검은 띠 거의 없을 것. scale 2.7은 위아래로 더 많이 넘침. 의도와 일치.
- **매우 작은 viewport(< 800px):** scale 0.10에서 너무 작아 안 보일 가능성 → blur 3px가 시각 단서 역할.
- **고해상도 portrait(예: 4K 27인치 세로):** scale 2.7도 뷰포트를 다 못 메울 수 있음. 본 이슈 범위에선 16:9 landscape 가정.

### 비대상
- 사운드 타이밍 재조정 (현재 SFX 6초 흐름 그대로 유지)
- 이미지 자체 변경
- merge overlay 변경
- jumpscare phase 길이 변경 (2000ms 유지)

## 8. 완료 기준

- 위 keyframes로 `Stage4JumpscareOverlay.css` 갱신
- `npm run build` 성공
- 6개 테스트 시나리오 수동 검증 통과
- 기존 사운드/엔딩 흐름 회귀 없음
