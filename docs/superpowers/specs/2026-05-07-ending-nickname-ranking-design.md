# 엔딩 컷씬 종료 후 닉네임 입력 + 랭킹 보드 설계

- 작성일: 2026-05-07
- 대상 이슈: `.issues/20260507_기능추가_엔딩_후_닉네임_입력_랭킹_등록.md` (#28)
- 브랜치: `20260507_#28_엔딩_컷씬_종료_후_닉네임_입력_랭킹_등록_화면_구현`
- 기준 PRD: `docs/PRD.md` §6 점수 시스템 / §11 부스 운영
- 선행 작업: 엔딩 컷씬 점수 분기 (#26) — `EndingPage` state machine과 outcome 라우트가 이미 존재

## 1. 목적

`#26`이 만들어 둔 `/ending/alive` · `/ending/silhouette` 컷씬과 placeholder 상태인 `/ranking`을 잇는 마지막 흐름을 채운다.

- 결말(성공/실패)에 관계없이 컷씬 종료 시점에 닉네임 입력 단계가 등장하고
- 입력된 닉네임 + 누적 점수 + outcome이 로컬 랭킹에 영속화되며
- `/ranking`이 점수 내림차순 Top 10 + 본인 행 표시로 풀 구현된다

이로써 PRD §6의 "부스 일일 랭킹 보드"와 §11 "회전율 25~28명/h"가 운영상 의미를 가지게 된다.

## 2. 범위

### In-scope

- `EndingPage` state machine에 `register` / `outro` 두 phase 추가
- `EndingNicknameForm` 컴포넌트 신규 — 결말 무관 동일 입력 흐름
- 닉네임 입력 강제 (스킵 불가, 빈 입력 거부, 길이 1–8)
- `src/ranking/` 모듈 신규 — localStorage 기반 append/조회/clear API + tunable config
- `RankingPage` 풀 구현 — Top 10 + 본인 행 별도 표시 + 자동 복귀 타이머
- 키 입력으로 컷씬·페이드 단계 즉시 스킵 (Space/Enter)
- TitlePage "랭킹 보기" 진입은 본인 하이라이트 없이 단순 보드만 노출
- 모든 튜닝 값은 `src/ranking/ranking.config.js` 단일 소스

### Out-of-scope (후속 이슈)

- 서버 동기화 / 다기기
- 비속어 필터, 닉네임 정규식 검사 (사용자 결정: "정규식 두지말고 필요할 때 추가")
- 운영자 보드 리셋 UI / 단축키 (clearRanking은 코드/콘솔로만 호출 가능)
- 시즌·일별·주별 랭킹 분리
- 랭킹 BGM/SFX
- 닉네임 중복 차단 / 동명 통합

## 3. 전체 흐름

```
Stage 4 종료
  ↓ recordResult(4, metric) (#26)
  ↓ navigate(`/ending/${outcome}`)              (#26)
  ↓
[entered → reveal → hold → leaving]              ← EndingCutscene (#26)
  ↓ (자동 또는 Space/Enter로 즉시 스킵)
  ↓ leaveMs 페이드아웃
  ↓
[register]                                        ← EndingNicknameForm (신규)
  ↓ 사용자 입력 + 제출
  ↓ rankingStore.append({nickname, score, outcome})
  ↓
[outro]                                           ← 짧은 페이드아웃 (신규)
  ↓ (자동 또는 Space/Enter로 즉시 스킵)
  ↓
navigate('/ranking', { state: { highlightId } })  ← 본인 행 식별자 전달

/ranking
  ↓ Top 10 + 본인 행 별도 (필요 시) 노출
  ↓ 약 15s 후 또는 Space/Enter
  ↓ resetGame() + navigate('/')

타이틀 화면 "랭킹 보기" 별도 경로 — 점수 등록 단계 없이 /ranking 직행, highlightId 없음
```

## 4. EndingPage state machine 확장

### 4.1 phase 정의 (기존 4 + 신규 2 = 총 6)

| phase | 컴포넌트 | 진입 조건 | 종료 조건 | 키 입력 |
|---|---|---|---|---|
| entered | EndingCutscene (opacity 0) | 마운트 | 즉시 (RAF) | — |
| reveal | EndingCutscene (페이드인) | entered 후 | revealMs 경과 | Space/Enter → leaving |
| hold | EndingCutscene (정지) | reveal 후 | holdMs 경과 | Space/Enter → leaving |
| leaving | EndingCutscene (페이드아웃) | hold 후 또는 키 | leaveMs 경과 | Space/Enter → leaving (no-op) |
| register | EndingNicknameForm | leaving 후 | 사용자 제출 | Enter = 제출 |
| outro | (검정 화면 + 짧은 페이드) | register submit 후 | outroMs 경과 | Space/Enter → /ranking 즉시 |

### 4.2 키 입력 일관 정책

- **컷씬 단계 (reveal · hold)**: Space/Enter → 즉시 `leaving` 진입 (기존 #26 동작 유지)
- **leaving**: 페이드아웃이 짧으므로(500ms) 추가 스킵 없음
- **register**: 폼 내부 입력. Enter는 제출(브라우저 form submit과 일치). Space는 폼 안에서 닉네임 문자로 처리.
  - 즉, register phase에서는 윈도우 레벨 keydown listener를 끄고 폼 내부 onSubmit만 사용
- **outro**: Space/Enter → 즉시 `/ranking` 진입 (대기 시간 0)

이로써 사용자가 한 손가락만 두드리면 (혹은 가만히 있어도) 모든 단계가 진행됨.

### 4.3 EndingPage.jsx 책임 분배

```
EndingPage (호스트)
 ├─ phase === 'entered' | 'reveal' | 'hold' | 'leaving'
 │     → <EndingCutscene outcome phase totalScore />
 ├─ phase === 'register'
 │     → <EndingNicknameForm
 │          outcome
 │          totalScore
 │          onSubmit={(nickname) => {
 │            const entry = appendRankingEntry({nickname, score: totalScore, outcome});
 │            setHighlightId(entry.id);
 │            setPhase('outro');
 │          }}
 │        />
 └─ phase === 'outro'
       → <div className="ending-page__outro" />  (검정 페이드, 컴포넌트 분리 불필요)
```

`leaving → register`, `register → outro`, `outro → /ranking` 전이는 기존 #26 패턴(`useEffect`로 phase별 분기) 재사용.

## 5. EndingNicknameForm 컴포넌트

### 5.1 책임

- 닉네임 입력 폼 단일 책임 (presentational + 약간의 검증 로직)
- 검증 결과 부적합이면 제출 버튼 비활성화 / 헬퍼 텍스트 표시
- 부모(EndingPage)가 onSubmit 콜백으로 닉네임 받음

### 5.2 props

```
{
  outcome: 'alive' | 'silhouette',
  totalScore: number,
  onSubmit: (nickname: string) => void,
}
```

### 5.3 검증 규칙 (이번 이슈)

- `trim()` 후 길이가 `nicknameMinLength` (1) 이상 `nicknameMaxLength` (8) 이하
- 그 외 문자 검증 없음 (정규식 없음 — 추후 필요 시 추가)
- 빈 입력은 거부 (제출 버튼 disabled)

### 5.4 UI 구조

```
┌────────────────────────────────┐
│   기록을 남겨주세요              │
│                                │
│   결말: ⭐ 살아남았다 / 👻 잠식  │
│   점수: 720                     │
│                                │
│   [ 닉네임 입력 (8자) ........]  │  ← 자동 포커스
│                                │
│         [  등록 (Enter)  ]      │
└────────────────────────────────┘
```

- 입력 즉시 자동 포커스 (`autoFocus`)
- IME 한글 입력 충돌 방지 — `composition` 이벤트는 무시하고 `onChange`만 받음 (필요 시)
- Enter 키 = form submit (네이티브 폼 동작)
- 등록 후 폼 비활성 → 부모가 phase 'outro'로 전이

### 5.5 부스 가독성

- 입력 박스 큰 글씨 (28px+), 한국어 placeholder
- 결말 라벨 / 점수 큰 글씨로 보조 (재확인용)
- 폼 자체 페이드인 (revealMs 절반 정도, 예: 500ms)

## 6. ranking 모듈 (`src/ranking/`)

### 6.1 파일 구조

```
src/ranking/
├── rankingStore.js     # localStorage 어댑터 + public API
└── ranking.config.js   # 모든 tunable
```

`store.js`(zustand)와 분리 — 게임 진행 상태와 영속 보드 데이터는 책임이 다름.

### 6.2 ranking.config.js

```js
export const RANKING_CONFIG = {
  // 닉네임
  nicknameMinLength: 1,
  nicknameMaxLength: 8,

  // 보드
  topN: 10,

  // 자동 복귀
  autoReturnMs: 15000,

  // 결말 라벨 (보드 표시용)
  outcomeLabels: {
    alive:      '⭐ alive',
    silhouette: '👻 silhouette',
  },

  // 저장소
  storageKey: 'quickness-game.ranking.v1',
  storageCap: 200,
};
```

### 6.3 rankingStore.js public API

```js
// 추가 — 부적합 입력은 호출자(폼)에서 차단되므로 여기서는 길이 재검증 + outcome 화이트리스트만.
appendRankingEntry({ nickname, score, outcome })
  → returns { id, nickname, score, outcome, ts }
  → 내부: id 생성, storageCap 초과 시 가장 오래된 것 1개 truncate, JSON 저장

// 조회 — 항상 정렬된 결과 반환
getRankingEntries()
  → returns Array<Entry> sorted by (score desc, ts asc)

// 운영자 전용 — UI 노출 X
clearRanking()
  → 저장소 비움
```

### 6.4 ID 생성 규칙

```
id = `${ts}-${random4hex}`
ts = Date.now()
random4hex = (16비트 무작위) → '0000' ~ 'ffff'
```

동일 ms에 두 entry 생성 가능성을 1/65536로 줄임. UUID 라이브러리 도입은 YAGNI.

### 6.5 에러 처리

- `localStorage` 접근 불가 (private 모드, disabled, quota) → 콘솔 경고 + 모듈 내부 in-memory array를 사용. 게임 진행은 절대 막지 않음.
- JSON parse 실패 → 손상 데이터 무시, 빈 배열로 시작 + 콘솔 경고. 다음 append 시 새 array로 덮어씀(자가 치유).
- `outcome`이 `'alive'`·`'silhouette'` 외 값 → 무시(silhouette로 기본값) + 콘솔 경고.

### 6.6 storageCap 정책

- append 시 `entries.length > storageCap`이면 가장 오래된(`ts` 가장 작은) 항목 1개 제거
- Top 10 표시에는 영향 없음 (어차피 보드는 정렬된 상위 10개만 봄)
- 1차안 200 — `ranking.config.js` 한 줄 조정. 부스 회전율 관찰 후 늘리거나 줄일 수 있음

## 7. RankingPage 풀 구현

### 7.1 마운트 시점 동작

```
1) location.state.highlightId 추출 (없으면 null)
2) const entries = getRankingEntries()
3) const top = entries.slice(0, RANKING_CONFIG.topN)
4) const myEntry = entries.find(e => e.id === highlightId) ?? null
5) const myInTop = top.some(e => e.id === highlightId)
6) 자동 복귀 타이머 시작
7) Space/Enter listener 설치 — 즉시 복귀
```

### 7.2 본인 행 표시 규칙

| 상황 | 표시 |
|---|---|
| 타이틀에서 "랭킹 보기"로 진입 (`highlightId === null`) | Top 10만 표시. 본인 별도 행 없음. |
| 엔딩 흐름 진입 + Top 10 안에 들어감 | 해당 행에 강조 스타일. 별도 행 없음. |
| 엔딩 흐름 진입 + Top 10 밖 | Top 10 표시 + 보드 아래 "내 기록: N위 — 닉 점 결말" 단일 행 |

### 7.3 UI 스케치

```
┌────────────────────────────────────┐
│        🏆 RANKING BOARD             │
├──────┬──────────┬──────┬────────────┤
│ 순위 │ 닉네임   │ 점수 │ 결말        │
├──────┼──────────┼──────┼────────────┤
│  1   │ 그린이짱 │ 720  │ ⭐ alive    │   ← 일반 행
│  2   │ 홍길동   │ 700  │ ⭐ alive    │   ← 본인 일치 시 강조
│ ...                                  │
│ 10   │ 도전자   │ 220  │ 👻 silh.   │
├──────┴──────────┴──────┴────────────┤
│  내 기록: 14위 — 그린이팬 180 (👻)   │   ← Top 10 밖일 때만
└────────────────────────────────────┘
   [Space/Enter 또는 15s 후 타이틀]
```

### 7.4 자동 복귀

```
useEffect(() => {
  const id = setTimeout(() => {
    resetGame();
    navigate('/');
  }, RANKING_CONFIG.autoReturnMs);
  return () => clearTimeout(id);
}, []);

useEffect(() => {
  const handle = (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      resetGame();
      navigate('/');
    }
  };
  window.addEventListener('keydown', handle);
  return () => window.removeEventListener('keydown', handle);
}, []);
```

`resetGame()` 호출은 zustand store의 stageResults / hasUserStarted 초기화. 다음 플레이어가 타이틀에서 시작 누르면 깨끗한 상태에서 시작.

### 7.5 동점 처리 (UI에서의 표시)

`getRankingEntries()`가 이미 `score desc, ts asc`로 반환하므로 보드 순위는 자연스럽게 결정됨. 동점이라도 같은 순위 표시는 하지 않음(1, 2, 3...로 단조 증가) — 부스 가독성 우선.

## 8. ending.config.js 변경

phase 추가에 따른 timing 추가만. 기존 키는 그대로.

```js
// 기존
revealMs, holdMs, leaveMs, captions, assetsByOutcome

// 신규
formRevealMs:  500,   // EndingNicknameForm 페이드인
outroMs:       400,   // register 제출 후 검정 페이드아웃
```

## 9. 폴더 구조 (이번 이슈 완료 시점)

```
src/
├── ranking/                                # 신규 디렉터리
│   ├── rankingStore.js                     # localStorage 어댑터 + API
│   └── ranking.config.js                   # tunable
├── routes/
│   ├── EndingPage/
│   │   ├── EndingPage.jsx                  # state machine 확장 (register/outro)
│   │   ├── EndingPage.css                  # outro 페이드 스타일 추가
│   │   ├── EndingCutscene.jsx              # 변경 없음 (#26)
│   │   ├── EndingCutscene.css              # 변경 없음
│   │   ├── EndingNicknameForm.jsx          # 신규
│   │   ├── EndingNicknameForm.css          # 신규
│   │   └── ending.config.js                # formRevealMs / outroMs 추가
│   └── RankingPage/
│       ├── RankingPage.jsx                 # 풀 구현
│       └── RankingPage.css                 # 풀 구현
└── routes/TitlePage/                       # 변경 없음 ("랭킹 보기" 동작 유지)
```

## 10. 데이터 흐름

```
[엔딩 컷씬 진입]
  EndingPage
    outcome: 'alive' | 'silhouette' (URL → prop)
    totalScore: useGameStore(selectTotalScore)
    phase: 'entered' → 'reveal' → 'hold' → 'leaving'

[register]
  EndingNicknameForm
    nickname (local state)
    onSubmit:
      const trimmed = nickname.trim();
      if (1 <= trimmed.length <= 8) {
        const entry = appendRankingEntry({
          nickname: trimmed, score: totalScore, outcome
        });
        setHighlightId(entry.id);  // EndingPage 로컬 state
        setPhase('outro');
      }

[outro → /ranking]
  navigate('/ranking', { state: { highlightId } })

[RankingPage]
  highlightId = location.state?.highlightId ?? null
  entries = getRankingEntries()
  → render
  → 15s 또는 키 → resetGame() + navigate('/')
```

## 11. 검증 시나리오

### 시나리오 #1: 성공 엔딩 → 등록 → Top 10 진입

```
1) Stage 4 끝 후 alive 엔딩 컷씬 정상 노출
2) 자동 또는 Space로 leaving 진입 → 페이드아웃
3) register phase: EndingNicknameForm 페이드인
4) "그린이짱" 입력 → Enter
5) outro 짧은 검정 페이드 → /ranking
6) Top 10에 본인 행 강조 표시
7) 15s 또는 Space/Enter → 타이틀
```

### 시나리오 #2: 실패 엔딩 → 등록 → Top 10 밖

```
1) silhouette 엔딩 컷씬
2) 입력 진행은 동일
3) /ranking 진입 시 Top 10 밖 → 보드 아래 "내 기록: N위 — ..." 별도 행 노출
4) Top 10 영역에는 본인 행 없음
```

### 시나리오 #3: 빈 입력 거부

```
1) register phase에서 닉네임 비워두고 Enter
2) form은 submit 안 됨 (button disabled + 폼 native validation)
3) 사용자가 어떤 글자라도 입력하면 등록 가능
```

### 시나리오 #4: 8자 초과 입력

```
1) 닉네임 박스 maxLength=8
2) 9번째 문자 차단 (브라우저 native maxLength 사용)
3) trim 후 재검증 (앞뒤 공백 제거 후 1~8자 보장)
```

### 시나리오 #5: 타이틀 → "랭킹 보기" → 보드만 노출

```
1) 타이틀에서 "랭킹 보기" → /ranking
2) location.state.highlightId === null
3) Top 10만 표시. 본인 행 없음.
4) 자동 복귀 또는 Space/Enter → 타이틀
```

### 시나리오 #6: localStorage 비활성

```
1) private/incognito 또는 quota 가득 상태
2) appendRankingEntry 호출 시 catch → in-memory fallback array에 push
3) 같은 세션 내에서는 보드 노출 정상
4) 새 세션에서는 빈 보드 (영속화 X)
5) 콘솔 경고 1회. 게임 진행 영향 없음.
```

### 시나리오 #7: 키 입력 일관성

```
- reveal/hold: Space/Enter → 즉시 leaving
- leaving: 추가 스킵 없음 (짧은 fade)
- register: Space는 닉네임 문자, Enter는 form submit
- outro: Space/Enter → 즉시 /ranking
- /ranking: Space/Enter → 즉시 타이틀
```

### 시나리오 #8: storageCap 초과

```
1) 200개 누적된 상태에서 새 entry append
2) 가장 오래된 1개 제거 + 새 entry 추가
3) 길이 200 유지
4) Top 10 표시에 영향 없음
```

### 시나리오 #9: resetGame 후 재플레이

```
1) /ranking에서 타이틀 복귀 → resetGame
2) stageResults 모두 null + hasUserStarted false
3) 새 플레이 진행 → 새 totalScore + 새 entry 등록
4) 보드에는 직전 entry와 새 entry 모두 존재 (영속됨)
```

## 12. 위험 요소

| 위험 | 영향 | 대응 |
|---|---|---|
| IME(한글) 조합 중 Enter가 form submit 트리거 | 미완성 닉네임으로 등록 | `composition` 이벤트 중에는 submit 무시 또는 IME 닫힘 보장 (IME 상태가 끝난 직후 Enter만 submit). 가벼운 onCompositionEnd 가드 |
| localStorage quota 초과 | append 실패 | in-memory fallback. storageCap으로 사이즈 관리 |
| 서로 다른 PC에서 보드 분리됨 | 부스 운영 시 PC 다르면 데이터 분산 | 본 이슈 범위 — 단일 PC 가정. 후속 이슈에서 서버 동기화 |
| outcome 라벨 이모지 폰트 미지원 | ⭐/👻 깨짐 | 텍스트 fallback 라벨 검토 (라벨은 config로 외부화되어 있어 1줄 수정으로 변경 가능) |
| storageCap 200이 부스 회전율과 불일치 | 가장 오래된 기록 잘림 | config 한 줄 조정. 1차안 200 = 1일 안전. |
| 자동 복귀 15s가 짧음 / 김 | 회전율 ↓ 또는 ↑ | config 한 줄 조정 |
| 한 플레이어가 무한 재플레이로 보드 점유 | 다른 플레이어 가시성 ↓ | 본 이슈 범위 — 동명 통합/IP 제한은 후속 |

## 13. 완료 정의

- [ ] `src/ranking/rankingStore.js` + `ranking.config.js` 작성, public API 동작
- [ ] `EndingNicknameForm.jsx` + CSS 작성, 검증 규칙(1–8자, trim, 빈 거부) 동작
- [ ] `EndingPage.jsx` state machine 확장 (register / outro phase) + 키 입력 일관 정책
- [ ] `RankingPage.jsx` 풀 구현 (Top 10 + 본인 행 + 자동 복귀)
- [ ] `RankingPage.css` 보드 가독성 스타일
- [ ] `ending.config.js`에 `formRevealMs` / `outroMs` 추가
- [ ] 시나리오 #1~#9 수동 검증 통과
- [ ] `npm run build` 통과
- [ ] git history phase별 커밋 분리 (config·store·form·EndingPage 확장·RankingPage)

## 14. 후속 이슈 분리

- 운영자 보드 리셋 UI / 단축키 (`clearRanking`을 노출하는 UI)
- 서버 동기화 (다기기 통합 보드)
- 비속어 필터 / 닉네임 정규식
- 시즌·일별·주별 보드 분리
- 동명 통합 또는 IP 기반 1인 1회 제한
- 랭킹 BGM/SFX
