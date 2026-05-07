# Ending Nickname + Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 엔딩 컷씬 종료 직후 닉네임 입력 단계를 EndingPage state machine에 통합하고, localStorage 기반 영속 랭킹 보드를 `/ranking`에 풀 구현한다.

**Architecture:** `EndingPage`에 `register`(닉네임 폼)·`outro`(짧은 검정 페이드) 두 phase를 추가해 라우트 분리 없이 컷씬과 입력을 한 페이지가 호스팅. 영속화는 `src/ranking/` 신규 모듈이 localStorage 어댑터로 담당하고, `RankingPage`는 navigate state의 `highlightId`로 본인 행을 식별하여 Top 10 + 본인 행 별도 표시 + 자동 복귀를 처리.

**Tech Stack:** React 19, react-router-dom 7, zustand 5, Vite 8 — 단위 테스트 프레임워크 없음. 검증 게이트는 `npm run build` + 수동 dev 시나리오. (`npm run lint`는 pre-existing config 문제로 미사용.)

**Spec:** `docs/superpowers/specs/2026-05-07-ending-nickname-ranking-design.md`
**Issue:** `.issues/20260507_기능추가_엔딩_후_닉네임_입력_랭킹_등록.md` (#28)

---

## File Structure

| 파일 | 역할 | C/M |
|---|---|---|
| `src/ranking/ranking.config.js` | 모든 tunable (닉네임 길이, Top N, 자동복귀 ms, storageKey, cap, outcome 라벨) 단일 소스 | C |
| `src/ranking/rankingStore.js` | localStorage 어댑터 + `appendRankingEntry`/`getRankingEntries`/`clearRanking` | C |
| `src/routes/EndingPage/ending.config.js` | `formRevealMs`/`outroMs` 추가 | M |
| `src/routes/EndingPage/EndingNicknameForm.jsx` | 닉네임 입력 폼 presentational + 검증 (1–8자, trim) | C |
| `src/routes/EndingPage/EndingNicknameForm.css` | 폼 가독성 + 페이드인 | C |
| `src/routes/EndingPage/EndingPage.jsx` | state machine 확장 (register/outro phase, 키 정책 일관) | M |
| `src/routes/EndingPage/EndingPage.css` | outro 검정 페이드 스타일 | M |
| `src/routes/RankingPage/RankingPage.jsx` | Top 10 + 본인 행 + 자동 복귀 풀 구현 | M (rewrite) |
| `src/routes/RankingPage/RankingPage.css` | 보드 가독성 | M (rewrite) |

---

## Task 1: ranking.config.js — 튜닝 단일 소스

**Files:**
- Create: `src/ranking/ranking.config.js`

- [ ] **Step 1: config 파일 생성**

`src/ranking/ranking.config.js`:

```js
// src/ranking/ranking.config.js
// 닉네임/랭킹 보드 튜닝 단일 소스. 모든 가변 값은 여기서 조정한다.

export const RANKING_CONFIG = {
  // 닉네임 검증 (정규식 없음 — 길이만 체크)
  nicknameMinLength: 1,
  nicknameMaxLength: 8,

  // 보드
  topN: 10,

  // /ranking 자동 복귀 (Space/Enter 또는 만료 시 resetGame + navigate('/'))
  autoReturnMs: 15000,

  // 결말 라벨 (보드 표시용)
  outcomeLabels: {
    alive:      '⭐ alive',
    silhouette: '👻 silhouette',
  },

  // 저장소 — schema 변경 시 .v2 등으로 키 갱신
  storageKey: 'quickness-game.ranking.v1',
  storageCap: 200,
};
```

- [ ] **Step 2: build 검증**

Run: `npm run build`
Expected: 빌드 성공. 새 파일은 아직 import 되지 않으므로 tree-shake되지만 syntactic validity는 검증됨.

- [ ] **Step 3: commit**

```bash
git add src/ranking/ranking.config.js
git commit -m "feat: ranking.config.js — 닉네임/랭킹 튜닝 단일 소스 #28"
```

---

## Task 2: rankingStore.js — localStorage 어댑터

**Files:**
- Create: `src/ranking/rankingStore.js`

- [ ] **Step 1: store 모듈 생성**

`src/ranking/rankingStore.js`:

```js
// src/ranking/rankingStore.js
// localStorage 기반 랭킹 영속화. localStorage 비활성/quota 초과 시 in-memory fallback.

import { RANKING_CONFIG } from './ranking.config.js';

const VALID_OUTCOMES = new Set(['alive', 'silhouette']);

// in-memory fallback — 같은 세션 내에서만 유효
let memoryFallback = [];
let useFallback = false;

function readRaw() {
  if (useFallback) return memoryFallback.slice();
  try {
    const raw = localStorage.getItem(RANKING_CONFIG.storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('[rankingStore] 손상된 데이터 — 빈 배열로 시작');
      return [];
    }
    return parsed;
  } catch (err) {
    console.warn('[rankingStore] 읽기 실패, in-memory fallback 사용', err);
    useFallback = true;
    return memoryFallback.slice();
  }
}

function writeRaw(entries) {
  if (useFallback) {
    memoryFallback = entries.slice();
    return;
  }
  try {
    localStorage.setItem(RANKING_CONFIG.storageKey, JSON.stringify(entries));
  } catch (err) {
    console.warn('[rankingStore] 쓰기 실패 (quota?), in-memory fallback로 전환', err);
    useFallback = true;
    memoryFallback = entries.slice();
  }
}

function generateId() {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 0x10000)
    .toString(16)
    .padStart(4, '0');
  return `${ts}-${rand}`;
}

/**
 * 새 entry 추가. 길이 재검증 + outcome 화이트리스트.
 * cap 초과 시 가장 오래된(ts 가장 작은) 1개 제거.
 * @returns {{id,nickname,score,outcome,ts}} 저장된 entry (id 포함)
 */
export function appendRankingEntry({ nickname, score, outcome }) {
  const trimmed = (typeof nickname === 'string' ? nickname : '').trim();
  const safeNickname = trimmed.slice(0, RANKING_CONFIG.nicknameMaxLength);
  if (safeNickname.length < RANKING_CONFIG.nicknameMinLength) {
    throw new Error('[rankingStore] nickname is empty after trim');
  }
  const safeScore = typeof score === 'number' && !Number.isNaN(score) ? score : 0;
  const safeOutcome = VALID_OUTCOMES.has(outcome) ? outcome : 'silhouette';
  const entry = {
    id: generateId(),
    nickname: safeNickname,
    score: safeScore,
    outcome: safeOutcome,
    ts: Date.now(),
  };
  const entries = readRaw();
  entries.push(entry);
  // cap 초과 → ts 오름차순 정렬 후 가장 오래된 것부터 잘라냄
  if (entries.length > RANKING_CONFIG.storageCap) {
    entries.sort((a, b) => a.ts - b.ts);
    entries.splice(0, entries.length - RANKING_CONFIG.storageCap);
  }
  writeRaw(entries);
  return entry;
}

/**
 * 정렬된 entry 배열 반환 (score desc, 동점이면 ts asc — 먼저 기록한 사람이 위).
 */
export function getRankingEntries() {
  const entries = readRaw();
  return entries.slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.ts - b.ts;
  });
}

/**
 * 운영자 전용 — 보드 비움. UI 노출 없음, 콘솔/스크립트로만 호출.
 */
export function clearRanking() {
  if (useFallback) {
    memoryFallback = [];
    return;
  }
  try {
    localStorage.removeItem(RANKING_CONFIG.storageKey);
  } catch (err) {
    console.warn('[rankingStore] clearRanking 실패', err);
  }
}
```

- [ ] **Step 2: build 검증**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 3: dev 콘솔 sanity 검증**

Run: `npm run dev`
브라우저 콘솔에서:

```js
const m = await import('/src/ranking/rankingStore.js');
m.clearRanking();
console.assert(m.getRankingEntries().length === 0, 'empty');
const e1 = m.appendRankingEntry({ nickname: '그린이짱', score: 720, outcome: 'alive' });
const e2 = m.appendRankingEntry({ nickname: '도전자',   score: 220, outcome: 'silhouette' });
const list = m.getRankingEntries();
console.assert(list[0].id === e1.id, 'order desc');
console.assert(list[0].nickname === '그린이짱', 'desc nickname');
console.assert(list[1].nickname === '도전자', 'second');
console.assert(list[0].score === 720, 'score');
// trim 검증
const e3 = m.appendRankingEntry({ nickname: '  공백  ', score: 100, outcome: 'alive' });
console.assert(e3.nickname === '공백', 'trim');
// 빈 입력 거부
let threw = false;
try { m.appendRankingEntry({ nickname: '   ', score: 1, outcome: 'alive' }); } catch { threw = true; }
console.assert(threw, 'empty throws');
m.clearRanking();
console.log('rankingStore: OK');
```

Expected: `rankingStore: OK` 출력, assertion 실패 없음.

- [ ] **Step 4: commit**

```bash
git add src/ranking/rankingStore.js
git commit -m "feat: rankingStore — localStorage 어댑터 + fallback + cap #28"
```

---

## Task 3: ending.config.js — formRevealMs / outroMs 추가

**Files:**
- Modify: `src/routes/EndingPage/ending.config.js`

- [ ] **Step 1: config 갱신**

`src/routes/EndingPage/ending.config.js`를 다음 내용으로 교체 (기존 키는 그대로 유지, 두 키만 추가):

```js
// src/routes/EndingPage/ending.config.js
// 엔딩 컷씬 튜닝 단일 소스. 타이밍/자막/outcome→자산 매핑 모두 여기서 조정.

import { ASSETS } from '../../assets.js';

export const ENDING_CONFIG = {
  // 페이드인 (이미지 + 자막 등장)
  revealMs: 1000,
  // hold (정지 노출, PRD §5 "엔딩 10초"의 대부분 차지)
  holdMs:   8000,
  // 페이드아웃 후 register phase 진입
  leaveMs:   500,
  // EndingNicknameForm 페이드인 (#28)
  formRevealMs: 500,
  // register 제출 후 검정 페이드아웃 → /ranking (#28)
  outroMs:      400,

  // 한국어 자막 1줄 — PRD §10 자막 가이드 (큰 글씨, 가독성 우선)
  captions: {
    alive:      '또 다른 나를 떨쳐냈다.',
    silhouette: '또 다른 내가 되어버렸다.',
  },

  // outcome → 사용할 이미지 / SFX 키
  // SFX 경로가 null이면 EndingCutscene에서 재생 skip (안전).
  assetsByOutcome: {
    alive: {
      image:  ASSETS.images.endingAlive,
      sfxSrc: ASSETS.sounds.endingAliveSfx,
    },
    silhouette: {
      image:  ASSETS.images.endingSilhouette,
      sfxSrc: ASSETS.sounds.endingSilhouetteSfx,
    },
  },
};
```

- [ ] **Step 2: build**

Run: `npm run build`
Expected: 통과.

- [ ] **Step 3: commit**

```bash
git add src/routes/EndingPage/ending.config.js
git commit -m "feat: ending.config — formRevealMs/outroMs 추가 (register/outro phase 준비) #28"
```

---

## Task 4: EndingNicknameForm 컴포넌트 + CSS

**Files:**
- Create: `src/routes/EndingPage/EndingNicknameForm.jsx`
- Create: `src/routes/EndingPage/EndingNicknameForm.css`

- [ ] **Step 1: jsx 생성**

`src/routes/EndingPage/EndingNicknameForm.jsx`:

```jsx
// 엔딩 컷씬 종료 후 닉네임 입력 폼.
// trim 후 1~8자만 등록 허용. 그 외 문자 검증 없음(정규식 X — 후속 이슈로 분리).
// IME(한글) 조합 중 Enter는 submit 무시 — 조합 끝난 직후 Enter만 동작.

import { useEffect, useRef, useState } from 'react';
import { RANKING_CONFIG } from '../../ranking/ranking.config.js';
import { ENDING_CONFIG } from './ending.config.js';
import './EndingNicknameForm.css';

export default function EndingNicknameForm({ outcome, totalScore, onSubmit }) {
  const [value, setValue] = useState('');
  const [composing, setComposing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = value.trim();
  const isValid =
    trimmed.length >= RANKING_CONFIG.nicknameMinLength &&
    trimmed.length <= RANKING_CONFIG.nicknameMaxLength;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (composing) return;
    if (!isValid) return;
    onSubmit(trimmed);
  };

  const outcomeLabel = RANKING_CONFIG.outcomeLabels[outcome] ?? outcome;
  const captionByOutcome = ENDING_CONFIG.captions[outcome] ?? '';

  return (
    <form className="ending-nickname" onSubmit={handleSubmit}>
      <p className="ending-nickname__heading">기록을 남겨주세요</p>
      <p className="ending-nickname__outcome">
        결말 <span className="ending-nickname__outcome-label">{outcomeLabel}</span>
      </p>
      <p className="ending-nickname__caption">{captionByOutcome}</p>
      <p className="ending-nickname__score">점수 {totalScore}</p>

      <input
        ref={inputRef}
        className="ending-nickname__input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        maxLength={RANKING_CONFIG.nicknameMaxLength}
        placeholder={`닉네임 (${RANKING_CONFIG.nicknameMinLength}-${RANKING_CONFIG.nicknameMaxLength}자)`}
        autoComplete="off"
        spellCheck={false}
      />

      <button
        type="submit"
        className="ending-nickname__submit"
        disabled={!isValid || composing}
      >
        등록 (Enter)
      </button>
    </form>
  );
}
```

- [ ] **Step 2: css 생성**

`src/routes/EndingPage/EndingNicknameForm.css`:

```css
.ending-nickname {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  text-align: center;
  color: #f4f4f4;
  animation: ending-nickname-fadein 500ms ease both;
}

@keyframes ending-nickname-fadein {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0);  }
}

.ending-nickname__heading {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
}

.ending-nickname__outcome,
.ending-nickname__caption,
.ending-nickname__score {
  margin: 0;
  font-size: 18px;
  color: rgba(244, 244, 244, 0.85);
}

.ending-nickname__outcome-label {
  font-weight: 700;
  margin-left: 4px;
}

.ending-nickname__input {
  margin-top: 8px;
  width: min(420px, 80vw);
  padding: 14px 18px;
  font-size: 28px;
  text-align: center;
  border: 2px solid rgba(244, 244, 244, 0.4);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  outline: none;
  transition: border-color 150ms ease;
}

.ending-nickname__input:focus {
  border-color: rgba(244, 244, 244, 0.9);
}

.ending-nickname__submit {
  margin-top: 8px;
  padding: 12px 28px;
  font-size: 20px;
  font-weight: 700;
  color: #0a0a0a;
  background: #f4f4f4;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 150ms ease;
}

.ending-nickname__submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

- [ ] **Step 3: build**

Run: `npm run build`
Expected: 통과 (현재는 import 되지 않아 tree-shake — 문법만 검증).

- [ ] **Step 4: commit**

```bash
git add src/routes/EndingPage/EndingNicknameForm.jsx src/routes/EndingPage/EndingNicknameForm.css
git commit -m "feat: EndingNicknameForm — 닉네임 입력 폼 + IME 안전 처리 #28"
```

---

## Task 5: EndingPage state machine 확장 (register/outro)

**Files:**
- Modify: `src/routes/EndingPage/EndingPage.jsx` (full rewrite)

- [ ] **Step 1: EndingPage.jsx 교체**

`src/routes/EndingPage/EndingPage.jsx`를 다음 내용으로 완전 교체:

```jsx
// /ending/:outcome — Stage 4 종료 직후 컷씬 → 닉네임 입력 → 랭킹 진입의 호스트.
// state machine: entered → reveal → hold → leaving → register → outro → /ranking
//
// 키 정책:
// - reveal/hold:  Space/Enter → leaving 즉시 진입
// - leaving:      추가 스킵 없음 (짧은 fade)
// - register:     윈도우 keydown listener OFF, 폼 내부 Enter만 submit
// - outro:        Space/Enter → /ranking 즉시 진입

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, selectTotalScore } from '../../store.js';
import { ENDING_CONFIG } from './ending.config.js';
import { appendRankingEntry } from '../../ranking/rankingStore.js';
import EndingCutscene from './EndingCutscene.jsx';
import EndingNicknameForm from './EndingNicknameForm.jsx';
import './EndingPage.css';

