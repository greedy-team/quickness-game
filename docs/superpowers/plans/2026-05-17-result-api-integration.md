# Result API 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** quickness-game 엔딩 폼에서 닉네임 대신 userId를 입력받고 `POST /api/result`로 점수를 등록한다. 성공 시 결과 모달 → `/ranking`, 실패 시 폼 인라인 에러로 재시도 가능.

**Architecture:** 작은 API 클라이언트 모듈(`src/api/result.js`)이 fetch + AbortController로 호출을 담당하고 throw 대신 `{ ok, status?, message? }` 결과 객체를 반환한다. `EndingPage`가 호출자/오케스트레이터 역할을 맡아 phase 머신(`register → success → outro → /ranking`)을 확장하고, `EndingNicknameForm`은 표현 + 입력 책임만 유지한 채 `isSubmitting`/`errorMessage` prop을 추가로 받는다. 환경변수는 Vite 규약(`VITE_` 접두사)에 맞춰 rename.

**Tech Stack:** React 19, Vite 8, vitest 2, jsdom, fetch API, AbortController, zustand (기존).

**Spec:** [`docs/superpowers/specs/2026-05-17-result-api-integration-design.md`](../specs/2026-05-17-result-api-integration-design.md)

---

## File Structure

| 종류 | 경로 | 책임 |
| --- | --- | --- |
| 수정 | `.env` | `VITE_` 접두사로 rename |
| 수정 | `.env.example` | 동일 |
| 신규 | `src/api/result.js` | `submitResult({ userId, score })` — fetch + AbortController + 결과 객체 |
| 신규 | `src/api/result.test.js` | 성공/HTTP 에러/네트워크 에러/env 누락/페이로드 검증 |
| 수정 | `src/routes/EndingPage/EndingNicknameForm.jsx` | userId 모드 라벨/검증, `isSubmitting`/`errorMessage` prop |
| 수정 | `src/routes/EndingPage/EndingNicknameForm.css` | 에러 메시지 영역 스타일 |
| 신규 | `src/routes/EndingPage/RegisterSuccessModal.jsx` | 등록 성공 모달 (Enter/Space/닫기로 outro 전이) |
| 신규 | `src/routes/EndingPage/RegisterSuccessModal.css` | 모달 스타일 (`InfoModal` 패턴 차용) |
| 수정 | `src/routes/EndingPage/EndingPage.jsx` | API 호출, phase 머신 확장, success 키 입력 |

---

## Task 1: 환경 변수 rename

Vite는 `VITE_` 접두사가 붙은 변수만 클라이언트 번들에 노출한다. 현재 `.env`는 접두사 없이 작성돼 있어 `import.meta.env`에서 읽히지 않는다.

> **⚠️ 보안:** `.env`는 `.gitignore`에 등록된 **로컬 시크릿 저장소**이다. 절대 `git add` / `git add -f`로 추적시키거나 커밋하지 말 것. 커밋 대상은 **`.env.example`만**이다.

**Files:**
- Modify (로컬만, 커밋 X): `.env`
- Modify (커밋 O): `.env.example`

- [ ] **Step 1: 로컬 `.env` 내용 갱신**

```
VITE_API_BASE_URL=https://7y8yhdx6vf.execute-api.ap-northeast-2.amazonaws.com
VITE_API_KEY=tempgreedy
```

(기존 `API_BASE_URL=...`, `API_KEY=...` 키를 위와 같이 `VITE_` 접두사를 붙여 교체.)

- [ ] **Step 2: `.env.example` 갱신**

```
VITE_API_BASE_URL=백엔드주소
VITE_API_KEY=발급된키
```

- [ ] **Step 3: dev 서버 재기동으로 변수 노출 확인**

이미 `dev` 서버가 떠 있다면 환경 변수 변경은 재시작이 필요하다. 이번 step에서는 변경만 수행한다(검증은 후속 task에서 통합 확인).

- [ ] **Step 4: Commit — `.env.example`만**

```bash
git add .env.example
git status   # .env가 staged에 없는지 확인. .env는 gitignore에 의해 status에도 안 보여야 정상.
git commit -m "chore: .env.example을 Vite VITE_ 접두사 규약에 맞춰 정리 #51"
```

만약 `git status`에 `.env`가 보인다면 누군가 `git add -f`로 강제 추적시켰다는 뜻. 즉시 `git rm --cached .env`로 추적을 해제하고 새 커밋에 포함되지 않도록 한다.

