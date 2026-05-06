# 보스전 + 누적 포인트 기반 랭킹 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 미니게임 1~4 누적 점수를 보스전 데미지로 사용해 보스를 처치하고, 닉네임을 받아 LocalStorage 기반 랭킹에 등록·표시한다. 백엔드 도입 시 어댑터 1개 교체로 마이그레이션 가능한 구조.

**Architecture:** App.jsx의 `state.scene` 분기 라우터에 `boss_fight`/`nickname_input`/`ranking` 씬을 끼우고, 랭킹 저장소는 `rankingRepository` 단일 인터페이스 뒤에 LocalStorage 어댑터를 둔다. 보스전은 `Math.max(totalScore, 1)` 데미지로 무조건 클리어 가능(패배 분기 없음).

**Tech Stack:** React 19, Vite 8, Vanilla JS(no test runner). 단위 검증은 `if (import.meta.env?.DEV) console.assert()` 패턴 (기존 `parallelUtils.js` 참조).

**Spec:** `docs/superpowers/specs/2026-05-05-boss-fight-ranking-design.md`

---

## File Structure

```
src/
  components/
    BossFightScene/             # 신규 — 보스전 씬
      BossFightScene.jsx
      BossFightScene.css
      bossUtils.js              # BOSS_MAX_HP, clampDamage, computeAttacksToKill
    NicknamePromptModal/        # 신규 — 닉네임 입력
      NicknamePromptModal.jsx
      NicknamePromptModal.css
    RankingScene/               # 신규 — 랭킹 표시 (after_clear / readonly)
      RankingScene.jsx
      RankingScene.css
  ranking/                      # 신규 디렉토리
    rankingRepository.js        # 인터페이스 + default export
    localStorageRanking.js      # LocalStorage 어댑터
  scenes/
    IntroScene.jsx              # 수정 — "랭킹 보기" 버튼 추가
    IntroScene.css              # 수정 — 버튼 스타일
  store/
    gameStore.jsx               # 수정 — scene 타입 확장 + 액션 추가
  App.jsx                       # 수정 — boss_fight placeholder 교체 + 신규 씬 분기
```

**책임 분리:**
- `bossUtils.js`: 보스전 순수 함수 (HP 클램프, 데미지 계산) — 단위 검증 가능
- `localStorageRanking.js`: LocalStorage I/O + 정렬/조회 — 단위 검증 가능
- `rankingRepository.js`: 어댑터 default export 한 줄. 백엔드 도입 시 이 파일만 수정
- 컴포넌트 3개: 각자 단일 책임, props로만 통신, 외부 의존성 없음
- `gameStore.jsx`: 상태 관리만. 라우팅/플로우는 App.jsx와 호출 컴포넌트가 담당

---

## Task 1: 보스전 유틸 함수 (`bossUtils.js`)

**Files:**
- Create: `src/components/BossFightScene/bossUtils.js`

순수 함수 3개. DEV assert로 자체 검증. 컴포넌트보다 먼저 작성해서 데미지 룰을 명확히 한다.

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p src/components/BossFightScene
```

- [ ] **Step 2: `bossUtils.js` 작성 (구현 + DEV assert)**

```javascript
// src/components/BossFightScene/bossUtils.js
// 보스전 핵심 룰: 누적 점수가 그대로 데미지. 점수 0/음수면 1로 클램프해 어떤 경우든 결국 클리어 가능.

export const BOSS_MAX_HP = 2000;

