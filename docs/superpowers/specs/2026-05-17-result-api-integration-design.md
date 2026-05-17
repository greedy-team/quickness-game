# Result API 연동 (Issue #51 후속)

**작성일:** 2026-05-17
**대상:** quickness-game 엔딩 흐름에서 점수 등록 API(`POST /api/result`) 연동

---

## 1. 배경

현재 엔딩 흐름은 `EndingPage` → `EndingNicknameForm`에서 닉네임을 받아 로컬 상태로만 처리하고 `/ranking`으로 진입한다. `EndingPage.jsx:86-90`에 `TODO: 백엔드 API 연동`만 남아 있다.

리더보드 서비스는 별도 페이지에서 이미 유저 등록을 마쳤고, 발급된 4자리 `userId`(예: `AAAA`)를 사용자가 보유한 상태로 부스에 진입한다고 가정한다. 따라서 이 작업은 **신규 유저 생성/조회 API는 다루지 않고**, `POST /api/result`만 연동한다.

## 2. 목표

- 엔딩 폼의 닉네임 입력을 **userId 입력**으로 교체한다.
- 폼 제출 시 `POST /api/result`를 호출하고 결과에 따라 UX를 분기한다.
- `apiKey`는 환경 변수에서 주입하고 소스에 하드코딩하지 않는다.
- 부스 환경에서 멈추지 않도록 실패 UX는 폼에서 재시도 가능하게 한다.

## 3. 비목표

- 신규 유저 생성/조회(`/api/users*`) 연동.
- `/ranking` 페이지가 보드 데이터를 백엔드에서 가져오는 작업 (별도 이슈).
- userId 형식 검증(영문/숫자/길이 등) — 사용자 결정에 따라 검증 없이 입력값 그대로 전송한다.
- 점수 산정 로직 변경.

## 4. 사용자 흐름

```
엔딩 컷씬(reveal/hold/leaving)
  → EndingNicknameForm(userId 입력)
    → 제출
      → API 호출 중: 버튼 비활성, 인디케이터
        → 성공(200): 결과 모달 표시
          → 모달 닫기(Enter/클릭): /ranking 진입 (기존 흐름)
        → 실패: 폼 아래 에러 메시지 표시, 입력 유지, 재제출 가능
```

## 5. 데이터 흐름

요청 페이로드:

```json
{
  "gameName": "quickness-game",
  "userId": "<폼 입력값 trim>",
  "score": "<selectTotalScore(state) 값, 정수 0~600>",
  "apiKey": "<import.meta.env.VITE_API_KEY>"
}
```

- `gameName`은 상수(`API_GAME_NAME = "quickness-game"`)로 둔다.
- `score`는 zustand 스토어의 `selectTotalScore` 셀렉터 값. 현재 4개 스테이지 합산이며, 0 이상 정수다. 별도 변환 없이 전송한다.
- `apiKey`는 빌드 타임에 Vite가 주입하는 `import.meta.env.VITE_API_KEY`를 사용. 누락 시 클라이언트에서 즉시 `Error("missing VITE_API_KEY")`를 던져 빠르게 실패한다.

응답:

- 200 → 모달 노출, `/ranking`로 이동.
- 그 외 → 사용자에게 표시할 에러 메시지를 만들고 폼 상태를 유지한다.

## 6. 환경 변수

기존 `.env`/`.env.example` 키 이름을 Vite 규약에 맞춰 **rename**한다.

```diff
- API_BASE_URL=https://7y8yhdx6vf.execute-api.ap-northeast-2.amazonaws.com
- API_KEY=tempgreedy
+ VITE_API_BASE_URL=https://7y8yhdx6vf.execute-api.ap-northeast-2.amazonaws.com
+ VITE_API_KEY=tempgreedy
```

- Vite는 `VITE_` 접두사가 붙은 변수만 클라이언트 번들로 노출하므로 접두사 없이 두면 `import.meta.env`에서 읽히지 않는다.
- `apiKey`가 클라이언트 번들에 포함되는 구조라는 점은 현재 백엔드 설계가 받아들이는 전제다. (보안 검토는 본 스펙 범위 밖.)
- 빌드 시 `vite build`가 `.env`/`.env.local`을 자동으로 로드하므로 추가 설정은 없다.

## 7. 컴포넌트 변경

### 7.1 신규: `src/api/result.js`

작은 API 클라이언트 모듈. 단일 책임: `submitResult`.

```js
// 의사 시그니처
async function submitResult({ userId, score }) {
  // → { ok: true } | { ok: false, status, message }
}
```

- `fetch`로 `${VITE_API_BASE_URL}/api/result`에 POST.
- 응답 200 → `{ ok: true }`.
- 그 외 → 응답 body의 `message` 또는 일반 메시지(`'네트워크 오류가 발생했습니다.'` 등)를 담아 `{ ok: false, ... }` 반환.
- 호출자가 에러 분기를 단순하게 처리할 수 있도록 **throw 대신 result 객체**를 반환한다. (env 누락만 startup-time throw.)
- 타임아웃은 `AbortController` 8초 정도. (부스 환경 정지 방지.)

