# /ranking UI 톤 교체 + 내 행 하이라이트 — 설계 문서

- **작성일**: 2026-05-17
- **관련 이슈**: #51 (후속 작업)
- **선행 작업**: `2026-05-17-ranking-history-and-key-gate-design.md` (API 연동, 자동 복귀 제거)

---

## 1. 배경

`/ranking`은 현재 검정 배경 + 단순 HTML 테이블로 리더보드를 보여준다. 게임 내 다른 결과 화면(`ResultModal`)은 모노 폰트 + 황금색 점수 + `tier-row--current` 강조라는 일관된 비주얼 톤을 가진다. 랭킹 화면도 같은 톤으로 옮겨 시각적 통일감을 만들고, 엔딩 직후 진입한 사용자의 행을 강조해 본인 위치를 즉시 보이게 한다.

## 2. 목표

1. `/ranking`의 비주얼 톤을 `ResultModal` 톤(검정 배경, Courier mono, `#ffcc00` 점수, `#00ffcc` 헤드라인 글로우, ul/li 카드 레이아웃)으로 교체한다.
2. 엔딩 등록 직후 진입한 사용자의 행을 `tier-row--current` 스타일과 동일한 강조(흰색 outline + 반투명 배경 + 큰 폰트)로 표시한다.
3. 타이틀에서 직접 진입한 경우(엔딩 흐름 아님)에는 강조 없이 평범한 리스트로 표시한다.

## 3. 비목표 (Out of Scope)

- 본인이 top 5 밖일 때 "내 N위" 별도 행 표시 (전체 랭킹 API 부재).
- 엔딩 폼의 입력 의미(userId vs nickname 라벨 혼선) 정리.
- 자동 새로고침 / 실시간 업데이트.
- 닉네임 충돌 시 정교한 식별 (점수 보조 매칭으로 충분).

## 4. 식별 전략

리더보드 응답 `{ rank, nickname, score }`엔 `userId`가 없으므로 직접 매칭 불가. 두 단계로 해결:

1. 엔딩 submit 성공 직후 `GET /api/users/{userId}` 호출 → 사용자의 `nickname` 확보.
2. 그 `nickname`과 방금 등록한 `totalScore`를 `location.state`로 `/ranking`에 전달.
3. RankingPage가 fetch 결과에서 `r.nickname === myNickname && r.score === myScore` 인 첫 행을 강조.

`nickname` 단독이 아닌 `nickname + score` 복합 매칭으로 동명이인 충돌을 완화. 둘 다 동일한 희박 케이스는 첫 매칭 행 강조로 허용.

## 5. 백엔드 API

`docs/api-docs.json` 기준.

### 5.1 신규 호출 — 유저 조회 (ID)
- `GET /api/users/{userId}`
- 응답 (`UserInfoResponse`): 정확한 필드는 docs/api-docs.json 참조. 본 작업에선 `nickname` 한 필드만 사용. 없으면 강조 미적용으로 폴백.

### 5.2 기존 호출
- `GET /api/leader-board/quickness-game` (선행 작업에서 구현됨, 변경 없음).

## 6. 아키텍처 변경

### 6.1 신규: `src/api/users.js`

`src/api/result.js`/`leaderboard.js`와 동일 패턴.

```
export async function getUserById(userId)
  → { ok: true, user: { nickname, ... } }
  | { ok: false, status?: number, message: string }
```

- 8초 타임아웃 (`AbortController`).
- env 누락(`VITE_API_BASE_URL`) → 콘솔 에러 + `{ ok: false, status: 0, message: '환경 설정 오류가 발생했습니다.' }`.
- `response.ok` → 파싱한 JSON을 `{ ok: true, user: data }`로 그대로 노출. 호출자는 `result.user.nickname`만 읽음.
- 4xx → `{ ok: false, status, message: '유저 정보를 가져오지 못했습니다.' }`.
- 5xx → 서버 오류 메시지.
- 네트워크/AbortError → 네트워크 오류 메시지.
- throw 하지 않음.

### 6.2 `EndingPage.jsx`

`handleUserIdSubmit`의 성공 분기 확장:

```
result = await submitResult({ userId, score: totalScore })
if (result.ok):
  setSubmittedScore(totalScore)
  setIsSubmitting(false)
  setPhase('success')
  // 비동기, success 단계 진행을 막지 않는다
  void getUserById(userId).then((r) => {
    if (r.ok && r.user?.nickname) {
      setMyHighlight({ nickname: r.user.nickname, score: totalScore })
    }
  })
```

- 새 상태 `myHighlight: { nickname, score } | null`.
- `outro → /ranking` 두 navigate 호출은 `navigate('/ranking', myHighlight ? { state: myHighlight } : undefined)`로 변경. lookup이 실패해도 navigate는 정상 진행 (강조만 빠짐).
- success 단계 동안 lookup이 진행되며, outro로 넘어갈 즈음엔 대부분 결과가 도착해 있을 것 (`outroMs` ~ 수백 ms). lookup이 늦으면 강조 없이 진입 — 허용.

### 6.3 `RankingPage.jsx`

#### 데이터
- 기존 `entries: Ranking[] | null`, `errorMessage: string | null` 유지.
- 신규: `useLocation()`으로 `state.nickname`, `state.score` 읽음. 둘 중 하나라도 없으면 매칭 비활성.

