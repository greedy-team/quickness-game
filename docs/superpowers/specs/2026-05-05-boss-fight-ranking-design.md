# 보스전 + 누적 포인트 기반 랭킹 시스템 — 디자인 (Spec)

- **이슈:** `.issues/20260505_기능추가_보스전_랭킹_시스템_구현.md`
- **브랜치:** `20260505_#18_PRD_3_5단계_보스전_누적_포인트_기반_랭킹_시스템_구현`
- **작성일:** 2026-05-05
- **PRD 참조:** §3 5단계 — 결전 / 랭킹

---

## 1. 목적과 범위

### 1.1 목적

미니게임 1~4에서 누적된 점수(`gameStore.totalScore`)를 보스전의 "공격 데미지"로 그대로 사용해 보스를 처치하고, 클리어 후 닉네임을 받아 로컬 랭킹에 등록한다. 게임의 클라이맥스(보스전)와 영속적 보상 루프(랭킹)를 채워 넣는다.

### 1.2 인-스코프 (이번 이슈)

- 보스전 씬 (`BossFightScene`): HP 바, 공격 입력(Space), 누적 점수 = 데미지, 사망 연출
- 닉네임 입력 모달 (`NicknamePromptModal`): trim + 길이 가드 + 빈 문자열 차단
- 랭킹 씬 (`RankingScene`): TOP 10 + 본인 순위 강조 / read-only 모드
- 랭킹 저장소: `LocalStorage` 어댑터 + 백엔드 교체 가능한 인터페이스
- 인트로에서 랭킹 보기 진입 (read-only)
- `gameStore` 씬 타입 확장 (`nickname_input`, `ranking`) + `rankingMode` 필드
- `App.jsx`에서 `boss_fight` placeholder 분기를 실제 컴포넌트로 교체

### 1.3 아웃-오브-스코프 (별도 이슈)

- 백엔드 API / 비속어 필터 / 어뷰저 방지 / 중복 닉네임 검증
- 갑옷 그린이 스프라이트 (디자이너 협의)
- 패배 분기 / 게임오버 화면 (룰상 패배 불가)
- 동률 부가 기준 (클리어시간, 공격횟수, LEGENDARY 비율 등)
- URL 기반 라우팅 (`react-router` 도입)

---

## 2. 게임플레이 룰

### 2.1 보스전 핵심 규칙

| 항목 | 값 |
|---|---|
| 보스 최대 HP | `BOSS_MAX_HP = 2000` |
| 1회 공격 데미지 | `Math.max(state.totalScore, 1)` |
| 공격 키 | `Space` |
| 누적 점수 | **보존** (차감 없음, 매 공격마다 동일 데미지) |
| 사망 조건 | `bossHP <= 0` |
| 패배 조건 | **없음** (점수 0이라도 1 데미지 클램프로 결국 처치 가능) |

### 2.2 공격 흐름

1. 사용자 `Space` 입력 → `bossHP -= damage`
2. 피격 애니메이션 (CSS shake, 200ms)
3. `bossHP <= 0` → 사망 연출(소멸 트랜지션, 600ms) → `nickname_input` 씬 자동 전환
4. 사망 연출 중 입력 무시 (boolean 가드)

### 2.3 데미지 계산 유틸 (`bossUtils.js`)

```javascript
export const BOSS_MAX_HP = 2000;

export function clampDamage(totalScore) {
  return Math.max(totalScore, 1);
}

export function computeAttacksToKill(totalScore, hp = BOSS_MAX_HP) {
  return Math.ceil(hp / clampDamage(totalScore));
}
```

---

## 3. 씬 흐름 / 라우팅

### 3.1 흐름도

```
intro
  ├─ "시작" → world → minigame_1 → world → minigame_2 → ... → minigame_4
  │                                                              ↓
  │                                                          boss_fight
  │                                                              ↓
  │                                                       nickname_input
  │                                                              ↓
  │                                              ranking (mode='after_clear')
  │                                                              ↓
  │                                                          ending
  └─ "랭킹 보기" → ranking (mode='readonly') ──────── "돌아가기" ──→ intro
```

### 3.2 라우팅 방식

**현재 `App.jsx`의 `state.scene` 기반 분기를 그대로 사용한다.** `react-router` 도입하지 않음.

이유: ① URL 공유/북마크 요구 없음, ② 키보드 입력 중심 게임, ③ 현재 라우팅 패턴 유지(surgical scope), ④ 백엔드 도입 시에도 라우팅 변경 불필요.