### 7.2 변경: `src/routes/EndingPage/EndingNicknameForm.jsx`

- 입력 라벨/플레이스홀더를 닉네임 → userId 문구로 바꾼다.
- 길이 검증 제거: trim된 값이 1자 이상이면 제출 가능. (사용자 결정: 검증 없음.)
- `onSubmit(value)` 시그니처는 그대로 유지(상위에서 컨트롤). 인자 이름만 의미가 `userId`로 바뀐다.
- 제출 중 상태(`isSubmitting`)와 에러 메시지(`errorMessage`)를 prop으로 받아 버튼 disabled 및 폼 하단 에러 영역 표시.
- 파일/컴포넌트 이름은 유지 (외부 참조 변경 최소화. 향후 정리는 별도 이슈.)
- 표시 라벨에서 "닉네임" 단어만 정리하고 폼 헤딩 "기록을 남겨주세요"는 의미가 유지되므로 그대로 둔다.

### 7.3 변경: `src/routes/EndingPage/EndingPage.jsx`

- `handleNicknameSubmit` → `handleUserIdSubmit`으로 의미 변경(이름은 옵션, 내부 변수만 변경해도 무방).
- 함수 내부:
  1. `setIsSubmitting(true)`, `setErrorMessage(null)`.
  2. `submitResult({ userId, score: totalScore })` 호출.
  3. 성공 → 새 phase `success`로 전이, 결과 모달 표시.
  4. 실패 → `setErrorMessage(...)`, `setIsSubmitting(false)`.
- phase 머신 확장:
  - 기존: `entered → reveal → hold → leaving → register → outro → /ranking`
  - 변경: `... → register → success → outro → /ranking`
  - `success` phase에서는 모달이 떠 있고, Enter/Space 또는 닫기 버튼으로 `outro`로 전이한다. (기존 `outro` 흐름은 유지되어 그대로 `/ranking`으로 진입.)

### 7.4 신규: `src/routes/EndingPage/RegisterSuccessModal.jsx` (또는 인라인)

- 단순 1회용 모달이라 새 컴포넌트로 분리해도 좋고, `EndingPage` 안에 인라인으로 둬도 무방. 디폴트는 **`EndingPage/` 폴더 안에 별도 파일**로 두어 폴더 응집도를 유지한다.
- 본문: "기록이 등록되었습니다. 점수 {totalScore}점".
- 닫기 버튼 + Enter/Space로 닫기 가능.
- 기존 `InfoModal` 마크업 패턴과 일관되게 backdrop + dialog 구조.

## 8. 에러 처리

| 상황 | 사용자에게 보이는 메시지 | 액션 |
| --- | --- | --- |
| 네트워크 실패 / fetch reject | "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요." | 폼 유지, 재제출 가능 |
| HTTP 4xx, 본문 `message` 있음 | 본문 메시지 | 폼 유지 |
| HTTP 4xx, 본문 없음 | "등록에 실패했습니다. 유저 ID를 확인해주세요." | 폼 유지 |
| HTTP 5xx | "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." | 폼 유지 |
| `VITE_API_KEY` 누락 | (개발자 대상) console.error + 폼에는 "환경 설정 오류" | 빌드/배포 시점에 잡혀야 함 |

중복 제출은 `isSubmitting` 동안 버튼 disabled + Enter 무시로 막는다.

## 9. 영향 범위 / 변경 파일

- 수정: `.env`, `.env.example`
- 수정: `src/routes/EndingPage/EndingPage.jsx`
- 수정: `src/routes/EndingPage/EndingNicknameForm.jsx`
- 수정: `src/routes/EndingPage/EndingNicknameForm.css` (필요 시 에러 메시지 영역 스타일 한두 줄)
- 신규: `src/api/result.js`
- 신규: `src/routes/EndingPage/RegisterSuccessModal.jsx` (+ css)
- 신규: `src/api/result.test.js` (vitest, fetch mock — 성공/실패/타임아웃 케이스)
- 변경 없음: `src/ranking/ranking.config.js`, `src/store.js`, `src/routes/RankingPage/RankingPage.jsx`

## 10. 테스트

- `src/api/result.test.js`
  - 200 응답 → `{ ok: true }`.
  - 4xx, 본문 `message` → 그대로 반환.
  - 4xx, 본문 없음 → 기본 메시지.
  - 5xx → 서버 오류 메시지.
  - fetch reject → 네트워크 오류 메시지.
  - 타임아웃 → AbortError → 네트워크 오류 메시지.
- 폼/페이지 단위 통합 테스트는 본 스펙 범위에서 스킵 (현재 폼 단위 테스트가 없는 상태이므로 새 패턴 도입은 별도 이슈로 정리).

## 11. 미해결/후속

- `/ranking` 보드 데이터 백엔드 연동 (`GET /api/leader-board/quickness-game`) — 후속 이슈.
- userId 형식 검증 강화 — 백엔드가 형식을 강제하면 그때 클라이언트에도 반영.
- API 호출에서 `apiKey`가 번들에 노출되는 보안 검토 — 운영 정책 결정 필요.
