# Sub-Stage Contract — Stage 1·2·3 컴포넌트 인터페이스

**대상 독자**: Stage 1(괘종시계) 또는 Stage 2(반응속도)를 구현하는 팀원

**선행 조건**: PRD v6 §4 + spec `docs/superpowers/specs/2026-05-06-stage3-stage4-skeleton-design.md` §3 숙지

## 컴포넌트 시그니처 (필수)

```jsx
<StageNGame
  mode="standalone" | "split"
  isRunning={boolean}
  onResult={(metric: number) => void}
/>
```

## 모드별 책임 분담

| 책임 | standalone | split |
|---|---|---|
| 인트로 화면 | 본인이 표시 + Space 대기 | Stage4Host가 통합 인트로 |
| 시작 트리거 | 본인이 직접 `Space` 키 listen | `isRunning=true` prop 신호 |
| 게임 진행 | 본인 | 본인 |
| 종료 | `onResult(metric)` | `onResult(metric)` |
| 사이즈 | 풀스크린 | ~33% 폭, 스케일 다운 |

## State Machine

```
[mounted]
   ↓
[idle]       standalone: 인트로 표시 + Space 대기
              split:      조용히 마운트만
   ↓ (Space 또는 isRunning=true)
[running]    게임 진행
   ↓ (자동 종료)
[done]       onResult(metric) 호출
```

## metric 정규화 규칙 (필수)

- `metric = 0.0` → 완벽 플레이
- `metric = 1.0` → 최악 (전부 미스/페널티)
- `0 ≤ metric ≤ 1` 범위 보장 (clamp 권장)
- 호스트가 `STAGE_SCORE_TIERS[N]`로 stage 총점 매핑 — 본인이 직접 점수 산출 안 함

## 키 충돌 방지

- Stage 1: `←`만 listen
- Stage 2: `↑`만 listen
- Stage 3: `→`만 listen
- 다른 키는 무시 (3분할에서 한 키보드 동시 입력 가능해야 함)
- `Space`는 호스트 시작 트리거 — running 중에는 무시

## "이렇게 만들면 plug-in OK" 체크리스트

- [ ] `mode` prop 받아서 standalone일 때만 본인 인트로 표시
- [ ] `isRunning` prop 받아서 split 모드 시작 신호로 사용
- [ ] `onResult` 콜백을 종료 시 정확히 1회 호출
- [ ] 반환 metric이 0~1 범위 (1을 초과하지 않도록 clamp)
- [ ] 자기 키 외 다른 키 입력 무시
- [ ] 스타일이 ~33% 폭에서도 안 깨짐 (relative units 사용)
- [ ] `STAGE_SCORE_TIERS[N]` 채움 (`src/scoring.js`)
- [ ] tunable 상수는 `src/stages/stage{N}/stage{N}.config.js`에 외부화

## 참조 예시

Stage 3 (`src/stages/stage3/Stage3Game.jsx`)이 본 contract를 따른 reference 구현. 같은 패턴으로 작성 권장.