```jsx
{state.scene === 'boss_fight' && (
  <BossFightScene
    totalScore={state.totalScore}
    onCleared={() => dispatch({ type: 'GO_TO_SCENE', payload: 'nickname_input' })}
  />
)}
{state.scene === 'nickname_input' && (
  <NicknamePromptModal
    score={state.totalScore}
    onRegistered={(entryId) => {
      dispatch({ type: 'SET_LAST_RANKING_ENTRY', payload: entryId });
      dispatch({ type: 'GO_TO_RANKING', payload: 'after_clear' });
    }}
  />
)}
{state.scene === 'ranking' && (
  <RankingScene
    mode={state.rankingMode}
    highlightedEntryId={state.lastRegisteredEntryId}
    onContinue={() => dispatch({ type: 'GO_TO_SCENE', payload: 'ending' })}
    onBack={() => dispatch({ type: 'GO_TO_SCENE', payload: 'intro' })}
  />
)}
```

---

## 4. 컴포넌트 설계

### 4.1 파일 구조

```
src/
  components/
    BossFightScene/
      BossFightScene.jsx
      BossFightScene.css
      bossUtils.js
    NicknamePromptModal/
      NicknamePromptModal.jsx
      NicknamePromptModal.css
    RankingScene/
      RankingScene.jsx
      RankingScene.css
  ranking/
    rankingRepository.js          # 인터페이스 + 기본 export (현재는 localStorage 어댑터)
    localStorageRanking.js        # LocalStorage 어댑터 구현체
  store/
    gameStore.jsx                 # scene 타입 확장 + rankingMode + lastRegisteredEntryId
```

### 4.2 BossFightScene

**책임:** 보스전 화면 렌더 + 공격 입력 처리 + HP 차감 + 사망 연출 + 다음 씬 전환

**Props:**
- `totalScore: number` — 데미지 산출에 사용
- `onCleared: () => void` — 사망 연출 종료 후 호출

**State:**
- `bossHP: number` — 초기값 `BOSS_MAX_HP`
- `phase: 'fighting' | 'dying'` — 사망 연출 중 입력 차단

**UI 구성:**
- 좌측: 갑옷 그린이 (정적 이미지/스프라이트, 별도 이슈에서 교체)
- 우측: 보스 (피격 시 shake, 사망 시 페이드/스케일 다운)
- 상단: 보스 HP 바 (`현재 / 최대`)
- 하단 idle 패널: "**Space**로 공격! (1타 데미지: `damage`)"

**키 입력:**
- `Space` 또는 `Enter` → 공격 (`phase === 'fighting'`일 때만)
- 사망 연출 종료 시 `setTimeout` → `onCleared()`

### 4.3 NicknamePromptModal

**책임:** 닉네임 입력 받기 + 검증 + `rankingRepository.register` 호출

**Props:**
- `score: number` — 등록할 점수
- `onRegistered: (entryId: string) => void`

**State:**
- `nickname: string`
- `error: string | null`
- `submitting: boolean` — 중복 클릭 방지

**검증 규칙:**
- 양끝 trim → 빈 문자열이면 등록 버튼 disabled / 에러 메시지
- 가운데 공백 허용
- 클라이언트 길이 가드: **최대 16자** (백엔드 도입 시 조정 가능 — 상수 `MAX_NICKNAME_LENGTH` 분리)
- 비속어 필터 없음 (백엔드에서 처리 예정)
- 중복 닉네임 허용 (백엔드에서 처리 예정)

**제출:**
- `Enter` 또는 "등록" 버튼 → `repository.register({ nickname: trimmed, score })` → `onRegistered(entry.id)`
- 등록 실패(저장소 에러) → 에러 메시지 + 재시도 가능

### 4.4 RankingScene

**책임:** TOP 10 표시 + 본인 순위 강조 / read-only 표시

**Props:**
- `mode: 'after_clear' | 'readonly'`
- `highlightedEntryId: string | null` — `after_clear` 모드에서 강조 대상
- `onContinue: () => void` — `after_clear` 모드의 "계속하기" 버튼
- `onBack: () => void` — `readonly` 모드의 "돌아가기" 버튼

**렌더 규칙:**
- 헤더: "🏆 랭킹"
- TOP 10 테이블: `순위 / 닉네임 / 점수 / 등록일시`
- `after_clear`: 
  - 강조 entry가 TOP 10 안 → 그 행 하이라이트
  - 강조 entry가 TOP 10 밖 → 리스트 아래 별도 행 "내 순위: N위" + 본인 entry
  - 하단: "**Enter**로 계속하기" 버튼
