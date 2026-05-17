# /ranking 기록 표시 + 키 입력 게이트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/ranking` 페이지에서 백엔드 리더보드를 fetch해 표시하고, 자동 복귀 타이머를 제거해 Space/Enter 입력 전엔 화면이 이동하지 않게 한다.

**Architecture:** `src/api/result.js`와 동일한 패턴으로 신규 `src/api/leaderboard.js` 작성 → `RankingPage`가 마운트 시 호출하여 로딩/에러/빈/정상 4상태를 렌더링. 자동 복귀 타이머와 백엔드가 미지원하는 outcome/highlight 로직은 삭제.

**Tech Stack:** React 19, react-router-dom 7, vitest 2, @testing-library/react 16, Vite 8 (env: `VITE_API_BASE_URL`)

**Related Spec:** `docs/superpowers/specs/2026-05-17-ranking-history-and-key-gate-design.md`

---

## File Map

| 파일 | 종류 | 책임 |
|---|---|---|
| `src/api/leaderboard.js` | 신규 | quickness-game 리더보드 GET 클라이언트. `{ ok, rankings? \| message }` 반환. |
| `src/api/leaderboard.test.js` | 신규 | leaderboard 클라이언트 단위 테스트. |
| `src/ranking/ranking.config.js` | 수정 | `autoReturnMs` 제거. |
| `src/routes/RankingPage/RankingPage.jsx` | 수정 | API 연동, 자동 복귀 삭제, outcome/highlight 제거, hint 문구 수정. |
| `src/routes/RankingPage/RankingPage.css` | 수정 | 로딩/에러 상태 스타일 추가, 미사용 셀렉터(`__row--me`, `__myrow`) 제거. |
| `src/routes/RankingPage/__tests__/RankingPage.test.jsx` | 신규 | 통합 테스트(로딩/정상/빈/에러/키 입력/자동 복귀 없음). |
| `src/routes/EndingPage/EndingPage.jsx` | 수정 | `navigate('/ranking')` state 제거, `highlightId` 상태 제거. |

---

## Task 1: leaderboard API 클라이언트 (TDD)

**Files:**
- Create: `src/api/leaderboard.js`
- Test: `src/api/leaderboard.test.js`

`src/api/result.js`와 동일한 패턴: 8초 타임아웃, `{ ok, status?, message? }` 반환, env 누락 시 에러 메시지 반환, throw 하지 않음.

- [ ] **Step 1: 테스트 파일 작성**

Create `src/api/leaderboard.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchLeaderboard } from './leaderboard.js';

describe('fetchLeaderboard', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('200 응답 시 ok:true + rankings 배열 반환', async () => {
    const rankings = [
      { rank: 1, nickname: 'AAA', score: 500 },
      { rank: 2, nickname: 'BBB', score: 420 },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ gameName: 'quickness-game', unit: '점', rankings }),
        { status: 200 },
      ),
    ));

    const result = await fetchLeaderboard();

    expect(result).toEqual({ ok: true, rankings });
  });

  it('요청 URL과 메서드 검증', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ rankings: [] }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchLeaderboard();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/api/leader-board/quickness-game');
    expect(init?.method ?? 'GET').toBe('GET');
  });

  it('200 + rankings 누락 → ok:true + 빈 배열', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ gameName: 'quickness-game', unit: '점' }), { status: 200 }),
    ));

    const result = await fetchLeaderboard();

    expect(result).toEqual({ ok: true, rankings: [] });
  });

  it('4xx → ok:false + 4xx 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 404 }),
    ));

    const result = await fetchLeaderboard();

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.message).toBe('기록을 불러오지 못했습니다.');
  });

  it('5xx → 서버 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 503 }),
    ));

    const result = await fetchLeaderboard();

    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(result.message).toBe('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('fetch reject → 네트워크 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const result = await fetchLeaderboard();

    expect(result.ok).toBe(false);
    expect(result.message).toBe('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('AbortError(타임아웃) → 네트워크 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    }));

    const result = await fetchLeaderboard();

    expect(result.ok).toBe(false);
    expect(result.message).toBe('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('VITE_API_BASE_URL 누락 → ok:false + 환경 설정 오류', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await fetchLeaderboard();

    expect(result.ok).toBe(false);
    expect(result.message).toBe('환경 설정 오류가 발생했습니다.');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
npm run test:run -- src/api/leaderboard.test.js
```