const ADVANCE_KEYS = new Set(['Space', 'Enter']);

export default function EndingPage({ outcome }) {
  const navigate = useNavigate();
  const totalScore = useGameStore(selectTotalScore);

  const [phase, setPhase] = useState('entered'); // entered | reveal | hold | leaving | register | outro
  const [highlightId, setHighlightId] = useState(null);

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

  // hold → leaving (holdMs 후 자동)
  useEffect(() => {
    if (phase !== 'hold') return undefined;
    const id = setTimeout(() => setPhase('leaving'), ENDING_CONFIG.holdMs);
    return () => clearTimeout(id);
  }, [phase]);

  // leaving → register (leaveMs 후, 컷씬 페이드아웃 완료)
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

  // 컷씬 단계 키 입력 — reveal/hold만 leaving으로 즉시 진입
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

  // outro 단계 키 입력 — 즉시 /ranking
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

  const handleNicknameSubmit = (nickname) => {
    const entry = appendRankingEntry({ nickname, score: totalScore, outcome });
    setHighlightId(entry.id);
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
          onSubmit={handleNicknameSubmit}
        />
      )}
      {phase === 'outro' && <div className="ending-page__outro" />}
    </div>
  );
}
```

- [ ] **Step 2: build 확인 (이제 새 컴포넌트들이 graph에 들어옴)**

Run: `npm run build`
Expected: 통과. 번들 크기가 Task 4 시점보다 약간 증가 (EndingNicknameForm + rankingStore가 새로 import됨).

- [ ] **Step 3: commit**

```bash
git add src/routes/EndingPage/EndingPage.jsx
git commit -m "feat: EndingPage state machine 확장 (register/outro phase + 키 정책 일관) #28"
```

---

## Task 6: EndingPage.css — outro 검정 페이드 스타일

**Files:**
- Modify: `src/routes/EndingPage/EndingPage.css`

- [ ] **Step 1: outro 스타일 추가**

`src/routes/EndingPage/EndingPage.css` 끝에 다음 블록을 추가 (기존 `.ending-page` / `::after` 비네팅은 그대로 유지):

```css
/* outro phase — 검정 풀스크린 페이드아웃 (#28) */
.ending-page__outro {
  position: absolute;
  inset: 0;
  z-index: 2;             /* 비네팅 + 폼 위에 덮음 */
  background: #000;
  animation: ending-page-outro-fadein 400ms ease both;
}

