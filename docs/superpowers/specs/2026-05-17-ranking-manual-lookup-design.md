# /ranking 우측 상단 ID 조회 입력 — 설계 문서

- **작성일**: 2026-05-17
- **관련 이슈**: #51 (후속)
- **선행 작업**: `2026-05-17-ranking-ui-refresh-and-highlight-design.md`

---

## 1. 배경 / 목표

엔딩 흐름이 아닌 사용자(타이틀에서 직진, 다른 디바이스, 재방문)도 본인의 행을 강조해 볼 수 있게 한다. `/ranking` 우측 상단에 작은 input을 두어 userId를 입력하면 닉네임을 조회해 매칭 행을 강조한다.

## 2. UI

- 위치: `.ranking-page` 내부, `position: absolute; top: 16px; right: 16px`.
- 형식: `<form>` + `<input>` (Enter 제출, 별도 버튼 없음).
- placeholder: `유저 ID로 내 행 찾기`.
- 너비: 약 180px, 모노 톤(검정 배경 + Courier + 시안 outline).
- 상태 메시지: input 아래(또는 input 그룹 내부)에 작은 텍스트로 표시.
  - 로딩: `조회 중…`
  - 4xx/없음: `ID를 찾을 수 없습니다`
  - 5xx/네트워크: `조회 오류, 잠시 후 다시 시도`
  - 매칭 닉네임 탑5 밖: `탑5에 기록이 없습니다`
  - 매칭 성공 시 메시지 비움.

## 3. 동작

1. 사용자가 input에 userId 입력 → Enter.
2. trim 후 빈 문자열이면 무시.
3. `getUserById(userId)` 호출 (기존 클라이언트 재사용).
4. 결과에 따라 분기:
   - `ok` + `user.nickname` 있음 → `setManualHighlight({ nickname })`, 메시지는 매칭 결과에 따라.
   - `ok` + `user.nickname` 없음 → "ID를 찾을 수 없습니다".
   - 4xx → "ID를 찾을 수 없습니다".
   - 5xx/네트워크 → "조회 오류, 잠시 후 다시 시도".
5. input을 비우고 Enter 또는 input을 빈 채로 두면 manualHighlight 해제 (자동 강조로 폴백).
6. 로딩 중 다시 제출 → cancelled flag로 직전 응답 무시.

## 4. 매칭 규칙

매칭은 다음 우선순위로 단일 행 결정.

| 조건 | 매칭 |
|---|---|
| `manualHighlight != null` | `e.nickname === manualHighlight.nickname` (score 무관 — manual은 score 모름) |
| `location.state.nickname/score` 있음 (기존) | `e.nickname === state.nickname && e.score === state.score` |
| 둘 다 없음 | 강조 없음 |

manual이 state보다 우선 — 사용자가 명시적으로 검색한 의도를 우선.

## 5. 컴포넌트 / 파일

| 파일 | 변경 |
|---|---|
| `src/routes/RankingPage/RankingPage.jsx` | input/form, `manualHighlight` 상태, `lookupStatus` 상태, 제출 핸들러, 매칭 분기 통합 |
| `src/routes/RankingPage/RankingPage.css` | `.ranking-page` `position: relative`, `.ranking-page__lookup` (absolute top-right), input 스타일, 상태 메시지 스타일 |
| `src/routes/RankingPage/__tests__/RankingPage.test.jsx` | 4 케이스 추가 |

Input 부분 분리 컴포넌트는 만들지 않음 — 상태/매칭이 페이지에 결합돼 prop drilling만 늘어남.

## 6. 상태 모델

```
manualHighlight: { nickname: string } | null
lookupStatus:    'idle' | 'loading' | 'not_found' | 'error' | 'no_top_match' | 'matched'
lookupMessage:   string | null  (status에서 파생, 렌더에서만 매핑)
```

`lookupStatus`를 별도로 두는 이유: matched 시점에 매칭 행이 탑5에 있는지 확인해 `'matched'` vs `'no_top_match'`로 갈라야 함. 이 판정은 manualHighlight + entries가 모두 있을 때 derive로 가능 — 별도 effect 불필요.

→ 실제 단순화: `lookupStatus`는 manual API 응답 직후 세팅, `'matched'` vs `'no_top_match'`는 렌더 시점에 `entries.some(...)`로 derive. state는 `lookupStatus: 'idle' | 'loading' | 'not_found' | 'error' | 'done'` 5개로 충분.

## 7. 에러 / 엣지

- 입력 중 trim, 길이 검증은 클라이언트에서 하지 않음 (백엔드가 거절하면 not_found 메시지로 표시).
- 동시 제출: cancelled flag로 가장 최근 요청만 반영.
- 매칭되는 행 없음: 강조 없이 메시지만 표시. 이전 manualHighlight도 새 값으로 교체됨 (탑5 밖이라도 manualHighlight는 set, 단지 렌더 시 매칭 행이 없을 뿐).

## 8. 테스트

`src/routes/RankingPage/__tests__/RankingPage.test.jsx`에 4 케이스 추가:

1. **input + Enter → 매칭 행 강조**: `getUserById` mock이 `{ ok: true, user: { nickname: '나' } }` 반환. 엔트리에 '나' 포함. Enter 후 해당 li에 `--current` 클래스.
2. **404 → 메시지 표시**: mock `{ ok: false, status: 404, message: ... }`. 메시지 "ID를 찾을 수 없습니다" 노출, 어떤 행에도 `--current` 없음.
3. **닉네임 탑5 밖 → "탑5에 기록이 없습니다"**: mock ok + nickname='없는사람'. 엔트리에 없음. 메시지 노출.
4. **input 비우고 Enter → 강조 해제**: 먼저 강조 시킨 뒤 input 비우고 Enter. `--current` 사라짐.

기존 12 테스트는 변경 없음.

## 9. 비목표

- API에 score 조회 추가 (불필요 — nickname 단독 매칭으로 충분).
- 자동완성 / 검색 기록.
- 모바일 터치 전용 UI.
- 다중 매칭 (탑5 안에 동일 닉네임 2명 — 흔하지 않고 spec §4 우선순위로 첫 매칭만).
