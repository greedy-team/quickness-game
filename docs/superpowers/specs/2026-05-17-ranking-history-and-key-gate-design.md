# /ranking 기록 표시 + 키 입력 게이트 — 설계 문서

- **작성일**: 2026-05-17
- **관련 이슈**: #51 (랭킹 API 연동 및 힌트 텍스트 추가)
- **범위**: `/ranking` 페이지에서 백엔드 리더보드 기록 표시 + 자동 복귀 타이머 제거

---

## 1. 배경

현재 `src/routes/RankingPage/RankingPage.jsx`는 다음 상태이다.

- `entries`가 `useState([])`로 시작하고 API 미연동 → 항상 "아직 기록이 없습니다." 표시.
- 마운트 직후 `RANKING_CONFIG.autoReturnMs`(15초) 타이머가 시작되어 사용자 입력 없이도 타이틀로 자동 복귀.
- `EndingPage`에서 `state.highlightId`(= `userId`)를 넘기지만, 실제 백엔드 응답에는 `userId`/`outcome`이 없어 매칭 불가.

사용자가 기록을 충분히 살펴볼 수 없고, 키 입력 전에도 화면이 이동해 버리는 두 문제를 해결한다.

## 2. 목표

1. `/ranking` 진입 시 백엔드에서 quickness-game 리더보드 상위 기록을 받아와 화면에 표시한다.
2. 사용자가 **Space/Enter 키를 누르기 전까지는 자동으로 화면이 이동하지 않는다**. ("처음으로" 버튼 클릭도 허용.)
3. 백엔드 스펙과 일치하지 않는 UI 요소(결말 컬럼, 본인 행 강조)는 제거하여 표시 정확성을 확보한다.

## 3. 비목표 (Out of Scope)

- **본인 행 강조** 기능: 현 백엔드 응답이 `userId`를 반환하지 않아 신뢰성 있는 매칭이 불가능하다. 별도 이슈로 분리.
- **본인이 top N 밖일 때 별도 행 노출**: 전체 랭킹 조회 API가 없으므로 구현 불가.
- `EndingNicknameForm`에서 라벨("닉네임" vs `userId`) 정리: 본 작업과 무관한 별도 정리 항목.

## 4. 백엔드 API

`docs/api-docs.json` 기준.

### 4.1 엔드포인트
- `GET /api/leader-board/quickness-game`
- 응답 (`GameRankingResponse`):
  ```json
  {
    "gameName": "quickness-game",
    "unit": "점",
    "rankings": [
      { "rank": 1, "nickname": "...", "score": 0 }
    ]
  }
  ```
- `rankings`는 상위 5명 (API 문서 명시).

### 4.2 환경 변수
- `VITE_API_BASE_URL` — `src/api/result.js`에서 사용 중인 값과 동일.
- `VITE_API_KEY` — 인증 필요 여부 확정 불가. 1차 구현은 헤더/쿼리 없이 호출하고, 실제 호출에서 401이 발생하면 후속 패치로 보강한다.

## 5. 아키텍처 변경

### 5.1 신규: `src/api/leaderboard.js`

`src/api/result.js`와 동일한 패턴.

```
export async function fetchLeaderboard()
  → { ok: true, rankings: Ranking[] }
  | { ok: false, status?: number, message: string }
```

- 8초 타임아웃 (`AbortController`).
- `VITE_API_BASE_URL` 누락 시 `{ ok: false, status: 0, message: '환경 설정 오류가 발생했습니다.' }`.
- `response.ok` 전체를 성공으로 처리, `rankings` 배열만 추출하여 반환.
- 4xx → "기록을 불러오지 못했습니다." / 5xx → "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." / 네트워크/타임아웃 → "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
- `throw` 하지 않음. 호출자는 `result.ok` 분기만 사용.

### 5.2 `RankingPage.jsx`

#### 상태
- `entries: Ranking[] | null` — 로딩 식별을 위해 `null`로 시작.
- `errorMessage: string | null`.

#### 효과 (useEffect)

| 효과 | 내용 |
|---|---|
| fetch | 마운트 시 `fetchLeaderboard()` 호출 → 성공 시 `entries` 세팅, 실패 시 `errorMessage` 세팅 (`entries`는 빈 배열). |
| keydown | Space/Enter → `goTitle()`. 마운트 직후부터 활성. 로딩 상태에서도 동작. |
| ~~autoReturn~~ | **삭제**. 자동 복귀 타이머는 더 이상 존재하지 않는다. |

#### 렌더 분기

| 조건 | 표시 |
|---|---|
| `entries === null && !errorMessage` | "기록을 불러오는 중…" |
| `errorMessage` | 에러 메시지 |
| `entries.length === 0` | 기존 "아직 기록이 없습니다." |
| `entries.length > 0` | 순위 표 (rank/nickname/score) |

#### 표 컬럼
- 순위, 닉네임, 점수의 **3열**. `결말` 컬럼 및 `RANKING_CONFIG.outcomeLabels` 참조는 본 페이지에서 제거.
- 본인 행 강조 (`isMe` / `--me` modifier) 및 top 밖 별도 행 (`__myrow`) 제거.

