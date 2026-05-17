# /ranking 우측 상단 ID 조회 입력 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/ranking` 우측 상단에 userId 입력 폼을 두어, Enter 제출 시 nickname을 조회해 매칭 행을 강조한다.

**Architecture:** 기존 `getUserById` 클라이언트와 `--current` 강조 스타일을 재사용. RankingPage에 `manualHighlight`(nickname) 상태와 `lookupStatus` 상태를 추가하고, 매칭 우선순위는 manual > location.state > 없음. 윈도우 keydown 리스너는 INPUT 포커스 시 스킵해 입력 충돌 방지.

**Tech Stack:** React 19, react-router-dom 7, vitest 2, @testing-library/react 16

**Related Spec:** `docs/superpowers/specs/2026-05-17-ranking-manual-lookup-design.md`

---

## File Map

| 파일 | 변경 |
|---|---|
| `src/routes/RankingPage/RankingPage.jsx` | input form, manualHighlight/lookupStatus state, 제출 핸들러, 매칭/메시지 분기 통합, 키보드 핸들러에 INPUT 스킵 가드 |
| `src/routes/RankingPage/RankingPage.css` | `.ranking-page` `position: relative`, `.ranking-page__lookup` (absolute top-right), `__lookup-input`, `__lookup-status` 스타일 |
| `src/routes/RankingPage/__tests__/RankingPage.test.jsx` | 4 케이스 추가 (input 강조, 404, 탑5 밖, 비우기) |

---

## Task 1: ID 조회 입력 통합 (TDD)

### Step 1 — 신규 테스트 4개 추가

Edit `src/routes/RankingPage/__tests__/RankingPage.test.jsx`.

(a) 파일 상단의 import 그룹에 추가:
```jsx
import * as usersApi from '../../../api/users.js';
```

(b) `describe('RankingPage', ...)` 블록의 가장 마지막 `it(...)` 다음, 닫는 `});` 직전에 다음 4개 케이스 추가:

```jsx
  it('input에 userId 입력 + Enter → 매칭 행에 --current 클래스가 붙는다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: true,
      rankings: [
        { rank: 1, nickname: '에이스', score: 500 },
        { rank: 2, nickname: '찾는사람', score: 420 },
      ],
    });
    vi.spyOn(usersApi, 'getUserById').mockResolvedValue({
      ok: true,
      user: { userId: 'ABCD1234', nickname: '찾는사람', phone: '00000000' },
    });

    renderPage();
    await screen.findByText('에이스');

    const input = screen.getByPlaceholderText(/유저 ID로 내 행 찾기/);
    await userEvent.type(input, 'ABCD1234');
    await userEvent.keyboard('[Enter]');

    await waitFor(() => {
      const row = screen.getByText('찾는사람').closest('li');
      expect(row).toHaveClass('ranking-list__row--current');
    });

    // 다른 행은 강조 없음
    const otherRow = screen.getByText('에이스').closest('li');
    expect(otherRow).not.toHaveClass('ranking-list__row--current');

    // 매칭 성공 시 상태 메시지는 비어있음
    expect(screen.queryByText(/찾을 수 없습니다/)).toBeNull();
    expect(screen.queryByText(/탑5에 기록이 없습니다/)).toBeNull();
  });

  it('404 응답 시 "ID를 찾을 수 없습니다" 메시지 표시, 강조 없음', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: true,
      rankings: [{ rank: 1, nickname: '에이스', score: 500 }],
    });
    vi.spyOn(usersApi, 'getUserById').mockResolvedValue({
      ok: false,
      status: 404,
      message: '유저 정보를 가져오지 못했습니다.',
    });

    renderPage();
    await screen.findByText('에이스');

    const input = screen.getByPlaceholderText(/유저 ID로 내 행 찾기/);
    await userEvent.type(input, 'NONE');
    await userEvent.keyboard('[Enter]');

    expect(await screen.findByText('ID를 찾을 수 없습니다')).toBeInTheDocument();
    const row = screen.getByText('에이스').closest('li');
    expect(row).not.toHaveClass('ranking-list__row--current');
  });

  it('닉네임이 탑5 밖이면 "탑5에 기록이 없습니다" 메시지 표시', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: true,
      rankings: [{ rank: 1, nickname: '에이스', score: 500 }],
    });
    vi.spyOn(usersApi, 'getUserById').mockResolvedValue({
      ok: true,
      user: { userId: 'XYZ', nickname: '없는사람', phone: '11111111' },
    });

    renderPage();
    await screen.findByText('에이스');

    const input = screen.getByPlaceholderText(/유저 ID로 내 행 찾기/);
    await userEvent.type(input, 'XYZ');
    await userEvent.keyboard('[Enter]');

    expect(await screen.findByText('탑5에 기록이 없습니다')).toBeInTheDocument();
    const row = screen.getByText('에이스').closest('li');
    expect(row).not.toHaveClass('ranking-list__row--current');
  });

  it('input을 비우고 Enter 시 강조가 해제된다', async () => {
    vi.spyOn(leaderboardApi, 'fetchLeaderboard').mockResolvedValue({
      ok: true,
      rankings: [{ rank: 1, nickname: '찾는사람', score: 420 }],
    });
    vi.spyOn(usersApi, 'getUserById').mockResolvedValue({
      ok: true,
      user: { userId: 'ABCD', nickname: '찾는사람', phone: '00000000' },
    });

    renderPage();
    await screen.findByText('찾는사람');

    const input = screen.getByPlaceholderText(/유저 ID로 내 행 찾기/);
    await userEvent.type(input, 'ABCD');
    await userEvent.keyboard('[Enter]');

    await waitFor(() => {
      const row = screen.getByText('찾는사람').closest('li');
      expect(row).toHaveClass('ranking-list__row--current');
    });

    await userEvent.clear(input);
    await userEvent.keyboard('[Enter]');

    await waitFor(() => {
      const row = screen.getByText('찾는사람').closest('li');
      expect(row).not.toHaveClass('ranking-list__row--current');
    });
  });
```