#### 렌더
- 표(`<table>`) → `<ul class="ranking-list">` + `<li class="ranking-list__row">` 구조.
- 각 행 3-column grid (`#rank` / nickname / `score점`).
- 매칭 행에 `ranking-list__row--current` 클래스 추가.
- 헤드라인 `RANKING` (이모지 제거) — `#00ffcc` 색 + glow.
- hint 문구는 변경 없음 ("Space / Enter 키로 처음 화면으로 돌아갑니다." 또는 모노 톤 짧은 변형 — 본 작업에선 그대로 유지).

#### 키 입력 정책
- 변경 없음 (Space/Enter → goTitle, 자동 복귀 없음).

### 6.4 `RankingPage.css`

- `.ranking-page__table` / `th` / `td` / `__row` 셀렉터 삭제.
- 신규 셀렉터:
  - `.ranking-page__headline` (cyan glow)
  - `.ranking-list` (ul, mono font)
  - `.ranking-list__row` (grid, padding, 회색 텍스트)
  - `.ranking-list__rank` (왼쪽 정렬, bold)
  - `.ranking-list__nickname`
  - `.ranking-list__score` (오른쪽 정렬, `#ffcc00`, bold)
  - `.ranking-list__row--current` (흰 outline + `rgba(255,255,255,0.08)` 배경 + 큰 폰트 + 흰색 텍스트)
- `.ranking-page__status` / `__empty` 등 기존 메시지 셀렉터는 유지.

## 7. 데이터 흐름

```
[엔딩 등록 성공]
  setPhase('success')
  void getUserById(userId)
        ├─ ok → setMyHighlight({ nickname, score: totalScore })
        └─ 실패 → (state 미설정)

[success → outro → /ranking]
  navigate('/ranking', myHighlight ? { state: myHighlight } : undefined)

[RankingPage 마운트]
  fetchLeaderboard()
  location.state → myNickname, myScore (둘 다 있을 때만)
  렌더 시 r.nickname === myNickname && r.score === myScore 인 첫 행에 --current

[타이틀 → /ranking]
  state 없음 → 매칭 미시도 → 강조 없이 표시
```

## 8. 에러 처리

| 상황 | 동작 |
|---|---|
| `getUserById` 환경 변수 누락 | `console.error` + 강조 없이 진입 |
| `getUserById` 4xx/5xx/네트워크/타임아웃 | 강조 없이 진입 (사용자에게 별도 알림 없음) |
| RankingPage 강조 매칭 0건 (top5 밖) | 강조 없음 (정상 동작) |
| nickname 또는 score 하나만 state에 있음 | 매칭 비활성 (둘 다 필요) |

## 9. 테스트

### 9.1 `src/api/users.test.js` (신규)
`leaderboard.test.js` 패턴 그대로:
- 200 + body → `{ ok: true, user: data }`
- 요청 URL/메서드 (`GET ${baseUrl}/api/users/${userId}`)
- 4xx → `{ ok: false, status, message: '유저 정보를 가져오지 못했습니다.' }`
- 5xx → 서버 오류 메시지
- fetch reject → 네트워크 오류 메시지
- AbortError → 네트워크 오류 메시지
- `VITE_API_BASE_URL` 누락 → 환경 설정 오류

### 9.2 `src/routes/RankingPage/__tests__/RankingPage.test.jsx` (추가)
기존 9 케이스 + 강조 케이스 2~3개:
- `location.state.nickname` + `state.score` 가 응답 행과 매칭되면 그 행에 `ranking-list__row--current` 클래스가 붙는다.
- state 없으면 어떤 행에도 `--current` 클래스가 없다.
- score만 일치하고 nickname 불일치면 강조 없음.

테스트는 `MemoryRouter` `initialEntries`에 `{ pathname: '/ranking', state: {...} }`를 넘기는 형태로 구성.

### 9.3 EndingPage
신규 단위 테스트는 추가하지 않는다 (기존 `__tests__` 없음, 별도 도입은 out of scope). 수동 검증은 dev 서버에서 한다.

## 10. 변경 파일 요약

| 파일 | 종류 | 변경 |
|---|---|---|
| `src/api/users.js` | 신규 | `getUserById` 클라이언트 |
| `src/api/users.test.js` | 신규 | 단위 테스트 |
| `src/routes/RankingPage/RankingPage.jsx` | 수정 | ul/li 구조, useLocation으로 state 읽어 매칭, mono 톤 |
| `src/routes/RankingPage/RankingPage.css` | 수정 | 테이블 셀렉터 제거, ranking-list 셀렉터 + 강조 행 + 헤드라인 글로우 |
| `src/routes/RankingPage/__tests__/RankingPage.test.jsx` | 수정 | 강조 케이스 추가 |
| `src/routes/EndingPage/EndingPage.jsx` | 수정 | submit 성공 시 nickname lookup, navigate state 부착 |

## 11. 리스크 / 미해결 항목

- `GET /api/users/{userId}`의 정확한 응답 스키마는 `docs/api-docs.json`의 `UserInfoResponse`에 정의되어 있으나 구현 시점에 필드명을 확인해야 한다. `nickname` 키가 아닌 경우 그에 맞춰 추출 로직 조정.
- lookup이 outro 진행보다 늦게 끝나면 강조가 빠진다. 현재 `outroMs`는 짧으므로 가끔 미스 가능. 사용자 영향 작아 본 작업에선 별도 보정 없음 (필요하면 후속 이슈에서 outro 진입 전 lookup 완료 대기로 보강).
- 닉네임+점수 모두 동일한 다중 사용자가 있을 때 첫 행만 강조. 발생 빈도 낮아 허용.