---

## Task 2: `submitResult` API client — RED (실패 테스트 작성)

vitest의 `vi.stubGlobal('fetch', ...)`로 fetch를 모킹하고, `vi.stubEnv()`로 `import.meta.env.VITE_*` 값을 통제한다. 실제 네트워크는 절대 타지 않는다.

**Files:**
- Create: `src/api/result.test.js`

- [ ] **Step 1: 테스트 파일 생성 (모든 케이스 포함)**

```js
// src/api/result.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { submitResult } from './result.js';

describe('submitResult', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    vi.stubEnv('VITE_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('200 응답 시 ok:true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'OK' }), { status: 200 }),
    ));

    const result = await submitResult({ userId: 'AAAA', score: 420 });

    expect(result).toEqual({ ok: true });
  });

  it('요청 페이로드에 gameName/userId/score/apiKey 포함', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await submitResult({ userId: 'BBBB', score: 350 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/api/result');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({
      gameName: 'quickness-game',
      userId: 'BBBB',
      score: 350,
      apiKey: 'test-key',
    });
  });

  it('4xx + body message → 해당 메시지 전달', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: '존재하지 않는 유저입니다.' }), { status: 404 }),
    ));

    const result = await submitResult({ userId: 'ZZZZ', score: 100 });

    expect(result).toEqual({
      ok: false,
      status: 404,
      message: '존재하지 않는 유저입니다.',
    });
  });

  it('4xx + body 없음 → 기본 4xx 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 400 }),
    ));

    const result = await submitResult({ userId: 'AAAA', score: 100 });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('등록에 실패했습니다. 유저 ID를 확인해주세요.');
  });

  it('5xx → 서버 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 503 }),
    ));

    const result = await submitResult({ userId: 'AAAA', score: 100 });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(result.message).toBe('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('fetch reject → 네트워크 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const result = await submitResult({ userId: 'AAAA', score: 100 });

    expect(result.ok).toBe(false);
    expect(result.message).toBe('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('AbortError(타임아웃) → 네트워크 오류 메시지', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    }));

    const result = await submitResult({ userId: 'AAAA', score: 100 });

    expect(result.ok).toBe(false);
    expect(result.message).toBe('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });

  it('VITE_API_BASE_URL 누락 → ok:false + 환경 설정 오류', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await submitResult({ userId: 'AAAA', score: 100 });

    expect(result.ok).toBe(false);
    expect(result.message).toBe('환경 설정 오류가 발생했습니다.');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('VITE_API_KEY 누락 → ok:false + 환경 설정 오류', async () => {
    vi.stubEnv('VITE_API_KEY', '');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await submitResult({ userId: 'AAAA', score: 100 });

    expect(result.ok).toBe(false);
    expect(result.message).toBe('환경 설정 오류가 발생했습니다.');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
```

- [ ] **Step 2: 테스트 실행 — 모두 실패 확인**

Run: `npm run test:run -- src/api/result.test.js`
Expected: 모든 테스트 FAIL (`./result.js` 모듈이 없으므로 import 단계에서 실패).

---

## Task 3: `submitResult` 구현 — GREEN

**Files:**
- Create: `src/api/result.js`

- [ ] **Step 1: 구현 작성**

```js
// src/api/result.js
// quickness-game 결과 등록 API 클라이언트.
// - 8초 타임아웃 (AbortController)
// - throw 하지 않고 { ok, status?, message? } 반환 (호출자 분기 단순화)
// - 환경 변수 누락은 콘솔에 에러 + 사용자 친화 메시지 반환

const API_GAME_NAME = 'quickness-game';
const REQUEST_TIMEOUT_MS = 8000;

const MESSAGES = {
  env: '환경 설정 오류가 발생했습니다.',
  network: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  client: '등록에 실패했습니다. 유저 ID를 확인해주세요.',
};

export async function submitResult({ userId, score }) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const apiKey = import.meta.env.VITE_API_KEY;

  if (!baseUrl || !apiKey) {
    console.error('[result api] missing env', {
      hasBaseUrl: Boolean(baseUrl),
      hasApiKey: Boolean(apiKey),
    });
    return { ok: false, status: 0, message: MESSAGES.env };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/api/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameName: API_GAME_NAME,
        userId,
        score,
        apiKey,
      }),
      signal: controller.signal,
    });

    if (response.ok) {
      return { ok: true };
    }

    let bodyMessage = null;
    try {
      const data = await response.json();
      bodyMessage = typeof data?.message === 'string' ? data.message : null;
    } catch {
      bodyMessage = null;
    }

    const fallback = response.status >= 500 ? MESSAGES.server : MESSAGES.client;
    return {
      ok: false,
      status: response.status,
      message: bodyMessage || fallback,
    };
  } catch {
    return { ok: false, status: 0, message: MESSAGES.network };
  } finally {
    clearTimeout(timeoutId);
  }
}
```