- `readonly`:
  - 하단: "돌아가기" 버튼 (Esc/Enter)
  - 데이터 없으면 "아직 등록된 기록이 없습니다." 안내

**키 입력:**
- `Enter` → onContinue / onBack (모드 분기)
- `Escape` → readonly 모드에서 onBack

---

## 5. 랭킹 저장소 설계

### 5.1 인터페이스 (`rankingRepository.js`)

백엔드 어댑터로 교체 가능하도록 단일 인터페이스로 추상화. 현재는 LocalStorage 구현체를 default export.

```javascript
// rankingRepository.js
import { localStorageRanking } from './localStorageRanking';

// 기본 export — 현재는 LocalStorage 어댑터
// 백엔드 도입 시 ./apiRanking.js 추가 후 이 줄만 교체
export const rankingRepository = localStorageRanking;
```

**API:**
```typescript
type Entry = {
  id: string;             // crypto.randomUUID()
  nickname: string;
  score: number;
  registeredAt: number;   // Date.now()
};

interface RankingRepository {
  register(input: { nickname: string; score: number }): Promise<Entry>;
  getTopN(n?: number): Promise<Entry[]>;          // 기본 n=10
  getRankOf(entryId: string): Promise<number | null>;
  getEntry(entryId: string): Promise<Entry | null>;
}
```

`Promise` 반환으로 통일 — LocalStorage는 동기지만 `Promise.resolve`로 감싸 백엔드 어댑터와 시그니처 호환.

### 5.2 LocalStorage 어댑터 (`localStorageRanking.js`)

- **저장 키:** `quickness-game.ranking.v1`
- **저장 구조:**
  ```json
  {
    "entries": [
      { "id": "...", "nickname": "...", "score": 1234, "registeredAt": 1700000000000 }
    ]
  }
  ```
- **정렬 (조회 시 매번 재정렬):**
  1. `score` 내림차순
  2. 동률 시 `registeredAt` 오름차순 (먼저 등록한 사람 우선)
- **`getRankOf(id)`:** 정렬된 배열에서 인덱스 + 1
- **에러 처리:**
  - `localStorage` 접근 실패 (private mode, quota exceeded) → 인메모리 fallback (모듈 레벨 `Map`) + `console.warn`
  - JSON 파싱 실패 → 빈 배열로 초기화 + 경고
  - 저장 실패 → 호출자에게 throw

### 5.3 ID 생성

`crypto.randomUUID()` 사용. 미지원 환경 대비 fallback: `${Date.now()}-${Math.random().toString(36).slice(2)}`.

---

## 6. gameStore 변경

### 6.1 상태 확장

```javascript
const initialState = {
  scene: 'intro',         // 'intro' | 'world' | 'minigame_1~3' | 'armor' | 'minigame_4'
                          // | 'boss_fight' | 'nickname_input' | 'ranking' | 'ending'
  worldStage: 0,
  totalScore: 0,
  hasArmor: false,
  bossHP: 1500,           // (deprecated — BossFightScene 내부 상태로 이동, 이번 이슈에서 제거)
  lastMiniScore: null,
  rankingMode: null,              // 'after_clear' | 'readonly' | null
  lastRegisteredEntryId: null,    // 랭킹 강조용
};
```

`bossHP`는 BossFightScene 내부 state로 옮기고 store에서 제거(이미 미사용 placeholder).

### 6.2 액션 추가

| 액션 | payload | 효과 |
|---|---|---|
| `GO_TO_RANKING` | `'after_clear' \| 'readonly'` | `scene='ranking'`, `rankingMode=payload` |
| `SET_LAST_RANKING_ENTRY` | `entryId: string` | `lastRegisteredEntryId=payload` |
| `RESET` (기존) | — | 모든 신규 필드도 초기화 |

`GO_TO_SCENE` 그대로 사용하되 `'ranking'`으로 갈 때는 `GO_TO_RANKING` 액션 권장 (mode 누락 방지).

---

## 7. 인트로 변경

`IntroScene`에 "랭킹 보기" 버튼/링크 추가:

- 위치: "시작" 버튼 하단
- 동작: `dispatch({ type: 'GO_TO_RANKING', payload: 'readonly' })`
- 키 입력: 없음 (마우스 클릭 우선) — 현재 인트로의 키 입력 패턴과 충돌 회피

