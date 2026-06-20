# 그린이는 나야, 둘이 될 수 없어

학교 축제 부스용 1인칭 호러 미니게임. 야자 후 혼자 남은 학교에 또 다른 내가 나타났다 — 4개의 문 너머 시련을 통과해 진짜 그린이만 살아남아야 한다.

- 장르: 1인칭 학교 호러 미니게임 (허브형)
- 러닝타임: 약 1분 55초
- 타겟: 학교 축제 방문객
- 배포: https://quickness-game.vercel.app

## 게임 플레이

키 입력 한 종류로 진행되는 단순 조작 + 타이밍 게임. 4개 스테이지 → 엔딩 → 랭킹 순으로 흐른다.

| 스테이지 | 테마 | 키 | 룰 | 만점 |
| --- | --- | --- | --- | --- |
| 1 | 괘종시계 | ← | 타이머가 10초가 되는 순간 ← 입력 (오차로 5단계 점수) | 100 |
| 2 | 반응속도 (도서관) | ↑ | 진짜 도플갱어 출현 후 짧은 시간 안에 ↑ 입력 (페이크는 무시) | 100 |
| 3 | 기억의 파편 | → | 떨어지는 진짜 기억을 원 안에서 → 캐치 (가짜는 흘려보내기) | 100 |
| 4 | 거울방 최종전 | ← ↑ → | Stage 1·2·3을 3분할로 동시 진행 후 합산 | 300 |

- 1·2·3번 문은 자유 선택, 4번 문은 1·2·3 모두 클리어해야 열린다.
- 총 600점 만점, 누적 400점 이상이면 `alive` 엔딩, 미만이면 `silhouette` 엔딩으로 분기.
- 점수 구간·타이밍 임계값 등 모든 튜닝값은 `src/scoring.js` 와 각 `src/stages/*/`의 `*.config.js` 에 외부화돼 있다.

엔딩 후 유저 ID를 입력해 점수를 등록하면 `/ranking` 에서 본인 행이 강조된 리더보드를 볼 수 있다.

## 시작하기

요구사항: Node 20.19+

```bash
git clone https://github.com/greedy-team/quickness-game.git
cd quickness-game
npm install
npm run dev
```

개발 서버: http://localhost:5173

## 환경 변수

랭킹 등록·조회 API를 사용하려면 `.env` 에 다음 두 값을 설정한다 (`.env.example` 참고).

```
VITE_API_BASE_URL=백엔드주소
VITE_API_KEY=발급된키
```

설정하지 않아도 4개 스테이지는 정상 플레이 가능하며, 엔딩 직후의 점수 등록과 랭킹 조회만 비활성화된다.

## 스크립트

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run preview    # 빌드 결과 미리보기
npm run lint       # 린트 검사
npm run test       # Vitest watch 모드
npm run test:run   # Vitest 1회 실행
```

## 프로젝트 구조

```
src/
├── routes/         # TitlePage, HubPage, StagePage, EndingPage, RankingPage
├── stages/         # stage1~4 게임 본체 + common 점수 유틸
├── components/     # ResultModal, HudOverlay, WarningModal, DialogueBox 등
├── audio/          # BGM/SFX 스토어, BgmController, useAudioVolume
├── api/            # result(점수 등록), leaderboard, users
├── store.js        # Zustand 전역 스토어 (스테이지 결과, 엔딩 분기)
├── scoring.js      # 점수 tier · 엔딩 cutoff 단일 소스
└── assets.js       # 이미지/사운드 경로 매핑
public/assets/      # 이미지, 사운드 원본
docs/PRD.md         # 기획 문서 (스토리·자산 매핑·튜닝 가이드)
```

## 기술 스택

- React 19 / Vite 8
- React Router 7 (BrowserRouter)
- Zustand 5 (전역 상태)
- Vitest 3 + Testing Library (단위/컴포넌트 테스트)
- ESLint 9 (Airbnb 스타일)
- Node 20.19+

## 저장 시 자동 lint (VSCode)

VSCode에 **ESLint 확장**만 설치하면 **Cmd+S / Ctrl+S** 누를 때 자동 수정된다.
설정 파일(`.vscode/settings.json`)은 레포에 포함돼 있어 별도 설정 불필요.

## 더 보기

- 기획서: [docs/PRD.md](docs/PRD.md)
- 변경 이력: [CHANGELOG.md](CHANGELOG.md)

---

<!-- AUTO-VERSION-SECTION: DO NOT EDIT MANUALLY -->
## 최신 버전 : v1.0.6 (2026-06-20)

[전체 버전 기록 보기](CHANGELOG.md)
