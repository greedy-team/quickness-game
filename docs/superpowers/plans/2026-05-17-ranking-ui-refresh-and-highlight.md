# /ranking UI 톤 교체 + 내 행 하이라이트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/ranking`을 ResultModal 톤(검정·Courier mono·황금 점수·시안 헤드라인)으로 재작성하고, 엔딩에서 진입한 사용자의 행을 흰색 outline + 반투명 배경으로 강조한다.

**Architecture:** 신규 `src/api/users.js`가 `GET /api/users/{userId}`로 nickname 조회. EndingPage가 submit 성공 직후 lookup → `location.state.nickname/score`로 RankingPage에 전달. RankingPage는 `<ul>` mono 카드로 재구성하고 일치하는 행에 `--current` 클래스 부여.

**Tech Stack:** React 19, react-router-dom 7, vitest 2, @testing-library/react 16, Vite 8 (env: `VITE_API_BASE_URL`)

**Related Spec:** `docs/superpowers/specs/2026-05-17-ranking-ui-refresh-and-highlight-design.md`

---

## File Map

| 파일 | 종류 | 책임 |
|---|---|---|
| `src/api/users.js` | 신규 | `getUserById(userId)` — `GET /api/users/{userId}`, `{ ok, user? \| message }` 반환. |
| `src/api/users.test.js` | 신규 | users 클라이언트 단위 테스트. |
| `src/routes/RankingPage/RankingPage.jsx` | 수정 | `<table>` → `<ul>` mono 카드, `useLocation` state 읽어 매칭, `--current` 클래스 적용. |
| `src/routes/RankingPage/RankingPage.css` | 수정 | 테이블 셀렉터 제거, ranking-list/headline/glow/current 스타일. |
| `src/routes/RankingPage/__tests__/RankingPage.test.jsx` | 수정 | 점수 표기 "N점" 반영 + 강조 케이스 3개 추가. |
| `src/routes/EndingPage/EndingPage.jsx` | 수정 | submit 성공 시 `getUserById` 비동기 호출, `myHighlight` 상태, 두 navigate 호출에 state 부착. |

---

## Task 1: users API 클라이언트 (TDD)

**Files:**
- Create: `src/api/users.js`
- Test: `src/api/users.test.js`

`src/api/leaderboard.js` / `src/api/result.js`와 같은 패턴.

- [ ] **Step 1: 테스트 파일 작성**

Create `src/api/users.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getUserById } from './users.js';

describe('getUserById', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('200 응답 시 ok:true + user 객체 반환', async () => {
    const user = { userId: 'ABCD1234', nickname: '에이스', phone: '12345678' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(user), { status: 200 }),
    ));

    const result = await getUserById('ABCD1234');

    expect(result).toEqual({ ok: true, user });
  });

  it('요청 URL과 메서드 검증', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ userId: 'X', nickname: 'Y' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await getUserById('XYZ');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/api/users/XYZ');
    expect(init?.method ?? 'GET').toBe('GET');
  });

  it('200 + body 파싱 실패 → ok:true + user:null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('not-json', { status: 200 }),
    ));

    const result = await getUserById('AAA');

    expect(result).toEqual({ ok: true, user: null });
  });

  it('4xx → ok:false + 4xx 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 404 }),
    ));

    const result = await getUserById('NONE');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.message).toBe('유저 정보를 가져오지 못했습니다.');
  });

  it('5xx → 서버 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 503 }),
    ));

    const result = await getUserById('AAA');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(result.message).toBe('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('fetch reject → 네트워크 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const result = await getUserById('AAA');

    expect(result.ok).toBe(false);
    expect(result.message).toBe('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('AbortError(타임아웃) → 네트워크 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    }));

    const result = await getUserById('AAA');

    expect(result.ok).toBe(false);
    expect(result.message).toBe('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('VITE_API_BASE_URL 누락 → ok:false + 환경 설정 오류', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await getUserById('AAA');

    expect(result.ok).toBe(false);
    expect(result.message).toBe('환경 설정 오류가 발생했습니다.');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
npm run test:run -- src/api/users.test.js
```
Expected: 8 fail (모듈 미존재).

- [ ] **Step 3: users.js 구현**

Create `src/api/users.js`:

