# Stage3 게임로직 단순화 및 score UI 제거

**보고서 파일**: `.report/20260514_#42_Stage3_단순화_score_UI_제거.md`

---

### 📌 작업 개요

Stage3 게임 로직에서 `fake` 아이템 개념을 전면 제거하고, 점수 체계를 단순한 캐치 고정 점수로 단순화. 아울러 Stage 라우트 진입 시 HUD의 score 표시를 숨겨 불필요한 UI 노출을 제거하고, CatchZone의 위치와 스타일을 개선.

---

### 🎯 구현 목표

- Stage3 config에서 `accuracyTiers` / `fake` 관련 필드 제거 → `catchPoints` 고정 점수로 단순화
- FallingItem에서 `kind` prop 제거 — 모든 아이템이 real
- Stage3Field의 catch/miss 집계 로직 단순화 및 missedCount 2배 버그 수정
- ResultModal의 breakdown 항목을 캐치/놓침 2가지로 단순화
- HudOverlay에서 stage 라우트(`/stage/*`) 진입 시 score 표시 비활성화
- CatchZone을 화면 70% 위치로 이동, 밴드/점선 제거 후 황금선 단일 표시

---

### ✅ 구현 내용

#### stage3.config.js — config 단순화
- **파일**: `src/stages/stage3/stage3.config.js`
- **변경 내용**: `accuracyTiers`, `fakeRatio` 등 fake 관련 필드 제거. `catchPoints: 25` 고정 점수 필드와 `catchLabel`, `missLabel` 추가
- **이유**: 아이템이 전부 real로 통일되면서 정확도 티어 판정 로직이 불필요해짐. `4 × 25 = 100` 최대 점수 구조로 단순화

#### FallingItem.jsx — kind prop 제거
- **파일**: `src/stages/stage3/FallingItem.jsx`
- **변경 내용**: `kind` prop 제거, CSS 클래스 `falling-item--real` 고정
- **이유**: fake 아이템이 없으므로 종류 분기 불필요. 컴포넌트가 시각 표시만 담당

#### Stage3Field.jsx — 버그 수정 및 로직 정리
- **파일**: `src/stages/stage3/Stage3Field.jsx`
- **변경 내용**:
  - `missedCount` 2배 산출 버그 수정 — 종료 시점에 `config.itemCount - caughtCount`로 단순 계산
  - `pressesLeft` 상태 추가 — 프레스 소진 시 `finishRef.current?.()` 즉시 호출
  - HUD에 기회 횟수(`pressesLeft / total`) 표시 추가
  - CatchZone `zoneCenter: 70`으로 통일
- **이유**: 기존 로직에서 RAF 만료와 키 입력 양쪽에서 missedCount를 누적해 2배가 되는 버그 존재. `gameEndedRef` 플래그로 중복 종료 방지

#### Stage3Game.jsx — ResultModal breakdown 단순화
- **파일**: `src/stages/stage3/Stage3Game.jsx`
- **변경 내용**: breakdown을 `캐치(+점수)` / `놓침` 2개 항목으로 단순화. `caughtCount > 0`, `missedCount > 0` 조건부 렌더링
- **이유**: fake 제거로 accuracy tier 기반 복잡한 breakdown이 불필요

#### CatchZone.jsx / CatchZone.css — 스타일 정리
- **파일**: `src/stages/stage3/CatchZone.jsx`, `CatchZone.css`
- **변경 내용**: 밴드(배경 영역), 점선 보조선, 키 힌트 문구 제거. 황금선(6px) 단일 표시. `top: 70%` 위치 적용
- **이유**: 불필요한 시각 요소 제거로 핵심 타이밍 라인만 강조

#### HudOverlay.jsx — stage 라우트 score 표시 제거
- **파일**: `src/components/HudOverlay/HudOverlay.jsx`
- **변경 내용**: `pathname.startsWith('/stage/')` 조건 추가 → `null` 반환
- **이유**: 스테이지 진행 중에는 HUD score가 업데이트 전 값을 노출해 혼동을 유발. 스테이지 완료 후 허브에서만 표시

---

### 🔧 주요 변경사항 상세

#### missedCount 2배 버그

기존: RAF tick 루프에서 `topPercent > 110` 시 missed로 마킹 + 종료 시점에 `falling` 상태 아이템을 다시 missed로 전환 → 중복 집계로 2배 발생

수정: `statsRef`에서 `caughtCount`만 추적하고, 종료 시 `missedCount = itemCount - caughtCount`로 단일 계산

#### 프레스 소진 즉시 종료

`pressesLeftRef.current <= 0` 시 `finishRef.current?.()` 호출. `gameEndedRef` 플래그로 RAF 만료와 키 입력 양방향에서의 중복 종료 방지.

---

### 🧪 테스트 및 검증

- 4개 아이템 전부 캐치: score 100, missedCount 0 확인
- 프레스 4회 소진 시 즉시 게임 종료 확인
- 프레스 미소진 아이템이 있을 때 missedCount 중복 없음 확인
- HUD score가 stage 라우트에서 미노출, 허브에서 정상 노출 확인
- CatchZone 황금선이 화면 70% 위치에 표시 확인