- [ ] **Step 2: 테스트 실행 — 모두 통과 확인**

Run: `npm run test:run -- src/api/result.test.js`
Expected: 9 tests passed.

- [ ] **Step 3: 전체 테스트 회귀 확인**

Run: `npm run test:run`
Expected: 모든 기존 테스트 + 신규 9개 통과.

- [ ] **Step 4: Commit**

```bash
git add src/api/result.js src/api/result.test.js
git commit -m "feat: result 등록 API 클라이언트 추가 #51"
```

---

## Task 4: `RegisterSuccessModal` 컴포넌트 추가

`InfoModal` 패턴(backdrop + dialog + close 버튼)을 차용한다. Enter/Space로도 닫힐 수 있어야 하므로 키 입력은 호출자(EndingPage)에서 처리하고, 컴포넌트는 표현만 담당한다.

**Files:**
- Create: `src/routes/EndingPage/RegisterSuccessModal.jsx`
- Create: `src/routes/EndingPage/RegisterSuccessModal.css`

- [ ] **Step 1: JSX 작성**

```jsx
// src/routes/EndingPage/RegisterSuccessModal.jsx
// 결과 등록 성공 모달. Enter/Space는 EndingPage에서 처리하고, 본 컴포넌트는 표현만 담당.

import './RegisterSuccessModal.css';

export default function RegisterSuccessModal({ score, onClose }) {
  return (
    <div
      className="register-success-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="register-success-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="register-success-title"
      >
        <div className="register-success-modal__header">
          <h2 id="register-success-title">기록 등록 완료</h2>
          <button
            type="button"
            className="register-success-modal__close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className="register-success-modal__body">
          <p className="register-success-modal__lead">기록이 등록되었습니다.</p>
          <p className="register-success-modal__score">점수 {score}점</p>
          <p className="register-success-modal__hint">Enter / Space 또는 닫기 버튼으로 랭킹으로 이동합니다.</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: CSS 작성**

```css
/* src/routes/EndingPage/RegisterSuccessModal.css */
.register-success-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: clamp(16px, 4vw, 40px);
}

.register-success-modal {
  background: #0e0e0e;
  border: 1px solid rgba(180, 0, 0, 0.5);
  border-radius: clamp(6px, 1vw, 12px);
  padding: clamp(28px, 5vw, 60px);
  max-width: min(640px, 92vw);
  width: 100%;
  color: #ffffff;
  box-shadow: 0 0 40px rgba(160, 0, 0, 0.25), inset 0 0 60px rgba(0, 0, 0, 0.6);
}

.register-success-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: clamp(20px, 3vw, 32px);
}

.register-success-modal__header h2 {
  font-size: clamp(1.4rem, 3vw, 2.2rem);
  font-weight: 700;
  letter-spacing: 0.08em;
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
}

.register-success-modal__close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}

.register-success-modal__close:hover {
  color: rgba(200, 0, 0, 0.9);
}

.register-success-modal__lead {
  margin: 0 0 clamp(8px, 1.5vw, 14px);
  font-size: clamp(1.1rem, 2.4vw, 1.6rem);
  color: rgba(255, 255, 255, 0.85);
}

.register-success-modal__score {
  margin: 0 0 clamp(12px, 2vw, 20px);
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 800;
  letter-spacing: 0.04em;
}

.register-success-modal__hint {
  margin: 0;
  font-size: clamp(0.85rem, 1.6vw, 1.05rem);
  color: rgba(255, 255, 255, 0.55);
}
```

- [ ] **Step 3: lint 통과 확인**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/EndingPage/RegisterSuccessModal.jsx src/routes/EndingPage/RegisterSuccessModal.css
git commit -m "feat: 결과 등록 성공 모달 컴포넌트 추가 #51"
```