```javascript
// src/api/users.js
// 유저 조회 API 클라이언트 (userId 기반).
// - 8초 타임아웃 (AbortController)
// - throw 하지 않고 { ok, user? | status?, message? } 반환
// - 환경 변수 누락은 콘솔에 에러 + 사용자 친화 메시지 반환

const REQUEST_TIMEOUT_MS = 8000;

const MESSAGES = {
  env: '환경 설정 오류가 발생했습니다.',
  network: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  client: '유저 정보를 가져오지 못했습니다.',
};

export async function getUserById(userId) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!baseUrl) {
    console.error('[users api] missing env', { hasBaseUrl: Boolean(baseUrl) });
    return { ok: false, status: 0, message: MESSAGES.env };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${baseUrl}/api/users/${userId}`,
      { method: 'GET', signal: controller.signal },
    );

    if (response.ok) {
      let user = null;
      try {
        user = await response.json();
      } catch {
        user = null;
      }
      return { ok: true, user };
    }

    const fallback = response.status >= 500 ? MESSAGES.server : MESSAGES.client;
    return { ok: false, status: response.status, message: fallback };
  } catch (err) {
    if (err?.name === 'AbortError') {
      console.warn('[users api] request timed out');
    }
    return { ok: false, status: 0, message: MESSAGES.network };
  } finally {
    clearTimeout(timeoutId);
  }
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

```bash
npm run test:run -- src/api/users.test.js
```
Expected: 8 pass.

- [ ] **Step 5: lint**

```bash
npm run lint -- src/api/users.js src/api/users.test.js
```
Expected: 에러 없음 (프로젝트 사전 lint 이슈는 무관).

- [ ] **Step 6: Commit**

```bash
git add src/api/users.js src/api/users.test.js
git commit -m "feat: 유저 조회 API 클라이언트 추가 #51"
```

**Commit message rules:**
- `Co-Authored-By` 트레일러 **금지**.
- `--no-verify` 금지.

---

## Task 2: RankingPage 비주얼 톤 교체 (table → mono ul/li)

**Files:**
- Modify: `src/routes/RankingPage/RankingPage.jsx`
- Modify: `src/routes/RankingPage/RankingPage.css`
- Modify: `src/routes/RankingPage/__tests__/RankingPage.test.jsx` (점수 문자열 변경분만)

### 변경 요약
- `<table>` → `<ul class="ranking-list">` + `<li>` 카드.
- 헤드라인 텍스트 변경: `🏆 RANKING BOARD` → `RANKING` + cyan glow.
- 점수 표기: `420` → `420점`.
- 컨테이너/배경/폰트를 ResultModal 톤(검정 배경, Courier mono)으로 교체.
- "처음으로" 버튼은 유지 (텍스트/동작 그대로, 스타일만 자연스럽게).

이 Task는 **하이라이트 기능을 도입하지 않는다.** 그 작업은 Task 3.

- [ ] **Step 1: 기존 테스트의 점수 표기 단언 수정**

Edit `src/routes/RankingPage/__tests__/RankingPage.test.jsx`. 해당 케이스에서 `'500'`을 `'500점'`으로 바꾼다.

찾기:
```jsx
    expect(screen.getByText('500')).toBeInTheDocument();
```
바꾸기:
```jsx
    expect(screen.getByText('500점')).toBeInTheDocument();
```

이 변경 외에는 다른 단언 수정 없음 — 다른 단언들은 닉네임/메시지/버튼 이름 등 텍스트 기반이라 구조 변경에 영향받지 않는다.

- [ ] **Step 2: 테스트가 (현재 구현 기준) 실패하는지 확인**

```bash
npm run test:run -- src/routes/RankingPage/__tests__/RankingPage.test.jsx
```
Expected: `'정상 응답 시 표에 기록을 렌더한다'`만 fail (`500점`을 못 찾아). 나머지는 pass.

- [ ] **Step 3: RankingPage.jsx 재작성 (table → ul/li)**

Replace `src/routes/RankingPage/RankingPage.jsx` with:

```jsx
// /ranking — 영속 랭킹 보드.
// - 마운트 시 GET /api/leader-board/quickness-game 호출.
// - 사용자 입력 없이는 자동 복귀하지 않는다.
// - Space/Enter 또는 "처음으로" 버튼 → resetGame + navigate('/').

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
import { fetchLeaderboard } from '../../api/leaderboard.js';
import './RankingPage.css';

const ADVANCE_KEYS = new Set(['Space', 'Enter']);

export default function RankingPage() {
  const navigate = useNavigate();
  const resetGame = useGameStore((s) => s.resetGame);

  // null = 로딩 중, [] = 비어있음, [...] = 데이터 있음
  const [entries, setEntries] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const goTitle = () => {
    resetGame();
    navigate('/');
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchLeaderboard();
      if (cancelled) return;
      if (result.ok) {
        setEntries(result.rankings);
      } else {
        setEntries([]);
        setErrorMessage(result.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handle = (e) => {
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        goTitle();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
    // navigate(react-router)와 resetGame(zustand selector)은 안정적 참조라 deps 생략 안전.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = entries === null;
  const hasError = Boolean(errorMessage);
  const isEmpty = !isLoading && !hasError && entries.length === 0;
  const hasRows = !isLoading && !hasError && entries.length > 0;

  return (
    <div className="ranking-page">
      <h1 className="ranking-page__headline">RANKING</h1>

      {isLoading && (
        <p className="ranking-page__status">기록을 불러오는 중…</p>
      )}

      {hasError && (
        <p className="ranking-page__status ranking-page__status--error">{errorMessage}</p>
      )}

      {isEmpty && (
        <p className="ranking-page__empty">아직 기록이 없습니다.</p>
      )}

      {hasRows && (
        <ul className="ranking-list">
          {entries.map((e) => (
            <li key={e.rank} className="ranking-list__row">
              <span className="ranking-list__rank">#{e.rank}</span>
              <span className="ranking-list__nickname">{e.nickname}</span>
              <span className="ranking-list__score">{e.score}점</span>
            </li>
          ))}
        </ul>
      )}

      <p className="ranking-page__hint">
        Space / Enter 키로 처음 화면으로 돌아갑니다.
      </p>

      <button type="button" className="ranking-page__back" onClick={goTitle}>
        처음으로
      </button>
    </div>
  );
}
```

- [ ] **Step 4: RankingPage.css 재작성**

Replace `src/routes/RankingPage/RankingPage.css` with:

```css
.ranking-page {
  width: 100%;
  height: 100%;
  padding: 32px 24px;
  background: #000;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  overflow-y: auto;
  box-sizing: border-box;
}

.ranking-page__headline {
  margin: 0 0 18px 0;
  font-size: clamp(2rem, 3.5vw, 3rem);
  letter-spacing: 3px;
  color: #00ffcc;
  text-shadow: 0 0 20px #00ffcc;
}

.ranking-page__status {
  margin: 24px 0;
  font-size: 18px;
  opacity: 0.7;
  font-family: 'Courier New', Courier, monospace;
  letter-spacing: 1px;
}

.ranking-page__status--error {
  color: #f4a4a4;
  opacity: 1;
}

.ranking-page__empty {
  margin: 24px 0;
  font-size: 18px;
  opacity: 0.6;
  font-family: 'Courier New', Courier, monospace;
  letter-spacing: 1px;
}

.ranking-list {
  list-style: none;
  margin: 0 auto;
  padding: 0;
  width: min(540px, 92vw);
  font-family: 'Courier New', Courier, monospace;
  font-size: clamp(1.05rem, 1.6vw, 1.3rem);
}

.ranking-list__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  column-gap: 16px;
  align-items: center;
  padding: 7px 10px;
  border-radius: 4px;
  letter-spacing: 1px;
  color: #888;
}

.ranking-list__rank {
  text-align: left;
  font-weight: bold;
}

.ranking-list__nickname {
  text-align: left;
}

.ranking-list__score {
  text-align: right;
  color: #ffcc00;
  font-weight: bold;
}

.ranking-page__hint {
  margin-top: 22px;
  font-size: clamp(0.9rem, 1.4vw, 1.1rem);
  color: #888;
  letter-spacing: 1px;
  font-family: 'Courier New', Courier, monospace;
}

.ranking-page__back {
  margin-top: 8px;
  padding: 10px 24px;
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  font-family: 'Courier New', Courier, monospace;
  letter-spacing: 1px;
}

.ranking-page__back:hover {
  border-color: rgba(255, 255, 255, 0.8);
}
```

- [ ] **Step 5: RankingPage 테스트 실행 (전부 pass)**