export function clampDamage(totalScore) {
  const n = Number(totalScore);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function computeAttacksToKill(totalScore, hp = BOSS_MAX_HP) {
  return Math.ceil(hp / clampDamage(totalScore));
}

if (import.meta.env?.DEV) {
  console.assert(clampDamage(0) === 1,        'bossUtils: 0 → 1');
  console.assert(clampDamage(-50) === 1,      'bossUtils: -50 → 1');
  console.assert(clampDamage(NaN) === 1,      'bossUtils: NaN → 1');
  console.assert(clampDamage(undefined) === 1,'bossUtils: undefined → 1');
  console.assert(clampDamage(800) === 800,    'bossUtils: 800 → 800');
  console.assert(clampDamage(800.7) === 800,  'bossUtils: 소수점 floor');
  console.assert(computeAttacksToKill(800) === 3,    'bossUtils: 2000/800 → 3회');
  console.assert(computeAttacksToKill(2000) === 1,   'bossUtils: 2000/2000 → 1회');
  console.assert(computeAttacksToKill(1) === 2000,   'bossUtils: 2000/1 → 2000회');
  console.assert(computeAttacksToKill(0) === 2000,   'bossUtils: 0 → 클램프 후 2000회');
  console.assert(BOSS_MAX_HP === 2000,               'bossUtils: BOSS_MAX_HP=2000');
}
```

- [ ] **Step 3: dev 서버에서 assert 통과 확인**

```bash
npm run dev
```

브라우저 콘솔(F12) 열어서 `import('/src/components/BossFightScene/bossUtils.js')` 실행 → 콘솔에 assert 실패 메시지가 없으면 통과. 또는 일단 import만 되고 빌드 에러 없으면 OK (다음 task에서 실제 사용).

- [ ] **Step 4: Commit**

```bash
git add src/components/BossFightScene/bossUtils.js
git commit -m "feat: 보스전 데미지 유틸 (#18)"
```

---

## Task 2: BossFightScene 컴포넌트

**Files:**
- Create: `src/components/BossFightScene/BossFightScene.jsx`
- Create: `src/components/BossFightScene/BossFightScene.css`

보스 HP 시각화 + Space 공격 + 사망 연출 + `onCleared` 콜백. 그린이/보스는 텍스트/이모지 placeholder (스프라이트는 별도 이슈).

- [ ] **Step 1: `BossFightScene.jsx` 작성**

```jsx
// src/components/BossFightScene/BossFightScene.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { BOSS_MAX_HP, clampDamage } from './bossUtils';
import './BossFightScene.css';

const HIT_ANIM_MS = 200;
const DEATH_ANIM_MS = 600;

export default function BossFightScene({ totalScore, onCleared }) {
  const [bossHP, setBossHP] = useState(BOSS_MAX_HP);
  const [phase, setPhase] = useState('fighting'); // 'fighting' | 'dying'
  const [hitTick, setHitTick] = useState(0); // 피격 애니메이션 트리거
  const damage = clampDamage(totalScore);
  const clearedRef = useRef(false);

  const attack = useCallback(() => {
    if (phase !== 'fighting') return;
    setHitTick((n) => n + 1);
    setBossHP((hp) => Math.max(0, hp - damage));
  }, [phase, damage]);

  // HP 0 도달 시 사망 연출 → onCleared
  useEffect(() => {
    if (bossHP > 0) return;
    if (clearedRef.current) return;
    clearedRef.current = true;
    setPhase('dying');
    const timer = setTimeout(() => {
      onCleared?.();
    }, DEATH_ANIM_MS);
    return () => clearTimeout(timer);
  }, [bossHP, onCleared]);

  // 키 입력: Space/Enter → 공격
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      e.preventDefault();
      attack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [attack]);

  const hpRatio = Math.max(0, bossHP / BOSS_MAX_HP);

  return (
    <div className="boss-fight-stage">
      <div className="boss-fight-hud">
        <div className="boss-fight-hp-label">
          <span>👹 BOSS HP</span>
          <span>{bossHP} / {BOSS_MAX_HP}</span>
        </div>
        <div className="boss-fight-hp-bar">
          <div
            className="boss-fight-hp-fill"
            style={{ width: `${hpRatio * 100}%` }}
          />
        </div>
      </div>

      <div className="boss-fight-arena">
        <div className="boss-fight-hero" aria-label="갑옷 그린이">
          🛡️⚔️
          <div className="boss-fight-hero-name">그린이</div>
        </div>
        <div
          className={`boss-fight-boss ${phase === 'dying' ? 'is-dying' : ''}`}
          data-hit={hitTick}
          aria-label="보스"
        >
          👹
        </div>
      </div>

      <div className="boss-fight-idle-panel">
        <p className="boss-fight-instruction">
          <b>Space</b>로 공격! (1타 데미지: <b>{damage}</b>)
        </p>
        <p className="boss-fight-tip">
          누적 점수가 그대로 데미지가 됩니다. 점수는 보존돼요.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `BossFightScene.css` 작성**

```css
/* src/components/BossFightScene/BossFightScene.css */
.boss-fight-stage {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: radial-gradient(ellipse at center, #2a0d0d 0%, #0d0508 100%);
  color: #fff;
  padding: 32px;
}

.boss-fight-hud {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}
.boss-fight-hp-label {
  display: flex;
  justify-content: space-between;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
}
.boss-fight-hp-bar {
  width: 100%;
  height: 24px;
  background: #1a1a1a;
  border: 3px solid #fff;
  overflow: hidden;
  image-rendering: pixelated;
}
.boss-fight-hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff4444 0%, #ff8800 100%);
  transition: width 200ms ease-out;
}

.boss-fight-arena {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 32px 0;
}
.boss-fight-hero {
  font-size: 96px;
  text-align: center;
  filter: drop-shadow(0 0 12px #4ade80);
}
.boss-fight-hero-name {
  font-size: 16px;
  margin-top: 8px;
  letter-spacing: 2px;
}
.boss-fight-boss {
  font-size: 144px;
  filter: drop-shadow(0 0 20px #ff4444);
  transition: transform 200ms, opacity 600ms;
}
.boss-fight-boss[data-hit] {
  animation: boss-hit 200ms;
}
@keyframes boss-hit {
  0%   { transform: translateX(0); }
  25%  { transform: translateX(-12px) rotate(-3deg); }
  50%  { transform: translateX(12px) rotate(3deg); }
  75%  { transform: translateX(-8px); }
  100% { transform: translateX(0); }
}
.boss-fight-boss.is-dying {
  opacity: 0;
  transform: scale(0.3) rotate(360deg);
  filter: drop-shadow(0 0 40px #ffff00) hue-rotate(180deg);
}

.boss-fight-idle-panel {
  text-align: center;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid #fff;
  padding: 16px;
  margin-top: 16px;
}
.boss-fight-instruction { font-size: 20px; margin: 0 0 8px; }
.boss-fight-tip { font-size: 14px; margin: 0; opacity: 0.7; }
```

- [ ] **Step 3: 빌드 에러 없는지 확인**

```bash
npm run lint
```

Expected: BossFightScene 관련 에러 없음. (아직 import하는 곳 없으니 unused 정도만 있을 수 있음 — 나중 task에서 해결)

- [ ] **Step 4: Commit**

```bash
git add src/components/BossFightScene/BossFightScene.jsx src/components/BossFightScene/BossFightScene.css
git commit -m "feat: BossFightScene 컴포넌트 (#18)"
```

---

## Task 3: 랭킹 저장소 — LocalStorage 어댑터 + 인터페이스

**Files:**
- Create: `src/ranking/localStorageRanking.js`
- Create: `src/ranking/rankingRepository.js`

저장 로직과 default export 분리. DEV assert로 정렬/등록/getRankOf 검증.

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p src/ranking
```

- [ ] **Step 2: `localStorageRanking.js` 작성**

```javascript
// src/ranking/localStorageRanking.js
// LocalStorage 기반 랭킹 어댑터.
// 인터페이스: register / getTopN / getRankOf / getEntry
// 모두 Promise 반환 — 백엔드 어댑터와 시그니처 호환.

const STORAGE_KEY = 'quickness-game.ranking.v1';

let memoryFallback = null; // localStorage 접근 실패 시 사용

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readRaw() {
  if (memoryFallback) return memoryFallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.entries)) return { entries: [] };
    return parsed;
  } catch (e) {
    console.warn('[ranking] localStorage 읽기 실패 → 메모리 fallback 사용', e);
    if (!memoryFallback) memoryFallback = { entries: [] };
    return memoryFallback;
  }
}