---

## Task 5: `EndingNicknameForm` — userId 모드로 전환

**책임 변화:**
- 입력 라벨/플레이스홀더를 userId 문구로 교체.
- 길이 검증 제거(trim ≥ 1자만 허용). `RANKING_CONFIG.nicknameMaxLength` 의존 제거 — `maxLength` 속성도 제거(백엔드가 형식을 정의함).
- `isSubmitting`, `errorMessage` prop 추가. 제출 중에는 버튼/Enter submit 차단.
- 컴포넌트/파일 이름은 유지(외부 참조 변경 최소화).

**Files:**
- Modify: `src/routes/EndingPage/EndingNicknameForm.jsx`
- Modify: `src/routes/EndingPage/EndingNicknameForm.css`

- [ ] **Step 1: JSX 전체 교체**

기존 파일을 다음으로 대체:

```jsx
// src/routes/EndingPage/EndingNicknameForm.jsx
// 엔딩 컷씬 종료 후 userId 입력 폼.
// - 검증: trim 후 1자 이상만 허용 (형식 검증은 백엔드 담당).
// - IME(한글) 조합 중 Enter는 submit 무시 — 조합 끝난 직후 Enter만 동작.
// - isSubmitting 동안 버튼/Enter submit 차단.

import { useEffect, useRef, useState } from 'react';
import { ENDING_CONFIG } from './ending.config.js';
import { TOTAL_MAX_SCORE } from '../../scoring.js';
import { RANKING_CONFIG } from '../../ranking/ranking.config.js';
import './EndingNicknameForm.css';

export default function EndingNicknameForm({
  outcome,
  totalScore,
  isSubmitting = false,
  errorMessage = null,
  onSubmit,
}) {
  const [value, setValue] = useState('');
  const [composing, setComposing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = value.trim();
  const isValid = trimmed.length >= 1;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (composing) return;
    if (!isValid) return;
    if (isSubmitting) return;
    onSubmit(trimmed);
  };

  const outcomeLabel = RANKING_CONFIG.outcomeLabels[outcome] ?? outcome;
  const captionByOutcome = ENDING_CONFIG.captions[outcome] ?? '';
  const formStyle = { '--ending-nickname-reveal-ms': `${ENDING_CONFIG.formRevealMs}ms` };

  return (
    <form className="ending-nickname" style={formStyle} onSubmit={handleSubmit}>
      <p className="ending-nickname__heading">기록을 남겨주세요</p>
      <p className="ending-nickname__outcome">
        결말 <span className="ending-nickname__outcome-label">{outcomeLabel}</span>
      </p>
      <p className="ending-nickname__caption">{captionByOutcome}</p>
      <p className="ending-nickname__score">점수 {totalScore} / {TOTAL_MAX_SCORE}</p>

      <input
        ref={inputRef}
        className="ending-nickname__input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        placeholder="유저 ID 입력"
        autoComplete="off"
        spellCheck={false}
        disabled={isSubmitting}
      />

      {errorMessage && (
        <p className="ending-nickname__error" role="alert">{errorMessage}</p>
      )}

      <button
        type="submit"
        className="ending-nickname__submit"
        disabled={!isValid || composing || isSubmitting}
      >
        {isSubmitting ? '등록 중…' : '등록 (Enter)'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: CSS — 에러 메시지 영역 + disabled input 스타일 추가**

`src/routes/EndingPage/EndingNicknameForm.css` 끝에 다음 블록을 append:

```css
.ending-nickname__input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ending-nickname__error {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #ff6b6b;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
  max-width: min(480px, 80vw);
  text-align: center;
}
```

- [ ] **Step 3: lint 통과 확인**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/EndingPage/EndingNicknameForm.jsx src/routes/EndingPage/EndingNicknameForm.css
git commit -m "feat: 엔딩 폼을 userId 입력 모드로 전환 #51"
```

---

## Task 6: `EndingPage` — API 호출 + phase 머신 확장

**phase 머신:**
- 기존: `entered → reveal → hold → leaving → register → outro → /ranking`
- 변경: `entered → reveal → hold → leaving → register → success → outro → /ranking`

**state 추가:**
- `isSubmitting` — API 진행 중 플래그
- `errorMessage` — 폼 인라인 에러
- `submittedScore` — 모달 표시용 (제출 시점 totalScore 스냅샷)