Expected: 8 fail with `Cannot find module './leaderboard.js'` 또는 import error.

- [ ] **Step 3: leaderboard.js 구현**

Create `src/api/leaderboard.js`:

```javascript
// src/api/leaderboard.js
// quickness-game 리더보드 조회 API 클라이언트.
// - 8초 타임아웃 (AbortController)
// - throw 하지 않고 { ok, status?, message? } 반환
// - 환경 변수 누락은 콘솔에 에러 + 사용자 친화 메시지 반환

const API_GAME_NAME = 'quickness-game';
const REQUEST_TIMEOUT_MS = 8000;

const MESSAGES = {
  env: '환경 설정 오류가 발생했습니다.',
  network: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  client: '기록을 불러오지 못했습니다.',
};

export async function fetchLeaderboard() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!baseUrl) {
    console.error('[leaderboard api] missing env', { hasBaseUrl: Boolean(baseUrl) });
    return { ok: false, status: 0, message: MESSAGES.env };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${baseUrl}/api/leader-board/${API_GAME_NAME}`,
      { method: 'GET', signal: controller.signal },
    );

    if (response.ok) {
      let rankings = [];
      try {
        const data = await response.json();
        rankings = Array.isArray(data?.rankings) ? data.rankings : [];
      } catch {
        rankings = [];
      }
      return { ok: true, rankings };
    }

    const fallback = response.status >= 500 ? MESSAGES.server : MESSAGES.client;
    return { ok: false, status: response.status, message: fallback };
  } catch (err) {
    if (err?.name === 'AbortError') {
      console.warn('[leaderboard api] request timed out');
    }
    return { ok: false, status: 0, message: MESSAGES.network };
  } finally {
    clearTimeout(timeoutId);
  }
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

```bash
npm run test:run -- src/api/leaderboard.test.js
```

Expected: 8 pass.

- [ ] **Step 5: lint**

```bash
npm run lint -- src/api/leaderboard.js src/api/leaderboard.test.js
```

Expected: 에러 없음.

- [ ] **Step 6: Commit**

```bash
git add src/api/leaderboard.js src/api/leaderboard.test.js
git commit -m "feat: 리더보드 조회 API 클라이언트 추가 #51"
```

---

## Task 2: ranking.config.js에서 autoReturnMs 제거

**Files:**
- Modify: `src/ranking/ranking.config.js`

- [ ] **Step 1: autoReturnMs 키 삭제**

Edit `src/ranking/ranking.config.js`:

Before:
```javascript
  // 보드
  topN: 10,

  // /ranking 자동 복귀 (Space/Enter 또는 만료 시 resetGame + navigate('/'))
  autoReturnMs: 15000,

  // 결말 라벨 (보드 표시용)
```

After:
```javascript
  // 보드
  topN: 10,

  // 결말 라벨 (보드 표시용)
```

- [ ] **Step 2: 다른 곳에서 참조하지 않는지 확인**

```bash
grep -rn "autoReturnMs" src/
```

Expected: 출력 없음. 만약 출력이 있으면 해당 참조 코드를 후속 Task에서 정리한다 (현재 RankingPage만 참조하는 것으로 확인됨).

- [ ] **Step 3: 전체 테스트 실행 (회귀 확인)**

```bash
npm run test:run
```

Expected: 모든 테스트 pass (RankingPage 변경 전이므로 import 에러 없음).

- [ ] **Step 4: Commit은 Task 3 이후에 함께 (rankingPage가 이 키를 참조 중이므로 분리 커밋 시 일시 깨짐 가능)**

Note: 본 Task의 변경은 Task 3 커밋에 포함시킨다. 단독 커밋하지 않는다.

---

## Task 3: RankingPage 통합 테스트 작성 (TDD - RED)

**Files:**
- Create: `src/routes/RankingPage/__tests__/RankingPage.test.jsx`

- [ ] **Step 1: 테스트 파일 작성**

Create `src/routes/RankingPage/__tests__/RankingPage.test.jsx`:

```jsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RankingPage from '../RankingPage.jsx';
import * as leaderboardApi from '../../../api/leaderboard.js';
import { useGameStore } from '../../../store.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/ranking']}>
      <RankingPage />
    </MemoryRouter>,
  );
}

describe('RankingPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    useGameStore.getState().resetGame();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useGameStore.getState().resetGame();
  });

  it('마운트 직후 로딩 상태를 표시한다', () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/불러오는 중/)).toBeInTheDocument();
  });

  it('정상 응답 시 표에 기록을 렌더한다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: true,
      rankings: [
        { rank: 1, nickname: 'AAA', score: 500 },
        { rank: 2, nickname: 'BBB', score: 420 },
      ],
    });
    renderPage();
    expect(await screen.findByText('AAA')).toBeInTheDocument();
    expect(screen.getByText('BBB')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('빈 응답 시 "아직 기록이 없습니다." 표시', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({ ok: true, rankings: [] });
    renderPage();
    expect(await screen.findByText(/아직 기록이 없습니다/)).toBeInTheDocument();
  });

  it('에러 응답 시 에러 메시지를 표시', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: false,
      status: 503,
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
    renderPage();
    expect(await screen.findByText(/서버 오류가 발생했습니다/)).toBeInTheDocument();
  });

  it('Space 키 입력 시 / 로 이동한다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({ ok: true, rankings: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/아직 기록이 없습니다/)).toBeInTheDocument());
    await userEvent.keyboard('[Space]');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('Enter 키 입력 시 / 로 이동한다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({ ok: true, rankings: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/아직 기록이 없습니다/)).toBeInTheDocument());
    await userEvent.keyboard('[Enter]');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('키 입력 없이 시간이 흘러도 자동으로 이동하지 않는다', async () => {
    vi.useFakeTimers();
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({ ok: true, rankings: [] });
    renderPage();
    await vi.advanceTimersByTimeAsync(60000); // 1분 경과
    expect(mockNavigate).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('"처음으로" 버튼 클릭 시 / 로 이동한다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({ ok: true, rankings: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/아직 기록이 없습니다/)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /처음으로/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인 (RED)**

```bash
npm run test:run -- src/routes/RankingPage/__tests__/RankingPage.test.jsx
```

Expected: 일부 fail. 특히 "로딩 상태 표시"(현재 코드는 즉시 빈 배열을 렌더), "자동 이동하지 않는다"(autoReturnMs 타이머가 동작), "에러 메시지"(에러 분기 없음) 등이 실패한다. 정상 동작인 키 입력/버튼 클릭 테스트는 pass할 수 있다.

`fetchLeaderboard` mock이 `leaderboard.js` import 시점에 적용되도록 `vi.spyOn` 사용. Task 1에서 모듈을 이미 만들었으므로 import 에러는 없다.

---

## Task 4: RankingPage 구현 (TDD - GREEN)

**Files:**
- Modify: `src/routes/RankingPage/RankingPage.jsx` (전체 재작성)
- Modify: `src/routes/RankingPage/RankingPage.css` (미사용 셀렉터 제거, 로딩/에러 스타일 추가)

- [ ] **Step 1: RankingPage.jsx 재작성**

Replace `src/routes/RankingPage/RankingPage.jsx` with:

```jsx
// /ranking — 영속 랭킹 보드.
// - 마운트 시 GET /api/leader-board/quickness-game 호출.
// - 사용자 입력 없이는 자동 복귀하지 않는다.
// - Space/Enter 또는 "처음으로" 버튼 → resetGame + navigate('/').