function writeRaw(data) {
  if (memoryFallback) {
    memoryFallback = data;
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[ranking] localStorage 쓰기 실패 → 메모리 fallback 전환', e);
    memoryFallback = data;
  }
}

function sortEntries(entries) {
  // score desc, registeredAt asc
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.registeredAt - b.registeredAt;
  });
}

export const localStorageRanking = {
  async register({ nickname, score }) {
    const entry = {
      id: generateId(),
      nickname,
      score,
      registeredAt: Date.now(),
    };
    const data = readRaw();
    const next = { entries: [...data.entries, entry] };
    writeRaw(next);
    return entry;
  },

  async getTopN(n = 10) {
    const { entries } = readRaw();
    return sortEntries(entries).slice(0, n);
  },

  async getRankOf(entryId) {
    const { entries } = readRaw();
    const sorted = sortEntries(entries);
    const idx = sorted.findIndex((e) => e.id === entryId);
    return idx === -1 ? null : idx + 1;
  },

  async getEntry(entryId) {
    const { entries } = readRaw();
    return entries.find((e) => e.id === entryId) ?? null;
  },

  // 테스트/리셋용 (DEV에서만 사용)
  __reset() {
    memoryFallback = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
  },
};

if (import.meta.env?.DEV) {
  (async () => {
    const repo = localStorageRanking;
    repo.__reset();

    // 빈 상태
    console.assert((await repo.getTopN()).length === 0, 'ranking: 빈 상태 getTopN');
    console.assert((await repo.getRankOf('none')) === null, 'ranking: 없는 id rank null');

    // 등록 + 정렬
    const e1 = await repo.register({ nickname: 'A', score: 100 });
    await new Promise((r) => setTimeout(r, 2));
    const e2 = await repo.register({ nickname: 'B', score: 200 });
    await new Promise((r) => setTimeout(r, 2));
    const e3 = await repo.register({ nickname: 'C', score: 200 }); // 동률, 늦게 등록

    const top = await repo.getTopN();
    console.assert(top.length === 3, 'ranking: 3 entries');
    console.assert(top[0].id === e2.id, 'ranking: 200점 먼저 등록한 B가 1위');
    console.assert(top[1].id === e3.id, 'ranking: 200점 동률, 등록 빠른 순으로 C가 2위');
    console.assert(top[2].id === e1.id, 'ranking: 100점 A가 3위');

    console.assert((await repo.getRankOf(e2.id)) === 1, 'ranking: B rank=1');
    console.assert((await repo.getRankOf(e3.id)) === 2, 'ranking: C rank=2');
    console.assert((await repo.getRankOf(e1.id)) === 3, 'ranking: A rank=3');

    const got = await repo.getEntry(e1.id);
    console.assert(got && got.nickname === 'A' && got.score === 100, 'ranking: getEntry');

    // getTopN(2) 제한
    const top2 = await repo.getTopN(2);
    console.assert(top2.length === 2 && top2[0].id === e2.id, 'ranking: getTopN(2)');

    repo.__reset();
    console.assert((await repo.getTopN()).length === 0, 'ranking: __reset 후 빈 상태');
  })();
}
```

- [ ] **Step 3: `rankingRepository.js` 작성**

```javascript
// src/ranking/rankingRepository.js
// 랭킹 저장소 default export.
// 백엔드 도입 시 이 파일만 수정 — 호출하는 컴포넌트는 변경 없음.
import { localStorageRanking } from './localStorageRanking';