---

## 8. 테스트 전략

### 8.1 단위 테스트 (별도 테스트 러너 미설치 → 함수 단위 검증 가능한 형태로 분리)

- `bossUtils.clampDamage` — 음수/0/양수 케이스
- `bossUtils.computeAttacksToKill` — 경계값 (HP=2000, score=1 → 2000회)
- `localStorageRanking`:
  - 신규 등록 → `getTopN`에 노출
  - 점수 내림차순 정렬
  - 동률 시 등록 시간 빠른 순
  - `getRankOf` 정확성
  - localStorage 실패 시 메모리 fallback

### 8.2 컴포넌트 / 통합

수동 검증:
- BossFightScene: Space 연타 → HP 0 → nickname_input 전환
- NicknamePromptModal: 빈 문자열 / trim / 16자 초과 / 공백 포함 닉네임
- RankingScene `after_clear`: TOP 10 안/밖 강조 표시
- RankingScene `readonly`: 빈 데이터 안내 / 돌아가기

### 8.3 E2E (수동)

1. 인트로 → 랭킹 보기 → 비어있음 안내 → 돌아가기 → 인트로 ✅
2. 풀 플레이 → 보스 처치 → 닉네임 입력 → 랭킹 강조 → 계속하기 → ending ✅
3. 두 번 클리어 후 두 entry가 정렬되어 보임 ✅
4. private mode (또는 localStorage 차단) → 메모리 fallback 동작, 콘솔 경고 ✅

---

## 9. 에러 / 엣지 케이스

| 케이스 | 처리 |
|---|---|
| `totalScore <= 0` | `clampDamage`에서 `1` 보장 → 무한 공격으로 결국 클리어 |
| 보스 사망 연출 중 입력 | `phase='dying'` 가드로 무시 |
| 닉네임 빈 문자열 / 공백만 | trim 후 빈 → 등록 버튼 disabled |
| 닉네임 16자 초과 입력 | 입력 단계에서 `maxLength=16` |
| `localStorage` 접근 실패 | 메모리 fallback + 콘솔 경고 |
| `JSON.parse` 실패 | 빈 배열 초기화 + 경고 |
| `crypto.randomUUID` 미지원 | `${Date.now()}-${random}` fallback |
| 인트로 readonly 진입 후 클리어 플로우 | RESET 시 `rankingMode`, `lastRegisteredEntryId` 모두 초기화 |
| 빈 랭킹에서 `after_clear` 강조 | 자기 자신이 1위로 강조됨 (정상 케이스) |

---

## 10. 마이그레이션 / 호환성

- 기존 사용자: localStorage 키 `quickness-game.ranking.v1`은 신규 → 기존 데이터 영향 없음
- gameStore: `bossHP` 필드 제거 (외부에서 참조하는 곳 없음 — 확인됨)
- `boss_fight` 씬: 기존 placeholder는 단순 `onContinue`로 ending 직행 → 새 컴포넌트는 `onCleared` → `nickname_input` 경유. 사용자 영향 없음(placeholder가 비기능)

---

## 11. 백엔드 도입 시 변경점 (참고, 이번 이슈 아님)

향후 `apiRanking.js` 추가 시:

1. `apiRanking.js`에서 동일 인터페이스 구현 (fetch 기반)
2. `rankingRepository.js`의 default export를 교체
3. `register()`에서 비속어 필터 / 중복 닉네임 검증 → 에러 throw → `NicknamePromptModal`이 에러 표시
4. `MAX_NICKNAME_LENGTH` 상수만 백엔드 정책에 맞게 조정

호출하는 컴포넌트(`NicknamePromptModal`, `RankingScene`)는 변경 없음.

---

## 12. 작업 체크리스트

- [ ] `bossUtils.js` 작성 + 단위 검증
- [ ] `BossFightScene` 컴포넌트 + CSS
- [ ] `localStorageRanking.js` 작성 + 단위 검증
- [ ] `rankingRepository.js` (인터페이스 + default export)
- [ ] `NicknamePromptModal` 컴포넌트 + CSS
- [ ] `RankingScene` 컴포넌트 + CSS (after_clear / readonly 양 모드)
- [ ] `gameStore.jsx` 액션/필드 확장
- [ ] `App.jsx` 라우터 분기 교체
- [ ] `IntroScene`에 "랭킹 보기" 버튼 추가
- [ ] 수동 E2E 4 케이스 검증
- [ ] private mode fallback 동작 확인