**Files:**
- Modify: `src/routes/EndingPage/EndingPage.jsx`

- [ ] **Step 1: 파일 전체 교체**

기존 파일을 다음으로 대체:

```jsx
// /ending/:outcome — Stage 4 종료 직후 컷씬 → userId 입력 → 등록 → 랭킹 진입의 호스트.
// state machine: entered → reveal → hold → leaving → register → success → outro → /ranking
//
// 키 정책:
// - reveal/hold:  Space/Enter → leaving 즉시 진입
// - leaving:      추가 스킵 없음 (짧은 fade)
// - register:     윈도우 keydown listener OFF, 폼 내부 Enter만 submit
// - success:      Space/Enter → outro 즉시 진입
// - outro:        Space/Enter → /ranking 즉시 진입

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, selectTotalScore } from '../../store.js';
import { submitResult } from '../../api/result.js';
import { ENDING_CONFIG } from './ending.config.js';
import EndingCutscene from './EndingCutscene.jsx';
import EndingNicknameForm from './EndingNicknameForm.jsx';
import RegisterSuccessModal from './RegisterSuccessModal.jsx';
import './EndingPage.css';

const ADVANCE_KEYS = new Set(['Space', 'Enter']);

export default function EndingPage({ outcome }) {
  const navigate = useNavigate();
  const totalScore = useGameStore(selectTotalScore);

  const [phase, setPhase] = useState('entered');
  const [highlightId, setHighlightId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [submittedScore, setSubmittedScore] = useState(null);

  // entered → reveal (즉시)
  useEffect(() => {
    if (phase !== 'entered') return undefined;
    const id = requestAnimationFrame(() => setPhase('reveal'));
    return () => cancelAnimationFrame(id);
  }, [phase]);

  // reveal → hold (revealMs 후)
  useEffect(() => {
    if (phase !== 'reveal') return undefined;
    const id = setTimeout(() => setPhase('hold'), ENDING_CONFIG.revealMs);
    return () => clearTimeout(id);
  }, [phase]);

  // hold → leaving: 키 입력으로만 진행

  // leaving → register (leaveMs 후)
  useEffect(() => {
    if (phase !== 'leaving') return undefined;
    const id = setTimeout(() => setPhase('register'), ENDING_CONFIG.leaveMs);
    return () => clearTimeout(id);
  }, [phase]);

  // outro → /ranking (outroMs 후)
  useEffect(() => {
    if (phase !== 'outro') return undefined;
    const id = setTimeout(
      () => navigate('/ranking', { state: { highlightId } }),
      ENDING_CONFIG.outroMs,
    );
    return () => clearTimeout(id);
  }, [phase, navigate, highlightId]);

  // reveal/hold 키 입력 — leaving 진입
  useEffect(() => {
    if (phase !== 'reveal' && phase !== 'hold') return undefined;
    const handle = (e) => {
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        setPhase('leaving');
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [phase]);

  // success 키 입력 — outro 즉시 진입
  useEffect(() => {
    if (phase !== 'success') return undefined;
    const handle = (e) => {
      if (ADVANCE_KEYS.has(e.code)) {
        e.preventDefault();
        setPhase('outro');
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [phase]);

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

  const handleUserIdSubmit = async (userId) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await submitResult({ userId, score: totalScore });

    if (result.ok) {
      setSubmittedScore(totalScore);
      setHighlightId(userId);
      setIsSubmitting(false);
      setPhase('success');
      return;
    }

    setErrorMessage(result.message);
    setIsSubmitting(false);
  };

  const handleSuccessModalClose = () => {
    setPhase('outro');
  };

  return (
    <div className="ending-page">
      {(phase === 'entered'
        || phase === 'reveal'
        || phase === 'hold'
        || phase === 'leaving') && (
        <EndingCutscene
          outcome={outcome}
          phase={phase}
          totalScore={totalScore}
        />
      )}
      {phase === 'register' && (
        <EndingNicknameForm
          outcome={outcome}
          totalScore={totalScore}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onSubmit={handleUserIdSubmit}
        />
      )}
      {phase === 'success' && (
        <RegisterSuccessModal
          score={submittedScore ?? totalScore}
          onClose={handleSuccessModalClose}
        />
      )}
      {phase === 'outro' && <div className="ending-page__outro" />}
    </div>
  );
}
```

- [ ] **Step 2: lint 통과 확인**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: 전체 테스트 회귀 확인**