#### 힌트 문구
- 기존: "Space / Enter 또는 잠시 후 타이틀로 돌아갑니다."
- 변경: "Space / Enter 키로 처음 화면으로 돌아갑니다."

### 5.3 `src/ranking/ranking.config.js`
- `autoReturnMs` 키 **삭제**.
- `outcomeLabels`는 ending 흐름에서 계속 사용하므로 유지.
- `topN`은 백엔드가 상위 5만 반환하므로 사실상 안 쓰이지만, 향후 확장 여지를 위해 유지(현재 페이지에서 참조 제거).

### 5.4 `src/routes/EndingPage/EndingPage.jsx`
- `navigate('/ranking', { state: { highlightId } })` → `navigate('/ranking')` 로 변경 (state 불필요).
- `highlightId` 관련 useState는 등록 성공 여부 표시(`success` 모달의 점수 강조 등)에 더 이상 영향을 주지 않으므로, 사용처가 없으면 제거. (현 코드에서는 `setHighlightId(userId)` 후 navigate state에만 사용 — 따라서 `highlightId` 상태도 제거 대상.)

## 6. 데이터 흐름

```
타이틀 "🏆 랭킹 보기" 클릭
   → /ranking 진입
       → fetchLeaderboard() 호출
            ├─ 200 ok → entries 채움 → 표 렌더
            └─ 실패 → errorMessage 표시 (entries=[])
   → 사용자가 Space/Enter 또는 "처음으로" 버튼
       → resetGame() + navigate('/')

엔딩 등록 성공 → outro → /ranking
   → 동일 흐름. highlightId 미사용.
```

## 7. 에러 처리

- 환경 변수 누락 / 네트워크 / 타임아웃 / 4xx / 5xx 모두 `errorMessage` 상태에 사용자 친화 문구로 표시.
- 에러 상태에서도 Space/Enter는 동작 (사용자 이탈권 보장).
- 재시도 버튼은 본 작업에서 추가하지 않음 (페이지 재진입으로 충분, YAGNI).

## 8. 키 입력 정책

| 시점 | 동작 |
|---|---|
| 마운트 즉시 | `keydown` 리스너 등록. Space/Enter → `goTitle`. |
| 로딩 중 | 키 입력 허용 (사용자 이탈권 보장). |
| 에러 표시 중 | 키 입력 허용. |
| 데이터 표시 후 | 키 입력 허용 (변경 없음). |
| 자동 복귀 | **없음**. |

## 9. 테스트

### 9.1 `src/api/leaderboard.test.js` (신규)
`result.test.js` 패턴 그대로:
- 200 + 정상 응답 → `{ ok: true, rankings: [...] }`.
- 요청 URL/메서드 검증.
- 4xx → `{ ok: false, message: '기록을 불러오지 못했습니다.' }`.
- 5xx → 서버 오류 메시지.
- fetch reject → 네트워크 오류 메시지.
- AbortError → 네트워크 오류 메시지.
- `VITE_API_BASE_URL` 누락 → 환경 설정 오류.

### 9.2 `src/routes/RankingPage/__tests__/RankingPage.test.jsx` (신규, 선택)
- 로딩 상태 표시.
- 정상 응답 시 표 렌더링 + 행 수.
- 빈 응답 시 "아직 기록이 없습니다.".
- 에러 응답 시 에러 메시지 표시.
- Space/Enter 키 입력 시 `navigate('/')` 호출.
- 자동 복귀 타이머가 없는지 확인 (`vi.useFakeTimers()` + 충분히 진행해도 navigate 미호출).

## 10. 변경 파일 요약

| 파일 | 종류 | 변경 |
|---|---|---|
| `src/api/leaderboard.js` | 신규 | fetch 클라이언트 |
| `src/api/leaderboard.test.js` | 신규 | API 클라이언트 단위 테스트 |
| `src/routes/RankingPage/RankingPage.jsx` | 수정 | API 연동, autoReturn/outcome/highlight 제거, hint 문구 수정 |
| `src/routes/RankingPage/RankingPage.css` | 수정 | 로딩/에러 상태 스타일 추가 |
| `src/routes/RankingPage/__tests__/RankingPage.test.jsx` | 신규 (선택) | 통합 테스트 |
| `src/ranking/ranking.config.js` | 수정 | `autoReturnMs` 키 삭제 |
| `src/routes/EndingPage/EndingPage.jsx` | 수정 | `navigate('/ranking')`로 단순화, `highlightId` 상태 제거 |

## 11. 리스크 / 미해결 항목

- `VITE_API_KEY` 필요 여부: 1차에서는 미적용. 실제 호출에서 인증 실패가 발생하면 후속 패치.
- 본인 행 강조 기능 부재: UX 회귀로 인식될 수 있음. 별도 이슈에서 (a) 백엔드가 `userId`를 응답에 포함시키거나 (b) `/api/users/{userId}` 조회로 nickname 매칭 처리.
- 백엔드가 상위 5만 반환하지만 `topN`은 config에 남아 있음 — 혼동 가능. 현 페이지에서 참조하지 않으므로 영향 없으나 향후 정리 대상.