export const rankingRepository = localStorageRanking;
```

- [ ] **Step 4: dev 서버 콘솔에서 assert 통과 확인**

```bash
npm run dev
```

브라우저 콘솔(F12)에서 `[ranking]` 또는 `Assertion failed: ranking:` 메시지가 보이면 실패. 메시지 없으면 OK.

- [ ] **Step 5: Commit**

```bash
git add src/ranking/
git commit -m "feat: 랭킹 저장소 LocalStorage 어댑터 + 인터페이스 (#18)"
```

---

## Task 4: NicknamePromptModal 컴포넌트

**Files:**
- Create: `src/components/NicknamePromptModal/NicknamePromptModal.jsx`
- Create: `src/components/NicknamePromptModal/NicknamePromptModal.css`

닉네임 입력 → trim → register → onRegistered(entryId).

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p src/components/NicknamePromptModal
```

- [ ] **Step 2: `NicknamePromptModal.jsx` 작성**

```jsx
// src/components/NicknamePromptModal/NicknamePromptModal.jsx
import { useState, useCallback } from 'react';
import { rankingRepository } from '../../ranking/rankingRepository';
import './NicknamePromptModal.css';

export const MAX_NICKNAME_LENGTH = 16; // 백엔드 도입 시 정책에 맞춰 조정

export default function NicknamePromptModal({ score, onRegistered }) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmed = nickname.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const entry = await rankingRepository.register({ nickname: trimmed, score });
      onRegistered?.(entry.id);
    } catch (e) {
      console.error('[nickname] 등록 실패', e);
      setError('등록에 실패했습니다. 다시 시도해주세요.');
      setSubmitting(false);
    }
  }, [canSubmit, trimmed, score, onRegistered]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="nickname-modal-stage">
      <div className="nickname-modal-panel">
        <h1 className="nickname-modal-title">🏆 보스 처치!</h1>
        <p className="nickname-modal-score">최종 점수: <b>{score}</b></p>
        <p className="nickname-modal-prompt">랭킹에 등록할 닉네임을 입력하세요</p>

        <input
          className="nickname-modal-input"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={MAX_NICKNAME_LENGTH}
          placeholder={`최대 ${MAX_NICKNAME_LENGTH}자`}
          autoFocus
          disabled={submitting}
        />

        {error && <p className="nickname-modal-error">{error}</p>}

        <button
          type="button"
          className="nickname-modal-submit"
          onClick={submit}
          disabled={!canSubmit}
        >
          {submitting ? '등록 중...' : '등록 (Enter)'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `NicknamePromptModal.css` 작성**

```css
/* src/components/NicknamePromptModal/NicknamePromptModal.css */
.nickname-modal-stage {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
}
.nickname-modal-panel {
  background: linear-gradient(180deg, #1b263b 0%, #0d1b2a 100%);
  border: 4px solid #fff;
  padding: 40px;
  width: min(480px, 90vw);
  text-align: center;
}
.nickname-modal-title { font-size: 36px; margin: 0 0 16px; letter-spacing: 4px; }
.nickname-modal-score { font-size: 20px; margin: 0 0 8px; }
.nickname-modal-score b { color: #ffd700; }
.nickname-modal-prompt { font-size: 14px; margin: 0 0 24px; opacity: 0.8; }
.nickname-modal-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 18px;
  background: #fff;
  color: #0d1b2a;
  border: 3px solid #fff;
  text-align: center;
  margin-bottom: 16px;
  box-sizing: border-box;
}
.nickname-modal-input:focus { outline: 2px solid #4ade80; }
.nickname-modal-error {
  color: #ff6b6b;
  font-size: 14px;
  margin: 0 0 12px;
}
.nickname-modal-submit {
  padding: 14px 32px;
  font-size: 18px;
  font-weight: bold;
  background: #4ade80;
  color: #0d1b2a;
  border: 3px solid #fff;
  cursor: pointer;
  image-rendering: pixelated;
}
.nickname-modal-submit:hover:not(:disabled) { background: #86efac; }
.nickname-modal-submit:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 4: 빌드 에러 없는지 확인**

```bash
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add src/components/NicknamePromptModal/
git commit -m "feat: NicknamePromptModal 컴포넌트 (#18)"
```

---

## Task 5: RankingScene 컴포넌트

**Files:**
- Create: `src/components/RankingScene/RankingScene.jsx`
- Create: `src/components/RankingScene/RankingScene.css`

TOP 10 + 본인 강조 (`after_clear`) / 단순 표시 (`readonly`).

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p src/components/RankingScene
```

- [ ] **Step 2: `RankingScene.jsx` 작성**

```jsx
// src/components/RankingScene/RankingScene.jsx
import { useState, useEffect } from 'react';
import { rankingRepository } from '../../ranking/rankingRepository';
import './RankingScene.css';

const TOP_N = 10;

function formatDate(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RankingScene({ mode, highlightedEntryId, onContinue, onBack }) {
  const [topEntries, setTopEntries] = useState(null);     // null=loading, []=empty
  const [myEntry, setMyEntry] = useState(null);
  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const top = await rankingRepository.getTopN(TOP_N);
      if (cancelled) return;
      setTopEntries(top);

      if (mode === 'after_clear' && highlightedEntryId) {
        const entry = await rankingRepository.getEntry(highlightedEntryId);
        const rank = await rankingRepository.getRankOf(highlightedEntryId);
        if (cancelled) return;
        setMyEntry(entry);
        setMyRank(rank);
      }
    })();
    return () => { cancelled = true; };
  }, [mode, highlightedEntryId]);

  // 키 입력
  useEffect(() => {
    const onKey = (e) => {
      if (mode === 'after_clear' && e.code === 'Enter') {
        e.preventDefault();
        onContinue?.();
      } else if (mode === 'readonly' && (e.code === 'Enter' || e.code === 'Escape')) {
        e.preventDefault();
        onBack?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, onContinue, onBack]);

  const isHighlighted = (id) =>
    mode === 'after_clear' && id === highlightedEntryId;
  const myInTop = myEntry && topEntries?.some((e) => e.id === myEntry.id);

  return (
    <div className="ranking-scene">
      <h1 className="ranking-title">🏆 랭킹</h1>

      {topEntries === null && <p className="ranking-loading">불러오는 중...</p>}

      {topEntries !== null && topEntries.length === 0 && (
        <p className="ranking-empty">아직 등록된 기록이 없습니다.</p>
      )}

      {topEntries !== null && topEntries.length > 0 && (
        <table className="ranking-table">
          <thead>
            <tr>
              <th>순위</th>
              <th>닉네임</th>
              <th>점수</th>
              <th>등록일시</th>
            </tr>
          </thead>
          <tbody>
            {topEntries.map((entry, i) => (
              <tr
                key={entry.id}
                className={isHighlighted(entry.id) ? 'ranking-row-highlight' : ''}
              >
                <td>{i + 1}</td>
                <td>{entry.nickname}</td>
                <td>{entry.score}</td>
                <td>{formatDate(entry.registeredAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {mode === 'after_clear' && myEntry && !myInTop && (
        <div className="ranking-my-row">
          <div className="ranking-my-row-label">내 순위</div>
          <table className="ranking-table ranking-table-my">
            <tbody>
              <tr className="ranking-row-highlight">
                <td>{myRank ?? '-'}</td>
                <td>{myEntry.nickname}</td>
                <td>{myEntry.score}</td>
                <td>{formatDate(myEntry.registeredAt)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="ranking-actions">
        {mode === 'after_clear' && (
          <button type="button" className="ranking-btn" onClick={onContinue}>
            계속하기 (Enter)
          </button>
        )}
        {mode === 'readonly' && (
          <button type="button" className="ranking-btn" onClick={onBack}>
            돌아가기 (Enter / Esc)
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `RankingScene.css` 작성**

```css
/* src/components/RankingScene/RankingScene.css */
.ranking-scene {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: linear-gradient(180deg, #0d1b2a 0%, #1b263b 100%);
  color: #fff;
  padding: 32px;
  overflow-y: auto;
}
.ranking-title { font-size: 40px; margin: 0 0 24px; letter-spacing: 4px; }
.ranking-loading,
.ranking-empty { font-size: 16px; opacity: 0.7; margin: 24px 0; }

.ranking-table {
  width: min(640px, 90vw);
  border-collapse: collapse;
  background: rgba(0, 0, 0, 0.4);
  border: 3px solid #fff;
  margin-bottom: 16px;
}
.ranking-table th,
.ranking-table td {
  padding: 10px 12px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 14px;
}
.ranking-table th {
  background: rgba(255, 255, 255, 0.1);
  font-weight: bold;
  letter-spacing: 2px;
}
.ranking-row-highlight {
  background: rgba(255, 215, 0, 0.25);
  font-weight: bold;
  color: #ffd700;
}

.ranking-my-row {
  margin-top: 8px;
  width: min(640px, 90vw);
}
.ranking-my-row-label {
  font-size: 14px;
  margin-bottom: 4px;
  opacity: 0.8;
  letter-spacing: 2px;
}
.ranking-table-my { margin-top: 0; }

.ranking-actions { margin-top: 24px; }
.ranking-btn {
  padding: 14px 32px;
  font-size: 18px;
  font-weight: bold;
  background: #4ade80;
  color: #0d1b2a;
  border: 3px solid #fff;
  cursor: pointer;
  image-rendering: pixelated;
}
.ranking-btn:hover { background: #86efac; }
```

- [ ] **Step 4: 빌드 에러 없는지 확인**

```bash
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add src/components/RankingScene/
git commit -m "feat: RankingScene 컴포넌트 (#18)"
```

---

## Task 6: gameStore 확장

**Files:**
- Modify: `src/store/gameStore.jsx`

`scene` 타입 확장 + `rankingMode`, `lastRegisteredEntryId` 필드 + `GO_TO_RANKING`, `SET_LAST_RANKING_ENTRY` 액션. 미사용 `bossHP` 필드 제거.

- [ ] **Step 1: `gameStore.jsx` 수정**

기존 파일 전체를 다음으로 교체:

```jsx
// src/store/gameStore.jsx
import { createContext, useContext, useReducer } from 'react';

const initialState = {
  // 'intro' | 'world' | 'minigame_1' | 'minigame_2' | 'minigame_3' | 'armor'
  // | 'minigame_4' | 'boss_fight' | 'nickname_input' | 'ranking' | 'ending'
  scene: 'intro',
  worldStage: 0,
  totalScore: 0,
  hasArmor: false,
  lastMiniScore: null,
  rankingMode: null,                // 'after_clear' | 'readonly' | null
  lastRegisteredEntryId: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'GO_TO_SCENE':
      return { ...state, scene: action.payload };
    case 'GO_TO_RANKING':
      // payload: 'after_clear' | 'readonly'
      return { ...state, scene: 'ranking', rankingMode: action.payload };
    case 'SET_LAST_RANKING_ENTRY':
      return { ...state, lastRegisteredEntryId: action.payload };
    case 'SET_WORLD_STAGE':
      return { ...state, worldStage: action.payload };
    case 'ADD_SCORE':
      return {
        ...state,
        totalScore: state.totalScore + action.payload,
        lastMiniScore: action.payload,
      };
    case 'EQUIP_ARMOR':
      return { ...state, hasArmor: true };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
```

변경 요약:
- `bossHP: 1500` 필드 제거 (외부 참조 없음 — `grep -rn "bossHP" src/`로 확인됨)
- `rankingMode`, `lastRegisteredEntryId` 신규 필드
- `GO_TO_RANKING`, `SET_LAST_RANKING_ENTRY` 신규 액션
- 주석으로 scene 타입 전체 명시

- [ ] **Step 2: 빌드 에러 없는지 확인**

```bash
npm run lint
npm run build
```

Expected: 빌드 성공. (App.jsx에서 아직 신규 액션을 dispatch하진 않지만 import 변경 없음)

- [ ] **Step 3: Commit**

```bash
git add src/store/gameStore.jsx
git commit -m "feat: gameStore에 ranking 액션/필드 추가, 미사용 bossHP 제거 (#18)"
```

---

## Task 7: App.jsx 라우팅 교체

**Files:**
- Modify: `src/App.jsx`

`boss_fight` placeholder를 `BossFightScene`으로 교체. `nickname_input`, `ranking` 분기 추가. ParallelGame의 `onContinue`는 그대로 `boss_fight`로 보내고, 보스전이 처치 콜백을 받으면 `nickname_input`으로 진행.

- [ ] **Step 1: `App.jsx` 수정**

기존 파일을 다음으로 교체:

```jsx
// src/App.jsx
import { useEffect } from 'react';
import { useGame } from './store/gameStore.jsx';
import IntroScene from './scenes/IntroScene.jsx';
import WorldScene from './scenes/WorldScene.jsx';
import PlaceholderScene from './scenes/PlaceholderScene.jsx';
import EndingScene from './scenes/EndingScene.jsx';
import TenSecondsGame from './components/TenSecondsGame/TenSecondsGame';
import ColorReactionGame from './components/ColorReactionGame/ColorReactionGame';
import CatchGame from './components/CatchGame/CatchGame';
import ParallelGame from './components/ParallelGame/ParallelGame';
import BossFightScene from './components/BossFightScene/BossFightScene';
import NicknamePromptModal from './components/NicknamePromptModal/NicknamePromptModal';
import RankingScene from './components/RankingScene/RankingScene';
import './App.css';

export default function App() {
  const { state, dispatch } = useGame();

  // armor 진입 시 갑옷 자동 장착
  useEffect(() => {
    if (state.scene === 'armor' && !state.hasArmor) {
      dispatch({ type: 'EQUIP_ARMOR' });
    }
  }, [state.scene, state.hasArmor, dispatch]);

  return (
    <div className="app-stage" key={state.scene}>
      {state.scene === 'intro' && <IntroScene />}
      {state.scene === 'world' && <WorldScene />}
      {state.scene === 'minigame_1' && (
        <TenSecondsGame
          onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
          onContinue={() => {
            dispatch({ type: 'SET_WORLD_STAGE', payload: 1 });
            dispatch({ type: 'GO_TO_SCENE', payload: 'world' });
          }}
        />
      )}
      {state.scene === 'minigame_2' && (
        <ColorReactionGame
          onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
          onContinue={() => {
            dispatch({ type: 'SET_WORLD_STAGE', payload: 2 });
            dispatch({ type: 'GO_TO_SCENE', payload: 'world' });
          }}
        />
      )}
      {state.scene === 'minigame_3' && (
        <CatchGame
          onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
          onContinue={() => {
            dispatch({ type: 'SET_WORLD_STAGE', payload: 3 });
            dispatch({ type: 'GO_TO_SCENE', payload: 'armor' });
          }}
        />
      )}
      {state.scene === 'armor' && (
        <PlaceholderScene title="🛡 갑옷 장착" description="훈련을 마친 그린이! 갑옷과 검을 손에 넣었다!"
          onContinue={() => {
            dispatch({ type: 'SET_WORLD_STAGE', payload: 4 });
            dispatch({ type: 'GO_TO_SCENE', payload: 'world' });
          }} />
      )}
      {state.scene === 'minigame_4' && (
        <ParallelGame
          onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
          onContinue={() => {
            dispatch({ type: 'SET_WORLD_STAGE', payload: 5 });
            dispatch({ type: 'GO_TO_SCENE', payload: 'boss_fight' });
          }}
        />
      )}
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
      {state.scene === 'ending' && <EndingScene />}
    </div>
  );
}
```

변경 요약:
- 신규 import 3개: BossFightScene / NicknamePromptModal / RankingScene
- `boss_fight` 분기: placeholder → BossFightScene + `onCleared` → `nickname_input`
- 신규 분기 2개: `nickname_input` (등록 후 ranking으로), `ranking` (after_clear/readonly 모드 처리)

- [ ] **Step 2: 빌드 + dev 서버 실행**

```bash
npm run build
npm run dev
```

Expected: 빌드 성공. dev 서버 정상 기동.

- [ ] **Step 3: 브라우저에서 보스전 진입 확인**

브라우저 콘솔에서 즉시 보스전 진입(전체 플레이 생략) 후 점검:

```js
// 콘솔에서 실행 — gameStore 직접 조작은 안 됨. 대신 시작 → minigame_4 진행 단축 검증은 다음 task.
// 여기서는 BossFightScene 자체 확인을 위해 몇 번 클리어 후 보스전까지 진행.
```

수동 검증:
- 인트로 → 시작 → 미니게임 4까지 빠르게 진행 (또는 직접 `dispatch GO_TO_SCENE 'boss_fight'` 트리거)
- BossFightScene 진입 시 HP 2000 표시
- Space 누를 때마다 보스 흔들림 + HP 차감
- HP 0 도달 시 보스 페이드아웃 → NicknamePromptModal 진입
- 닉네임 입력 후 등록 → RankingScene `after_clear` → 본인 강조 → "계속하기" → ending

이 단계에서 안 되는 것이 있으면 해당 컴포넌트 task로 돌아가 수정.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: App 라우터에 보스전·닉네임·랭킹 씬 분기 (#18)"
```

---

## Task 8: IntroScene "랭킹 보기" 버튼 추가

**Files:**
- Modify: `src/scenes/IntroScene.jsx`
- Modify: `src/scenes/IntroScene.css`

인트로에서 read-only 랭킹 진입.

- [ ] **Step 1: `IntroScene.jsx` 수정**

기존 파일을 다음으로 교체:

```jsx
// src/scenes/IntroScene.jsx
import { useEffect } from 'react';
import { useGame } from '../store/gameStore.jsx';
import './IntroScene.css';

export default function IntroScene() {
  const { dispatch } = useGame();

  const start = () => {
    dispatch({ type: 'SET_WORLD_STAGE', payload: 0 });
    dispatch({ type: 'GO_TO_SCENE', payload: 'world' });
  };

  const openRanking = () => {
    dispatch({ type: 'GO_TO_RANKING', payload: 'readonly' });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="intro-scene">
      <h1 className="intro-title">용사 그린이의 대모험</h1>
      <p className="intro-story">
        평화롭던 그린 왕국에 어둠의 군주가 나타나 성을 점령했다.<br />
        우리의 그린이는 아직 약하지만, 훈련을 통해 점점 강해질 수 있다.
      </p>
      <button type="button" className="intro-start-btn" onClick={start}>▶ 시작 (Space)</button>
      <button type="button" className="intro-ranking-btn" onClick={openRanking}>🏆 랭킹 보기</button>
      <p className="intro-hint">← → 이동 / Space 시작·진입</p>
    </div>
  );
}
```

변경: `openRanking` 함수 + 버튼 추가. 키 입력은 그대로 Space=시작 (랭킹 진입은 마우스 클릭 — 키 충돌 회피).

- [ ] **Step 2: `IntroScene.css` 수정 (랭킹 버튼 스타일 추가)**

기존 파일 끝에 다음 추가:

```css
.intro-ranking-btn {
  margin-top: 12px;
  padding: 10px 24px;
  font-size: 16px;
  background: transparent;
  color: #fff;
  border: 2px solid #fff;
  cursor: pointer;
  image-rendering: pixelated;
}
.intro-ranking-btn:hover { background: rgba(255, 255, 255, 0.1); }
```

- [ ] **Step 3: 브라우저 확인**

```bash
npm run dev
```

수동 검증:
- 인트로에서 "🏆 랭킹 보기" 버튼 표시
- 클릭 → RankingScene readonly 모드 진입 (등록 데이터 없으면 "아직 등록된 기록이 없습니다." 표시)
- "돌아가기" 또는 Esc → 인트로로 복귀
- Space 키는 여전히 "시작"으로 동작 (랭킹과 충돌 없음)

- [ ] **Step 4: Commit**

```bash
git add src/scenes/IntroScene.jsx src/scenes/IntroScene.css
git commit -m "feat: 인트로에 랭킹 보기 버튼 (#18)"
```

---

## Task 9: 수동 E2E 검증

**Files:** 없음 (검증만)

전체 플로우와 엣지 케이스 통합 검증. 문제 발견 시 해당 task로 돌아가 수정.

- [ ] **Step 1: dev 서버 기동**

```bash
npm run dev
```

브라우저로 접속. 콘솔(F12) 열어두기.

- [ ] **Step 2: E2E 시나리오 1 — 인트로에서 빈 랭킹 확인**

1. 새로고침
2. 인트로 → "🏆 랭킹 보기" 클릭
3. RankingScene readonly: "아직 등록된 기록이 없습니다." 표시 확인
4. "돌아가기" 또는 Esc → 인트로 복귀

Expected: 위 흐름이 끊김 없이 진행. 콘솔 에러 없음.

- [ ] **Step 3: E2E 시나리오 2 — 풀 플레이 → 보스전 → 랭킹 1회 등록**

1. 인트로 → Space로 시작
2. 미니게임 1~4 클리어 (점수가 충분히 쌓이도록 — 200점 이상 추천)
3. 보스전 진입: HP 2000, idle 패널에 "1타 데미지: NNN" 표시 확인
4. Space 연타 → 보스 흔들림 + HP 차감 + HP 0 시 페이드아웃
5. NicknamePromptModal 진입: 닉네임 입력 (예: "테스트1") → Enter
6. RankingScene `after_clear`: 1위로 본인 entry 강조 (배경 노랑) 표시 확인
7. "계속하기" → EndingScene
8. EndingScene "처음부터 (R)" → 인트로 복귀

Expected: 매 단계 정상 진행. 콘솔 에러 없음.

- [ ] **Step 4: E2E 시나리오 3 — 두 번째 등록 후 정렬 확인**

1. 인트로 → 시작 → 풀 플레이 (점수가 1번 시도와 다른 값이 되도록)
2. 보스 처치 → 닉네임 "테스트2" 입력 → 등록
3. RankingScene `after_clear`: 2개 entry 표시. 점수 내림차순 정렬. 본인 강조.
4. 인트로 복귀 → "🏆 랭킹 보기" → 두 entry 모두 readonly로 표시 (강조 없음)

Expected: 점수 높은 쪽이 1위. 동률이라면 먼저 등록한 entry가 위.

- [ ] **Step 5: E2E 시나리오 4 — 점수 0 케이스 (선택)**

가장 빠르게: 미니게임 1~4 모두 의도적으로 0점 처리 후 보스전 진입.
1. 보스전 진입 시 idle 패널 "1타 데미지: 1" 표시 확인
2. Space 2000번 연타 (또는 키 자동 반복) → 결국 HP 0 도달
3. 닉네임 등록 → 랭킹에 점수 0으로 등록됨

Expected: 패배 분기 없이 결국 클리어.

- [ ] **Step 6: 엣지 케이스 — 닉네임 검증**

1. 보스 처치 후 NicknamePromptModal 진입
2. 빈 입력 → "등록" 버튼 disabled 확인
3. 공백만 입력 (예: "   ") → trim 후 빈 → 등록 버튼 disabled
4. "그린 이" (가운데 공백) → 등록 가능 확인
5. 17자 입력 시도 → input maxLength로 16자 제한
6. 비속어 등 그대로 입력 → 정상 등록 (필터 없음)

Expected: 위 모든 케이스가 명세대로 동작.

- [ ] **Step 7: 엣지 케이스 — localStorage 차단 (선택)**

브라우저 시크릿/프라이빗 창에서 위 시나리오 재현 또는 콘솔에서:

```js
// localStorage 차단 시뮬레이션 (dev 콘솔)
Object.defineProperty(window, 'localStorage', {
  get() { throw new Error('blocked'); }
});
```

이후 등록 시도 시 콘솔에 `[ranking] localStorage 읽기 실패 → 메모리 fallback 사용` 경고 출력. 등록은 메모리에 일시 저장. 새로고침 시 사라짐.

Expected: 앱은 크래시 없이 동작, 메모리 fallback 경고만 출력.

- [ ] **Step 8: 모든 시나리오 통과 확인 후 최종 commit (변경 없으면 skip)**

수동 검증 중 발견한 수정이 있으면 해당 task로 돌아가 고친 뒤 commit. 검증만으로 변경 없으면 commit 없음.

- [ ] **Step 9: 브랜치 푸시 + PR 준비 안내**

```bash
git status
git log --oneline main..HEAD
git push -u origin "20260505_#18_PRD_3_5단계_보스전_누적_포인트_기반_랭킹_시스템_구현"
```

PR 본문은 `/pr-description` 커맨드로 별도 작성.

---

## Self-Review 결과

**Spec coverage:**
- §2 보스전 룰 → Task 1, 2 ✅
- §3 씬 흐름 / 라우팅 → Task 6, 7 ✅
- §4 컴포넌트 (BossFight/NicknameModal/RankingScene) → Task 2, 4, 5 ✅
- §5 랭킹 저장소 인터페이스 + LocalStorage → Task 3 ✅
- §6 gameStore 변경 → Task 6 ✅
- §7 인트로 변경 → Task 8 ✅
- §8 테스트 전략 → Task 1, 3 (DEV assert), Task 9 (수동 E2E) ✅
- §9 엣지 케이스 → Task 9 step 5~7 ✅
- §10 마이그레이션 (`bossHP` 제거) → Task 6 ✅

**Type/시그니처 일관성:**
- `clampDamage(totalScore)` — Task 1, 2에서 동일하게 사용
- `rankingRepository.register({ nickname, score })` — Task 3, 4에서 일치
- `getRankOf(entryId)` — Task 3, 5에서 일치
- `entry: { id, nickname, score, registeredAt }` — Task 3, 5에서 일치
- `mode: 'after_clear' | 'readonly'` — Task 5, 6, 7에서 일치
- `GO_TO_RANKING` action payload — Task 6, 7, 8에서 일치