```bash
npm run test:run -- src/routes/RankingPage/__tests__/RankingPage.test.jsx
```
Expected: 9/9 pass.

- [ ] **Step 6: 전체 테스트 회귀 확인**

```bash
npm run test:run
```
Expected: 베이스라인 (132 pass / 10 pre-existing fail) 동일.

- [ ] **Step 7: lint**

```bash
npm run lint
```
Expected: 신규 에러 없음.

- [ ] **Step 8: 브라우저 수동 확인**

```bash
npm run dev
```
브라우저에서 `/` → "🏆 랭킹 보기"가 제거된 상태이므로 주소창에 직접 `/ranking` 입력하여 진입. 다음을 확인:
- 검정 배경 + cyan RANKING 헤드라인 + 모노 리스트 표시.
- 점수는 황금색 + "N점" 형식.
- Space/Enter로 타이틀 복귀.

서버 종료 후 다음 단계.

- [ ] **Step 9: Commit**

```bash
git add src/routes/RankingPage/RankingPage.jsx \
        src/routes/RankingPage/RankingPage.css \
        src/routes/RankingPage/__tests__/RankingPage.test.jsx
git commit -m "feat: /ranking 비주얼 톤을 ResultModal 톤으로 교체 #51"
```

---

## Task 3: 내 행 강조 (location.state 매칭 + --current)

**Files:**
- Modify: `src/routes/RankingPage/RankingPage.jsx`
- Modify: `src/routes/RankingPage/RankingPage.css`
- Modify: `src/routes/RankingPage/__tests__/RankingPage.test.jsx`

### 변경 요약
- `useLocation()`으로 `state.nickname`, `state.score` 읽음.
- 둘 다 존재할 때만, `entries`에서 첫 매칭 행에 `ranking-list__row--current` 클래스 추가.
- 매칭 행 스타일은 ResultModal `.tier-row--current` 스타일과 동일 톤.

- [ ] **Step 1: 강조 테스트 케이스 3개 추가 (RED)**

Edit `src/routes/RankingPage/__tests__/RankingPage.test.jsx`. `MemoryRouter`로 state를 전달하기 위해 `renderPage`를 옵션 인자로 확장. 그리고 새 케이스 3개 추가.

먼저 기존 `renderPage` 함수를 다음으로 교체:

```jsx
function renderPage({ state } = {}) {
  const entry = state
    ? [{ pathname: '/ranking', state }]
    : ['/ranking'];
  return render(
    <MemoryRouter initialEntries={entry}>
      <RankingPage />
    </MemoryRouter>,
  );
}
```

(기존 호출들은 인자가 없어 호환된다.)

그리고 `describe('RankingPage', ...)` 블록 마지막에 다음 3개 케이스 추가:

```jsx
  it('state.nickname + state.score가 매칭되면 해당 행에 --current 클래스가 붙는다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: true,
      rankings: [
        { rank: 1, nickname: '에이스', score: 500 },
        { rank: 2, nickname: '베타', score: 450 },
        { rank: 3, nickname: '나', score: 420 },
      ],
    });
    renderPage({ state: { nickname: '나', score: 420 } });

    const myRow = (await screen.findByText('나')).closest('li');
    expect(myRow).not.toBeNull();
    expect(myRow).toHaveClass('ranking-list__row--current');

    // 다른 행은 --current 없음
    const otherRow = screen.getByText('에이스').closest('li');
    expect(otherRow).not.toHaveClass('ranking-list__row--current');
  });

  it('state가 없으면 어떤 행에도 --current 클래스가 없다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: true,
      rankings: [
        { rank: 1, nickname: '에이스', score: 500 },
      ],
    });
    renderPage();

    const row = (await screen.findByText('에이스')).closest('li');
    expect(row).not.toHaveClass('ranking-list__row--current');
  });

  it('nickname만 일치하고 score가 다르면 강조하지 않는다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: true,
      rankings: [
        { rank: 1, nickname: '나', score: 999 },
      ],
    });
    renderPage({ state: { nickname: '나', score: 420 } });

    const row = (await screen.findByText('나')).closest('li');
    expect(row).not.toHaveClass('ranking-list__row--current');
  });
```

- [ ] **Step 2: 테스트가 실패하는지 확인 (RED)**

