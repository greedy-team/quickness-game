# Stage 4 Merge Overlay → Closing Vignette — Design Spec

- **Date:** 2026-05-08
- **Scope:** `Stage4MergeOverlay`의 시각 효과를 골드 발광 → 검정 vignette 클로징으로 교체
- **Out of scope:** Stage 4의 phase 머신·타이밍·사운드·점프스케어 이미지 변경

---

## 1. 목표

Stage 4의 `merging` phase 동안 화면 가장자리에서 어둠이 중앙으로 좁혀 들어오는 vignette 효과를 보여, 점프스케어 직전의 압박감을 만든다. 현재의 골드 발광은 호러 톤과 부조화이며, 변경된 4초 phase 길이 대비 1초 애니메이션이라 frozen state로 정적이게 보인다.

## 2. 배경 / 현재 상태

- `MERGE_DURATION_MS = 4000` (점프스케어 SFX pre-roll 도입 시 1000→4000으로 연장)
- 현재 CSS: `radial-gradient(circle at center, gold 0% → gold 0.4 50% → black 0.95 100%)` + 1초 bloom 애니메이션 (`forwards`)
- 결과: 골드 색조가 4초 중 3초간 frozen으로 유지 → "너무 밝다"는 사용자 피드백

## 3. 결정 사항

### 3.1 색조 제거 — 순수 검정만 사용

골드 톤(`rgba(255, 215, 0, ...)`) 완전 제거. 검정 단색만으로 vignette 형성.

**근거:** 후속 점프스케어 연출 톤과 일관. "합체 = 빛난다"는 메타포는 3분할 화면이 사라지는 사실 자체로 충분히 표현됨.

### 3.2 vignette 클로징 효과

가장자리에서 중앙으로 어둠이 좁혀 들어오는 효과. 이중 트릭으로 구현:

- `transform: scale(2) → scale(1)`: gradient를 화면 밖으로 밀었다가 정상 크기로 회복 → vignette 반경이 좁혀지는 시각 효과
- `opacity: 0 → 1`: 처음엔 거의 안 보이다가 점점 진해짐
- 결합 → 어둠이 가장자리에서 점점 다가와 화면을 덮는 인상

### 3.3 애니메이션 길이 = phase 길이 (4초)

애니메이션 4초 + `forwards` → frozen state 없이 phase 끝까지 동적으로 진행.

### 3.4 이징 곡선 = `ease-in`

처음엔 천천히, 끝으로 갈수록 빠르게 → "스믈스믈 다가오다 갑자기 덮침" 압박감 강화.

## 4. 변경 사항

### 4.1 `src/stages/stage4/Stage4MergeOverlay.css` (전체 교체)

```css
.stage4-merge-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
  background: radial-gradient(
    circle at center,
    transparent 0%,
    transparent 25%,
    rgba(0, 0, 0, 1) 75%
  );
  opacity: 0;
  animation: stage4-merge-vignette 4s ease-in forwards;
}

@keyframes stage4-merge-vignette {
  0%   { opacity: 0; transform: scale(2); }
  100% { opacity: 1; transform: scale(1); }
}
```

### 4.2 그 외 파일

변경 없음. `Stage4MergeOverlay.jsx`, `Stage4Host.jsx`, JSX 마크업, phase 머신, 사운드 모두 그대로.

## 5. 동작 흐름

| 시점 | 화면 | 효과 |
|------|------|------|
| t=0s | 3분할 게임 화면 | vignette 거의 안 보임 (opacity ~0, scale 2) |
| t=1s | 3분할 + 가장자리 어둠 시작 | 약 6% opacity (ease-in 초반) |
| t=2s | 3분할 일부 가려짐 | 약 25% opacity, vignette 반경 좁아짐 |
| t=3s | 중앙만 일부 보임 | 약 56% opacity |
| t=4s | 거의 완전 검정 → jumpscare 즉시 발화 | opacity 1.0, scale 1.0 |

(SFX는 t=0~6s 별도 트랙. t=4s에 jumpscare 풀스크린 이미지가 나타나며 vignette overlay는 자연 언마운트.)

## 6. 테스트 시나리오

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | 3분할 결과 모두 도착 → merging 진입 | 가장자리부터 점점 어두워지기 시작, 골드 색 안 보임 |
| 2 | merging 중반 (t=2초) | 화면 절반쯤 검정, 중앙은 분할 게임 일부 보임 |
| 3 | merging 종반 (t=3.5초) | 거의 완전 검정, 작은 중앙 구멍 |
| 4 | merging → jumpscare 전환 | 어둠이 vignette → jumpscare 이미지로 전환 (위화감 없이 부드럽게) |
| 5 | 점프스케어 종료 → ending 이동 | 기존 그대로 (영향 없음) |

## 7. 위험 / 비대상

### 위험
- **scale(2) 시 화면 밖 그라데이션이 정말 0%인지:** `transparent 0~25%`가 화면 밖으로 밀려나면 사용자가 보는 영역은 전부 transparent → 정상 동작. 수동 검증으로 확인.
- **이징 체감:** `ease-in`이 너무 느리게 시작한다면 `cubic-bezier`로 미세 조정. 1차 시도는 표준 ease-in.

### 비대상
- 색감 추가 (예: 약간의 푸른빛/붉은빛 톤) — 호러 표준 검정만 사용
- vignette 외 추가 이펙트 (글리치, 노이즈, 진동) — 본 이슈 범위 외
- merging phase 길이 재조정 — SFX 6초 흐름과 묶여 있어 변경 불가

## 8. 완료 기준

- `Stage4MergeOverlay.css` 위 코드로 교체
- 5개 테스트 시나리오 수동 확인 통과
- 골드 색조 완전 제거 확인 (이전 frozen 상태와 비교)
- Stage 4 외 다른 화면/스테이지 회귀 없음