import { useEffect, useState } from 'react';
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

  // 리더보드 fetch
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

  // Space/Enter → 즉시 복귀 (자동 복귀 타이머는 없다)
  useEffect(() => {
    const handle = (e) => {
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        goTitle();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = entries === null;
  const hasError = Boolean(errorMessage);
  const isEmpty = !isLoading && !hasError && entries.length === 0;
  const hasRows = !isLoading && !hasError && entries.length > 0;

  return (
    <div className="ranking-page">
      <h1 className="ranking-page__title">🏆 RANKING BOARD</h1>

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
        <table className="ranking-page__table">
          <thead>
            <tr>
              <th>순위</th>
              <th>닉네임</th>
              <th>점수</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={`${e.rank}-${e.nickname}`} className="ranking-page__row">
                <td>{e.rank}</td>
                <td>{e.nickname}</td>
                <td>{e.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

- [ ] **Step 2: RankingPage.css 정리**

Replace `src/routes/RankingPage/RankingPage.css` with:

```css
.ranking-page {
  width: 100%;
  height: 100%;
  padding: 32px 24px;
  background: #0a0a0a;
  color: #f4f4f4;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  overflow-y: auto;
}

.ranking-page__title {
  margin: 0;
  font-size: 36px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.ranking-page__status {
  margin: 24px 0;
  font-size: 18px;
  opacity: 0.7;
}

.ranking-page__status--error {
  color: #f4a4a4;
  opacity: 1;
}

.ranking-page__empty {
  margin: 24px 0;
  font-size: 18px;
  opacity: 0.6;
}

.ranking-page__table {
  border-collapse: collapse;
  width: min(720px, 90vw);
  font-size: 20px;
}

.ranking-page__table th,
.ranking-page__table td {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(244, 244, 244, 0.12);
}

.ranking-page__table th {
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.6;
  font-weight: 600;
}

.ranking-page__hint {
  margin-top: 8px;
  font-size: 14px;
  opacity: 0.5;
}

.ranking-page__back {
  margin-top: 8px;
  padding: 10px 24px;
  background: transparent;
  color: #f4f4f4;
  border: 1px solid rgba(244, 244, 244, 0.4);
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
}

.ranking-page__back:hover {
  border-color: rgba(244, 244, 244, 0.8);
}
```

- [ ] **Step 3: ranking.config.js의 autoReturnMs 제거 (Task 2의 변경 적용)**

Edit `src/ranking/ranking.config.js` — `autoReturnMs` 라인 및 그 위의 주석 줄을 삭제. 결과:

```javascript
// src/ranking/ranking.config.js
// 닉네임/랭킹 보드 튜닝 단일 소스. 모든 가변 값은 여기서 조정한다.

export const RANKING_CONFIG = {
  // 닉네임 검증 (정규식 없음 — 길이만 체크)
  nicknameMinLength: 1,
  nicknameMaxLength: 8,

  // 보드
  topN: 10,

  // 결말 라벨 (보드 표시용)
  outcomeLabels: {
    alive:      '⭐ 생존',
    silhouette: '👻 사망',
  },

};
```

- [ ] **Step 4: RankingPage 통합 테스트 실행**

```bash
npm run test:run -- src/routes/RankingPage/__tests__/RankingPage.test.jsx
```

Expected: 8 pass.

- [ ] **Step 5: 전체 테스트 실행 (회귀 확인)**

```bash
npm run test:run
```

Expected: 모든 테스트 pass. `autoReturnMs` 미참조 확인:

```bash
grep -rn "autoReturnMs" src/
```

Expected: 출력 없음.

- [ ] **Step 6: lint**

```bash
npm run lint
```

Expected: 에러 없음.

- [ ] **Step 7: dev 서버에서 수동 확인**

```bash
npm run dev
```

브라우저에서 확인:
1. `/` → "🏆 랭킹 보기" 클릭 → `/ranking` 진입.
2. 로딩 메시지 표시 → 데이터 또는 에러 메시지 표시.
3. 1분 대기해도 자동 이동 없음.
4. Space 또는 Enter → 타이틀로 이동.
5. "처음으로" 버튼 클릭 → 타이틀로 이동.
6. (env 미설정 환경에서) `/ranking` 진입 시 "환경 설정 오류" 표시.

서버 종료 후 다음 단계로.

- [ ] **Step 8: Commit**

```bash
git add src/routes/RankingPage/RankingPage.jsx \
        src/routes/RankingPage/RankingPage.css \
        src/routes/RankingPage/__tests__/RankingPage.test.jsx \
        src/ranking/ranking.config.js
git commit -m "feat: /ranking 리더보드 API 연동 + 자동 복귀 제거 #51"
```

---

## Task 5: EndingPage에서 highlightId 정리

**Files:**
- Modify: `src/routes/EndingPage/EndingPage.jsx`

`highlightId`는 `navigate('/ranking', { state: { highlightId } })`로만 사용되며, RankingPage가 더 이상 state를 읽지 않으므로 제거 대상.

- [ ] **Step 1: highlightId 관련 코드 제거**

Edit `src/routes/EndingPage/EndingPage.jsx`.

Remove the line:
```javascript
  const [highlightId, setHighlightId] = useState(null);
```

Replace:
```javascript
  // outro → /ranking (outroMs 후)
  useEffect(() => {
    if (phase !== 'outro') return undefined;
    const id = setTimeout(
      () => navigate('/ranking', { state: { highlightId } }),
      ENDING_CONFIG.outroMs,
    );
    return () => clearTimeout(id);
  }, [phase, navigate, highlightId]);
```
with:
```javascript
  // outro → /ranking (outroMs 후)
  useEffect(() => {
    if (phase !== 'outro') return undefined;
    const id = setTimeout(
      () => navigate('/ranking'),
      ENDING_CONFIG.outroMs,
    );
    return () => clearTimeout(id);
  }, [phase, navigate]);
```

Replace:
```javascript
  // outro 키 입력 — 즉시 /ranking
  useEffect(() => {
    if (phase !== 'outro') return undefined;
    const handle = (e) => {
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        navigate('/ranking', { state: { highlightId } });
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [phase, navigate, highlightId]);
```
with:
```javascript
  // outro 키 입력 — 즉시 /ranking
  useEffect(() => {
    if (phase !== 'outro') return undefined;
    const handle = (e) => {
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        navigate('/ranking');
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [phase, navigate]);
```

Replace:
```javascript
    if (result.ok) {
      setSubmittedScore(totalScore);
      setHighlightId(userId);
      setIsSubmitting(false);
      setPhase('success');
      return;
    }
```
with:
```javascript
    if (result.ok) {
      setSubmittedScore(totalScore);
      setIsSubmitting(false);
      setPhase('success');
      return;
    }
```

- [ ] **Step 2: 미사용 import/변수 없는지 확인**

```bash
grep -n "highlightId\|setHighlightId" src/routes/EndingPage/EndingPage.jsx
```

Expected: 출력 없음.

- [ ] **Step 3: 전체 테스트 실행**

```bash
npm run test:run
```

Expected: 모든 테스트 pass.

- [ ] **Step 4: lint**

```bash
npm run lint -- src/routes/EndingPage/EndingPage.jsx
```

Expected: 에러 없음.

- [ ] **Step 5: dev 서버에서 엔딩 → 랭킹 흐름 수동 확인**

```bash
npm run dev
```

브라우저:
1. 게임을 끝까지 진행 (또는 디버그 진입 경로가 있다면 활용) → 엔딩 → userId 입력 → 등록 성공 → success 모달 → outro → `/ranking` 도착.
2. `/ranking`에서 데이터 또는 에러 표시. 자동 복귀 없음. Space/Enter로 타이틀 복귀.

서버 종료 후 다음 단계.

- [ ] **Step 6: Commit**

```bash
git add src/routes/EndingPage/EndingPage.jsx
git commit -m "refactor: 엔딩 → /ranking 진입 시 highlightId 전달 제거 #51"
```

---

## Self-Review Checklist (계획 작성자 자체 점검 결과)

**Spec coverage:**
- [x] §4 API → Task 1
- [x] §5.1 leaderboard.js → Task 1
- [x] §5.2 RankingPage 상태/효과/렌더 분기 → Task 3 (테스트) + Task 4 (구현)
- [x] §5.2 hint 문구 변경 → Task 4 Step 1
- [x] §5.3 autoReturnMs 제거 → Task 4 Step 3
- [x] §5.4 EndingPage 변경 → Task 5
- [x] §6 데이터 흐름 → Task 4 (RankingPage), Task 5 (EndingPage)
- [x] §7 에러 처리 → Task 1 + Task 4
- [x] §8 키 입력 정책 → Task 4 (자동 복귀 없음 테스트 포함)
- [x] §9.1 leaderboard.test.js → Task 1
- [x] §9.2 RankingPage 통합 테스트 → Task 3
- [x] §10 변경 파일 모두 Task에 포함

**Placeholder scan:** 통과 — 모든 step에 실제 코드/명령어 포함, "TBD"/"적절히 처리" 같은 문구 없음.

**Type consistency:** 통과 — `fetchLeaderboard` 시그니처가 Task 1 구현 / Task 3 mock / Task 4 호출에서 일관(`{ ok, rankings? | message }`). `entries` 상태의 의미(`null` vs `[]` vs `[...]`)가 컴포넌트와 테스트에서 동일하게 사용됨.