@keyframes ending-page-outro-fadein {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

- [ ] **Step 2: build**

Run: `npm run build`
Expected: 통과.

- [ ] **Step 3: commit**

```bash
git add src/routes/EndingPage/EndingPage.css
git commit -m "style: EndingPage outro 검정 페이드 스타일 #28"
```

---

## Task 7: RankingPage 풀 구현

**Files:**
- Modify: `src/routes/RankingPage/RankingPage.jsx` (full rewrite)

- [ ] **Step 1: RankingPage.jsx 교체**

`src/routes/RankingPage/RankingPage.jsx`를 다음 내용으로 완전 교체:

```jsx
// /ranking — 영속 랭킹 보드.
// - 엔딩 흐름에서 진입: location.state.highlightId 로 본인 행 식별.
//   Top N 안에 들어갔으면 그 행을 강조, 밖이면 보드 아래 별도 행으로 노출.
// - 타이틀에서 직접 진입: highlightId 없음 → 보드만 표시.
// - 자동 복귀: autoReturnMs 만료 또는 Space/Enter → resetGame + navigate('/').

import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store.js';
import { getRankingEntries } from '../../ranking/rankingStore.js';
import { RANKING_CONFIG } from '../../ranking/ranking.config.js';
import './RankingPage.css';

const ADVANCE_KEYS = new Set(['Space', 'Enter']);

export default function RankingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const resetGame = useGameStore((s) => s.resetGame);

  const highlightId = location.state?.highlightId ?? null;

  // 마운트 시점 1회 스냅샷 (렌더 중 보드가 바뀔 일 없음)
  const entries = useMemo(() => getRankingEntries(), []);
  const top = entries.slice(0, RANKING_CONFIG.topN);
  const myEntry = highlightId
    ? entries.find((e) => e.id === highlightId) ?? null
    : null;
  const myRank = myEntry ? entries.findIndex((e) => e.id === highlightId) + 1 : null;
  const myInTop = myEntry ? myRank <= RANKING_CONFIG.topN : false;

  const goTitle = () => {
    resetGame();
    navigate('/');
  };

  // 자동 복귀 타이머
  useEffect(() => {
    const id = setTimeout(goTitle, RANKING_CONFIG.autoReturnMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Space/Enter → 즉시 복귀
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

  return (
    <div className="ranking-page">
      <h1 className="ranking-page__title">🏆 RANKING BOARD</h1>

      {top.length === 0 && (
        <p className="ranking-page__empty">아직 기록이 없습니다.</p>
      )}

      {top.length > 0 && (
        <table className="ranking-page__table">
          <thead>
            <tr>
              <th>순위</th>
              <th>닉네임</th>
              <th>점수</th>
              <th>결말</th>
            </tr>
          </thead>
          <tbody>
            {top.map((e, i) => {
              const rank = i + 1;
              const isMe = e.id === highlightId;
              return (
                <tr
                  key={e.id}
                  className={isMe ? 'ranking-page__row ranking-page__row--me' : 'ranking-page__row'}
                >
                  <td>{rank}</td>
                  <td>{e.nickname}</td>
                  <td>{e.score}</td>
                  <td>{RANKING_CONFIG.outcomeLabels[e.outcome] ?? e.outcome}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {myEntry && !myInTop && (
        <p className="ranking-page__myrow">
          내 기록: {myRank}위 — {myEntry.nickname} {myEntry.score} ({RANKING_CONFIG.outcomeLabels[myEntry.outcome] ?? myEntry.outcome})
        </p>
      )}

      <p className="ranking-page__hint">
        Space / Enter 또는 잠시 후 타이틀로 돌아갑니다.
      </p>

      <button type="button" className="ranking-page__back" onClick={goTitle}>
        처음으로
      </button>
    </div>
  );
}
```

- [ ] **Step 2: build**

Run: `npm run build`
Expected: 통과.

- [ ] **Step 3: commit**

```bash
git add src/routes/RankingPage/RankingPage.jsx
git commit -m "feat: RankingPage — Top 10 + 본인 행 + 자동 복귀 풀 구현 #28"
```

---

## Task 8: RankingPage.css — 보드 가독성

**Files:**
- Modify: `src/routes/RankingPage/RankingPage.css` (full rewrite)

- [ ] **Step 1: CSS 교체**

`src/routes/RankingPage/RankingPage.css`를 다음 내용으로 완전 교체:

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

.ranking-page__row--me {
  background: rgba(244, 196, 100, 0.18);
  box-shadow: inset 4px 0 0 #f4c464;
}

.ranking-page__myrow {
  margin: 12px 0 0;
  padding: 10px 16px;
  background: rgba(244, 196, 100, 0.18);
  border-left: 4px solid #f4c464;
  border-radius: 4px;
  font-size: 18px;
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

- [ ] **Step 2: build**

Run: `npm run build`
Expected: 통과.

- [ ] **Step 3: commit**

```bash
git add src/routes/RankingPage/RankingPage.css
git commit -m "style: RankingPage 보드 가독성 + 본인 행 강조 #28"
```

---

## Task 9: end-to-end 수동 검증

**Files:** (no changes)

코드 변경 없음. dev 환경에서 spec §11 시나리오를 직접 클릭/입력해 확인.

- [ ] **Step 1: dev 서버 기동**

Run: `npm run dev`
브라우저로 dev 페이지 진입 (예: http://localhost:5173).

- [ ] **Step 2: 시나리오 #1 — 성공 엔딩 → Top 10 진입**

콘솔에서 점수 강제 + 엔딩 진입:

```js
const m = await import('/src/store.js');
m.useGameStore.getState().resetGame();
m.useGameStore.getState().recordResult(3, 0.05); // 300
m.useGameStore.getState().recordResult(4, 0.05); // 400 → total 700 ≥ 600 → alive
location.assign('/ending/alive');
```

확인:
- 컷씬 정상 노출, 자동 또는 Space로 leaving 진입 → 페이드아웃
- register phase: EndingNicknameForm이 페이드인, 입력 박스에 자동 포커스
- 닉네임 "그린이짱" 입력 후 Enter
- 짧은 검정 페이드 후 `/ranking` 진입
- Top 10에 "그린이짱 720 ⭐ alive" 행이 강조 표시 (배경색 + 좌측 마커)

- [ ] **Step 3: 시나리오 #2 — 실패 엔딩 → Top 10 밖 별도 행**

먼저 보드를 가짜 기록으로 채워 본인이 Top 10 밖이 되도록:

```js
const m = await import('/src/ranking/rankingStore.js');
m.clearRanking();
for (let i = 0; i < 12; i++) {
  m.appendRankingEntry({ nickname: `더미${i}`, score: 1000 - i * 10, outcome: 'alive' });
}
const s = await import('/src/store.js');
s.useGameStore.getState().resetGame();
s.useGameStore.getState().recordResult(3, 0.5); // 낮은 tier
s.useGameStore.getState().recordResult(4, 0.5);
location.assign('/ending/silhouette');
```

확인:
- silhouette 컷씬 + register + 닉네임 "그린이팬" 등록
- `/ranking`에서 Top 10에는 본인 행 없음
- 보드 아래에 "내 기록: N위 — 그린이팬 ... (👻 silhouette)" 별도 행 노출

- [ ] **Step 4: 시나리오 #3 — 빈 입력 거부**

엔딩 진입 후 register phase에서 닉네임 비워두고 Enter.
확인: 폼이 submit되지 않음, 등록 버튼이 disabled, 어떤 글자라도 입력하면 활성화.

- [ ] **Step 5: 시나리오 #4 — 8자 초과 차단**

register phase에서 9자 입력 시도.
확인: 9번째 문자 입력 차단 (브라우저 native maxLength).

- [ ] **Step 6: 시나리오 #5 — 타이틀 → 랭킹 보기**

타이틀에서 "🏆 랭킹 보기" 클릭.
확인: `/ranking` 진입 시 Top 10만 표시, 본인 행 별도 영역 없음. Space/Enter 또는 자동 복귀로 타이틀 복귀.

- [ ] **Step 7: 시나리오 #6 — IME(한글) 조합 중 Enter**

register phase에서 한글 IME로 닉네임 조합 중 (예: "그ㄹ" 상태) Enter.
확인: 조합이 끝날 때까지 submit 안 됨. 조합이 완성된 후 다시 Enter 누르면 submit.

- [ ] **Step 8: 시나리오 #7 — 자동 복귀**

`/ranking`에서 가만히 15초 대기.
확인: 약 15초 후 타이틀(`/`)로 자동 이동, store가 reset되어 stageResults 모두 null.

- [ ] **Step 9: 시나리오 #8 — Space/Enter 즉시 스킵 일관**

각 단계에서 Space 눌러 스킵 동작 확인:
- reveal/hold: leaving 즉시 진입
- register: Space는 닉네임 문자로 입력됨 (스킵 X), Enter만 제출
- outro: 즉시 /ranking
- /ranking: 즉시 타이틀

- [ ] **Step 10: 시나리오 #9 — localStorage 비활성 fallback**

DevTools → Application → Storage → localStorage 비우고, 시크릿 창에서 dev URL 진입 후 한 번 플레이.
확인: 콘솔 경고 1회 + 게임 진행 정상, 보드는 같은 세션 내에서만 보임 (새 탭에서는 빈 보드).

- [ ] **Step 11: 시나리오 #10 — resetGame 후 재플레이**

`/ranking` → 타이틀 복귀 → 새 게임 진행 → 새 entry 등록.
확인: 보드에 직전 entry와 새 entry 모두 존재 (영속).

- [ ] **Step 12: 시나리오 #11 — 회귀: #26 엔딩 분기 정상**

콘솔로 점수 700 만들고 `/ending/alive` 직접 진입 / 점수 0으로 `/ending/silhouette` 직접 진입 — 컷씬 자체 동작은 #26 그대로 유지되는지 확인.

- [ ] **Step 13: 최종 build**

Run: `npm run build`
Expected: 통과.

---

## Risks & Mitigations

| 위험 | 대응 |
|---|---|
| `npm run dev` 자동재생 정책으로 SFX 미재생 | 본 이슈 SFX 변경 없음 (#26에서 null 슬롯 유지) |
| IME 조합 중 Enter가 의도치 않은 submit | Task 4의 `composing` 상태로 차단 |
| localStorage 비활성/quota | Task 2의 in-memory fallback |
| storageCap 200이 부스 운영 회전율과 안 맞음 | `ranking.config.js`의 `storageCap` 한 줄 조정 |
| 자동 복귀 15s 길거나 짧음 | `RANKING_CONFIG.autoReturnMs` 한 줄 조정 |
| outcome 라벨 이모지 폰트 미지원 | `outcomeLabels` config 한 줄 수정으로 텍스트 대체 |
| Top 10 표가 작은 화면에서 깨짐 | CSS `min(720px, 90vw)` + `overflow-y: auto` 적용 |

---

## Self-Review

**1. Spec coverage:**
- §3 전체 흐름 → Tasks 5·7 ✓
- §4 EndingPage state machine 확장 → Task 5 ✓
- §5 EndingNicknameForm → Task 4 ✓
- §6 ranking 모듈 (config + store) → Tasks 1·2 ✓
- §7 RankingPage 풀 구현 → Tasks 7·8 ✓
- §8 ending.config 확장 → Task 3 ✓
- §9 폴더 구조 → Tasks 1~8 합산으로 일치 ✓
- §10 데이터 흐름 → Task 5의 EndingPage 코드 + Task 7 RankingPage 코드 ✓
- §11 검증 시나리오 → Task 9 ✓
- §12 위험 요소 → 본 plan Risks 섹션 ✓
- §13 완료 정의 → Tasks 1~9 합산 ✓
- §14 후속 이슈 분리 → spec에서 관리 ✓

**2. Placeholder scan:** "TBD"·"TODO"·"implement later"·"add validation" 없음. 모든 step에 실 코드/명령. ✓

**3. Type consistency:**
- `RANKING_CONFIG` 키 (`nicknameMinLength`, `nicknameMaxLength`, `topN`, `autoReturnMs`, `outcomeLabels`, `storageKey`, `storageCap`) — Task 1 정의, Tasks 2·4·7에서 동일 키로 참조 ✓
- `appendRankingEntry({ nickname, score, outcome })` 시그니처 (Task 2) → `EndingPage.handleNicknameSubmit`의 호출 (Task 5) 일치 ✓
- `getRankingEntries()` 반환 형태 (id/nickname/score/outcome/ts) — Task 2 정의, Task 7에서 그대로 소비 ✓
- `phase` 값 6개 (`entered|reveal|hold|leaving|register|outro`) — Task 5 EndingPage가 모두 발행, Task 4 EndingNicknameForm은 phase에 의존하지 않음 (mount 시점만 활용), Task 6 outro CSS 일치 ✓
- `highlightId` 흐름 — Task 5에서 set + navigate state로 전달, Task 7에서 location.state로 수신 ✓
- `outcome` 값 `'alive'|'silhouette'` 일관, `outcomeLabels` 키도 동일 ✓
- `ENDING_CONFIG.formRevealMs` 추가 (Task 3) — Task 4 CSS의 500ms와 정합 (CSS 직값 + config 동일 의도, 코멘트로 매핑 명시) ✓
- `ENDING_CONFIG.outroMs` 추가 (Task 3) — Task 5의 `setTimeout(..., outroMs)` + Task 6 CSS 400ms와 정합 ✓

이슈/모호함 없음.