Run: `npm run test:run`
Expected: 모든 기존 + 신규 테스트 통과.

- [ ] **Step 4: Commit**

```bash
git add src/routes/EndingPage/EndingPage.jsx
git commit -m "feat: 엔딩에서 결과 등록 API 호출 + 성공 모달 연동 #51"
```

---

## Task 7: 수동 통합 검증

`vitest`로는 fetch 모킹과 phase 머신을 전부 커버할 수 있지만, 실제 dev 환경에서 환경 변수 로딩과 백엔드 응답을 한 번 확인한다.

**Files:** (코드 변경 없음 — 검증만)

- [ ] **Step 1: dev 서버 재기동**

Run: `npm run dev`
Expected: Vite dev 서버가 새 `.env`를 로드하며 시작.

- [ ] **Step 2: 게임을 끝까지 진행해 엔딩 도달**

스테이지 1~4 완료 → 엔딩 컷씬 → register 단계에서 userId 입력 폼 노출 확인.

체크 포인트:
- 입력 placeholder가 "유저 ID 입력"인지
- 1자 미만일 때 등록 버튼 disabled인지
- 점수 표기가 `점수 X / 600`인지 (TOTAL_MAX_SCORE)

- [ ] **Step 3: 실제 발급된 userId(예: `AAAA`)로 등록 — 성공 케이스**

체크 포인트:
- 등록 누르면 버튼이 "등록 중…"으로 바뀌는지
- 200 응답 후 결과 모달이 뜨는지 ("점수 X점")
- Enter 또는 모달 닫기 → outro 페이드 → `/ranking`로 진입하는지

- [ ] **Step 4: 잘못된 userId로 등록 — 실패 케이스**

체크 포인트:
- 폼 아래 에러 메시지 노출
- 입력 유지 (값 사라지지 않음)
- 버튼이 다시 활성화되어 재제출 가능

- [ ] **Step 5: 네트워크 차단 후 실패 케이스**

DevTools → Network throttling → Offline.
체크 포인트:
- 8초 안에 폼에 "네트워크 오류가 발생했습니다…" 메시지 노출
- 재시도 가능

- [ ] **Step 6: 검증 메모 + 마지막 정리 commit (변경이 있을 때만)**

검증 중 추가 fix가 생기면 해당 task로 돌아가 수정 후 별도 commit. 변경 없으면 task를 종료한다.

---

## Self-Review

- 스펙 §2 목표 4개:
  - 닉네임 → userId 입력 전환: Task 5 ✓
  - `POST /api/result` 호출 + UX 분기: Task 3, 6 ✓
  - `apiKey` 환경 변수 주입: Task 1, 3 ✓
  - 실패 시 폼 재시도: Task 5, 6 ✓
- 스펙 §4 사용자 흐름: Task 6 phase 머신과 일치 ✓
- 스펙 §5 페이로드 형식: Task 2 payload 테스트 + Task 3 구현 ✓
- 스펙 §6 환경 변수 rename: Task 1 ✓
- 스펙 §7.1 API 클라이언트: Task 3 ✓
- 스펙 §7.2 폼 변경: Task 5 ✓
- 스펙 §7.3 EndingPage 변경: Task 6 ✓
- 스펙 §7.4 성공 모달: Task 4 ✓
- 스펙 §8 에러 처리 표:
  - 네트워크 실패: Task 2 fetch reject + AbortError → Task 3 MESSAGES.network ✓
  - 4xx body message: Task 2/3 ✓
  - 4xx body 없음: Task 2/3 ✓
  - 5xx: Task 2/3 ✓
  - env 누락: Task 2/3 ✓
- 스펙 §10 테스트: Task 2의 9개 케이스가 스펙의 모든 케이스 커버 ✓
- 타입/시그니처 일관:
  - `submitResult({ userId, score })` — Task 2, 3, 6에서 동일 ✓
  - `{ ok, status?, message }` 결과 형태 — Task 2, 3, 6에서 동일 ✓
  - 결과 모달 prop `{ score, onClose }` — Task 4 정의, Task 6 호출 동일 ✓
  - `EndingNicknameForm` prop `{ outcome, totalScore, isSubmitting, errorMessage, onSubmit }` — Task 5 정의, Task 6 호출 동일 ✓
- 플레이스홀더 스캔: 없음 ✓