```bash
npm run test:run -- src/routes/RankingPage/__tests__/RankingPage.test.jsx
```
Expected: 3개의 새 케이스 fail (`--current` 클래스 미존재).

- [ ] **Step 3: RankingPage.jsx 수정 — useLocation + 매칭**

Edit `src/routes/RankingPage/RankingPage.jsx`.

`react-router-dom` import에 `useLocation` 추가:

```jsx
import { useLocation, useNavigate } from 'react-router-dom';
```

`useNavigate` 라인 아래에 다음 추가:

```jsx
  const location = useLocation();
  const myNickname = location.state?.nickname ?? null;
  const myScore = location.state?.score ?? null;
  const matchKey = (myNickname != null && myScore != null)
    ? `${myNickname} ${myScore}`
    : null;
```

`{entries.map((e) => (...))}` 블록의 `<li>` 라인을 다음으로 교체:

```jsx
            {entries.map((e) => {
              const isMine = matchKey != null && `${e.nickname} ${e.score}` === matchKey;
              const rowClass = isMine
                ? 'ranking-list__row ranking-list__row--current'
                : 'ranking-list__row';
              return (
                <li key={e.rank} className={rowClass}>
                  <span className="ranking-list__rank">#{e.rank}</span>
                  <span className="ranking-list__nickname">{e.nickname}</span>
                  <span className="ranking-list__score">{e.score}점</span>
                </li>
              );
            })}
```

(첫 매칭만 강조하는 별도 처리 없음 — `nickname+score` 복합 매칭이라 중복 충돌은 매우 드물고, 발생해도 같은 시각 표시는 허용 범위.)

- [ ] **Step 4: RankingPage.css에 --current 스타일 추가**

Edit `src/routes/RankingPage/RankingPage.css`. `.ranking-list__score { ... }` 규칙 바로 아래에 다음 추가:

```css
.ranking-list__row--current {
  background: rgba(255, 255, 255, 0.08);
  outline: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  font-size: clamp(1.15rem, 1.8vw, 1.45rem);
  padding: 9px 10px;
}
```

- [ ] **Step 5: 테스트 실행 (GREEN)**

```bash
npm run test:run -- src/routes/RankingPage/__tests__/RankingPage.test.jsx
```
Expected: 12/12 pass (기존 9 + 신규 3).

- [ ] **Step 6: 전체 테스트 회귀 확인**

```bash
npm run test:run
```
Expected: 135 pass / 10 pre-existing fail.

- [ ] **Step 7: lint**

```bash
npm run lint
```
Expected: 신규 에러 없음.

- [ ] **Step 8: Commit**

```bash
git add src/routes/RankingPage/RankingPage.jsx \
        src/routes/RankingPage/RankingPage.css \
        src/routes/RankingPage/__tests__/RankingPage.test.jsx
git commit -m "feat: /ranking에서 내 행을 nickname+score 매칭으로 강조 #51"
```

---

## Task 4: EndingPage — nickname lookup + navigate state 부착

**Files:**
- Modify: `src/routes/EndingPage/EndingPage.jsx`

### 변경 요약
- `getUserById` import.
- 새 상태 `myHighlight: { nickname, score } | null`.
- submit 성공 분기에서 비동기 lookup → 성공 시 `setMyHighlight({ nickname, score: totalScore })`.
- 두 `navigate('/ranking')` 호출(timeout 분기, outro key 분기)을 `myHighlight ? { state: myHighlight } : undefined`로 분기.
- lookup이 실패하거나 늦으면 state 없이 진입 → 강조 없음 (RankingPage가 graceful).

- [ ] **Step 1: EndingPage.jsx 수정**

Edit `src/routes/EndingPage/EndingPage.jsx`.

import 블록에 `getUserById` 추가:

```jsx
import { submitResult } from '../../api/result.js';
import { getUserById } from '../../api/users.js';
```

`const [submittedScore, setSubmittedScore] = useState(null);` 줄 아래에 다음 상태 추가:

```jsx
  const [myHighlight, setMyHighlight] = useState(null);
```

`outro → /ranking (outroMs 후)` useEffect 전체를 다음으로 교체:

```jsx
  // outro → /ranking (outroMs 후)
  useEffect(() => {
    if (phase !== 'outro') return undefined;
    const id = setTimeout(
      () => navigate('/ranking', myHighlight ? { state: myHighlight } : undefined),
      ENDING_CONFIG.outroMs,
    );
    return () => clearTimeout(id);
  }, [phase, navigate, myHighlight]);
```