### Step 2 — 테스트 실행, 신규 4개가 실패하는지 확인

```bash
npm run test:run -- src/routes/RankingPage/__tests__/RankingPage.test.jsx
```

Expected: 신규 4개 fail (input/메시지 미존재), 기존 12개 pass.

### Step 3 — `src/routes/RankingPage/RankingPage.jsx` 전체 재작성

Replace the entire file with:

```jsx
// /ranking — 영속 랭킹 보드.
// - 마운트 시 GET /api/leader-board/quickness-game 호출.
// - 사용자 입력 없이는 자동 복귀하지 않는다.
// - Space/Enter 또는 "처음으로" 버튼 → resetGame + navigate('/').
//   단, 우측 상단 ID 조회 input에 포커스가 있을 땐 키 입력을 가로채지 않는다.
// - 우측 상단 input에 userId 입력 + Enter → getUserById로 nickname 조회 후 매칭 행 강조.

import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
import { fetchLeaderboard } from '../../api/leaderboard.js';
import { getUserById } from '../../api/users.js';
import './RankingPage.css';

const ADVANCE_KEYS = new Set(['Space', 'Enter']);
const TEXT_INPUT_TAGS = new Set(['INPUT', 'TEXTAREA']);

export default function RankingPage() {
  const navigate = useNavigate();
  const resetGame = useGameStore((s) => s.resetGame);
  const location = useLocation();
  const myNickname = location.state?.nickname ?? null;
  const myScore = location.state?.score ?? null;

  // null = 로딩 중, [] = 비어있음, [...] = 데이터 있음
  const [entries, setEntries] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // 우측 상단 수동 조회 상태
  const [userIdInput, setUserIdInput] = useState('');
  const [manualHighlight, setManualHighlight] = useState(null); // string | null (nickname)
  const [lookupStatus, setLookupStatus] = useState('idle'); // 'idle' | 'loading' | 'not_found' | 'error' | 'done'
  const lookupCounterRef = useRef(0);

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
      // input/textarea 포커스 중엔 페이지 단축키 비활성 (입력 충돌 방지)
      if (e.target && TEXT_INPUT_TAGS.has(e.target.tagName)) return;
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

  const handleLookupSubmit = async (e) => {
    e.preventDefault();
    const trimmed = userIdInput.trim();
    if (trimmed === '') {
      // 빈 입력 → 강조 해제
      setManualHighlight(null);
      setLookupStatus('idle');
      return;
    }

    const myCounter = lookupCounterRef.current + 1;
    lookupCounterRef.current = myCounter;
    setLookupStatus('loading');

    const r = await getUserById(trimmed);

    // 더 최근 요청이 있으면 이 응답은 버린다
    if (myCounter !== lookupCounterRef.current) return;

    if (r.ok && r.user?.nickname) {
      setManualHighlight(r.user.nickname);
      setLookupStatus('done');
    } else if (!r.ok && (r.status === 0 || r.status >= 500)) {
      setManualHighlight(null);
      setLookupStatus('error');
    } else {
      // ok이지만 nickname 없음, 또는 4xx
      setManualHighlight(null);
      setLookupStatus('not_found');
    }
  };

  const isLoading = entries === null;
  const hasError = Boolean(errorMessage);
  const isEmpty = !isLoading && !hasError && entries.length === 0;
  const hasRows = !isLoading && !hasError && entries.length > 0;

  // 매칭 결정: manual 우선, 그 다음 location.state, 둘 다 없으면 매칭 없음.
  const isMine = (entry) => {
    if (manualHighlight != null) return entry.nickname === manualHighlight;
    if (myNickname != null && myScore != null) {
      return entry.nickname === myNickname && entry.score === myScore;
    }
    return false;
  };

  // 조회 상태 메시지 (loading/not_found/error/탑5 밖)
  let lookupMessage = '';
  if (lookupStatus === 'loading') {
    lookupMessage = '조회 중…';
  } else if (lookupStatus === 'not_found') {
    lookupMessage = 'ID를 찾을 수 없습니다';
  } else if (lookupStatus === 'error') {
    lookupMessage = '조회 오류, 잠시 후 다시 시도';
  } else if (
    lookupStatus === 'done'
    && manualHighlight != null
    && hasRows
    && !entries.some((e) => e.nickname === manualHighlight)
  ) {
    lookupMessage = '탑5에 기록이 없습니다';
  }

  return (
    <div className="ranking-page">
      <h1 className="ranking-page__headline">RANKING</h1>

      <form className="ranking-page__lookup" onSubmit={handleLookupSubmit}>
        <input
          type="text"
          className="ranking-page__lookup-input"
          placeholder="유저 ID로 내 행 찾기"
          value={userIdInput}
          onChange={(ev) => setUserIdInput(ev.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {lookupMessage && (
          <p className="ranking-page__lookup-status">{lookupMessage}</p>
        )}
      </form>

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
          {entries.map((e) => {
            const mine = isMine(e);
            const rowClass = mine
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

### Step 4 — `src/routes/RankingPage/RankingPage.css` 수정

(a) `.ranking-page { ... }` 블록에 `position: relative;` 추가. 다음 라인을 찾아:

```css
.ranking-page {
  width: 100%;
  height: 100%;
  padding: 32px 24px;
```

이렇게 바꾸기:

```css
.ranking-page {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 32px 24px;
```

(b) 파일 맨 끝에 다음 블록 추가:

```css
.ranking-page__lookup {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  z-index: 2;
}

.ranking-page__lookup-input {
  width: 180px;
  padding: 6px 10px;
  background: #000;
  color: #fff;
  border: 1px solid rgba(0, 255, 204, 0.6);
  border-radius: 4px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  letter-spacing: 1px;
  outline: none;
}

.ranking-page__lookup-input:focus {
  border-color: #00ffcc;
  box-shadow: 0 0 8px rgba(0, 255, 204, 0.4);
}

.ranking-page__lookup-status {
  margin: 0;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  letter-spacing: 1px;
  color: #888;
}
```

### Step 5 — 테스트 실행 (GREEN)

```bash
npm run test:run -- src/routes/RankingPage/__tests__/RankingPage.test.jsx
```

Expected: 16/16 pass (기존 12 + 신규 4).

### Step 6 — 전체 테스트 회귀 확인

```bash
npm run test:run
```

Expected: 147 pass / 10 pre-existing fail (베이스라인 143 + 4 신규).

### Step 7 — Lint

```bash
npm run lint -- src/routes/RankingPage/RankingPage.jsx
```

Expected: 신규 에러 없음.

### Step 8 — Commit

```bash
git add src/routes/RankingPage/RankingPage.jsx \
        src/routes/RankingPage/RankingPage.css \
        src/routes/RankingPage/__tests__/RankingPage.test.jsx
git commit -m "feat: /ranking 우측 상단에 ID 조회 입력 추가 — 본인 행 강조 #51"
```

**Commit rules:**
- NO `Co-Authored-By` trailer.
- NO `--no-verify`.

---

## Self-Review

**Spec coverage:**
- [x] §2 UI (우측 상단 absolute, placeholder, 모노 톤) → Step 3 JSX + Step 4 CSS
- [x] §3 동작 (Enter 제출, trim, getUserById, 빈 입력 → 해제, cancelled flag) → Step 3 `handleLookupSubmit` + `lookupCounterRef`
- [x] §4 매칭 규칙 (manual 우선) → Step 3 `isMine` 함수
- [x] §5 컴포넌트/파일 → Steps 3-4
- [x] §6 상태 모델 (`manualHighlight`, `lookupStatus`) → Step 3 useState 선언
- [x] §7 에러/엣지 (cancelled, 빈 input 해제, 탑5 밖 강조 없음 + 메시지) → Step 3 핸들러 + 메시지 derive
- [x] §8 테스트 4 케이스 → Step 1

**Placeholder scan:** 통과. 모든 step에 실제 코드. "TBD"/"적절히" 없음.

**Type consistency:**
- `manualHighlight`: string(nickname) | null. 항상 같은 형태로 set/read.
- `lookupStatus`: 5개 리터럴 ('idle'|'loading'|'not_found'|'error'|'done'). 모든 set/derive 위치에서 일치.
- `getUserById` 응답: `{ ok, user? | status?, message? }` — Task 1(users API)에서 정의된 envelope을 그대로 소비. user 없을 때 `user: null` 또는 user.nickname 없는 케이스 모두 not_found로 처리.
- INPUT 포커스 가드: `e.target.tagName === 'INPUT' || 'TEXTAREA'` — Set으로 비교, jsdom에서 정상 동작.