`outro 키 입력 — 즉시 /ranking` useEffect 전체를 다음으로 교체:

```jsx
  // outro 키 입력 — 즉시 /ranking
  useEffect(() => {
    if (phase !== 'outro') return undefined;
    const handle = (e) => {
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        navigate('/ranking', myHighlight ? { state: myHighlight } : undefined);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [phase, navigate, myHighlight]);
```

`handleUserIdSubmit` 함수 내의 성공 분기를 다음으로 교체:

```jsx
    if (result.ok) {
      setSubmittedScore(totalScore);
      setIsSubmitting(false);
      setPhase('success');
      // 강조용 nickname 조회는 비동기 — outro 진행을 막지 않음.
      // lookup이 늦거나 실패하면 강조 없이 진입 (graceful).
      void getUserById(userId).then((r) => {
        if (r.ok && r.user?.nickname) {
          setMyHighlight({ nickname: r.user.nickname, score: totalScore });
        }
      });
      return;
    }
```

- [ ] **Step 2: 전체 테스트 실행**

```bash
npm run test:run
```
Expected: 135 pass / 10 pre-existing fail (회귀 없음 — EndingPage 단위 테스트 없음).

- [ ] **Step 3: lint**

```bash
npm run lint -- src/routes/EndingPage/EndingPage.jsx
```
Expected: 신규 에러 없음.

- [ ] **Step 4: dev 서버에서 엔딩 → 랭킹 흐름 수동 검증**

```bash
npm run dev
```
브라우저에서 게임을 끝까지 진행 (또는 임의 진입 경로):
1. 엔딩 도달 → userId 입력 → 등록 → success 모달 → outro → `/ranking`.
2. `/ranking`에 내 닉네임이 top5 안에 있으면 그 행이 흰색 outline + 반투명 배경으로 강조됨.
3. top5 밖이면 강조 없음 (정상).
4. 타이틀에서 `/ranking` 주소 직진 → 강조 없음.
5. `getUserById`가 어떤 이유로 실패해도(예: 네트워크 끊고 테스트) 강조 없이 `/ranking` 정상 진입.

서버 종료 후 다음 단계.

- [ ] **Step 5: Commit**

```bash
git add src/routes/EndingPage/EndingPage.jsx
git commit -m "feat: 엔딩 등록 직후 nickname 조회 후 /ranking에 강조 정보 전달 #51"
```

---

## Self-Review (계획 작성자 자체 점검)

**Spec coverage:**
- [x] §2.1 비주얼 톤 교체 → Task 2
- [x] §2.2 내 행 강조 → Task 3 + Task 4
- [x] §2.3 직진 진입 시 강조 없음 → Task 3 (state 없으면 매칭 미시도)
- [x] §4 식별 전략 (nickname+score) → Task 3 매칭 로직 + Task 4 state 부착
- [x] §5/§6.1 users API → Task 1
- [x] §6.2 EndingPage 비동기 lookup + navigate state → Task 4
- [x] §6.3/§6.4 RankingPage jsx/css → Task 2 (구조), Task 3 (강조)
- [x] §7 데이터 흐름 → Tasks 3+4 합쳐 동일
- [x] §8 에러 처리 (lookup 실패 → graceful) → Task 4 Step 1
- [x] §9.1 users.test.js → Task 1
- [x] §9.2 RankingPage 강조 테스트 → Task 3
- [x] §10 변경 파일 6개 전부 Task에 매핑

**Placeholder scan:** 통과. 모든 step에 실제 코드/명령어. "TBD"/"적절히" 없음.

**Type consistency:**
- `getUserById` 시그니처: Task 1 구현 = `(userId) → { ok, user? | message }`. Task 4 호출 = `r.ok && r.user?.nickname` — 일관.
- `myHighlight` 모양: Task 4 = `{ nickname, score }`. Task 3 매칭 = `state.nickname`, `state.score` — 일관.
- `matchKey` 로 결합 (Task 3) — `nickname + 0x00 + score` 둘 다 사용. 행 비교에서도 같은 형식. 일관.
- CSS 클래스명: `ranking-list__row--current` — Task 2(없음), Task 3(추가), 테스트(찾음) 모두 동일.
