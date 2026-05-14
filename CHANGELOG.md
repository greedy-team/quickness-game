# Changelog

**현재 버전:** 0.0.32  
**마지막 업데이트:** 2026-05-14T01:46:58Z  

---

## [0.0.32] - 2026-05-14

**PR:** #47  

**새 기능**
- Stage3 HUD 좌상단에 기회 횟수 표시 #42
- HudOverlay stage 라우트 score 표시 제거 #42
- 결과 모달 키 입력 진행 + headline/tierComment 제거 + 점수표 강조
- ResultModal 공통화 및 600점 만점 점수 체계 개편
- InfoModal 스테이지 목록 제거 및 게임 소개 텍스트로 교체 #39
- InfoModal 공포 테마 UI - 빨간 텍스트 플리커 + 혈흔 글로우 #39
- InfoModal 반응형 크기 확대 #39
- InfoModal 크기/텍스트 확대, 화살표 펄스 애니메이션, HUD 아이콘 버튼 컨테이너 제거 #39
- Stage4 완료 후 /hub 복귀 + ScoreTable 제거 #39
- HudOverlay 리디자인 - 점수 텍스트 + 아이콘 버튼 #39
- InfoModal 컴포넌트 추가 - 게임 설명 모달 #39

**버그 수정**
- Stage3 missedCount 2배 버그 수정 및 → 프레스 소진 시 즉시 게임 종료 #42
- InfoModal 두 번째 문단 줄바꿈 추가 #39
- InfoModal backdrop pointer-events 상속 버그 수정 #39

**개선**
- CatchZone 키 표시 및 힌트 문구 제거 #42
- CatchZone 밴드/점선 제거, 황금선만 두껍게 (6px) #42
- CatchZone 안내 문구 — 키 좌측 표시, 황금선 타이밍 워딩으로 변경 #42
- CatchZone y축 위치 50% → 70% #42
- Stage3Game ResultModal breakdown catch/miss 단순화 #42
- FallingItem kind prop 제거, fake CSS 정리 #42
- Stage3Field fake 제거, catch/miss 단순화, zone 70% #42
- Stage3 config 단순화 — accuracyTiers/fake 제거, catchPoints 추가 #42

**문서**
- Stage3 단순화 구현 플랜 추가 #42
- Stage3 단순화 및 score UI 제거 설계 스펙 추가 #42
- HUD overlay 리디자인 스펙 추가 #39

**기타**
- Merge pull request #46 from greedy-team/20260513_#43_결과_모달_제거_및_점수_팝업_방식으로_변경
- refactor : stage 1~3 phase명 통일 및 key-hint 표시 시점 수정 #43
- test : alive 결말 진입 기준 점수 400으로 수정 #43
- Merge pull request #45 from greedy-team/20260513_#43_결과_모달_제거_및_점수_팝업_방식으로_변경
- docs : 설계 문서 및 리포트 작성 #43
- style : AudioControls stage 화면에서 숨김 및 key-hint 스타일 추가 #43
- feat : 엔딩·랭킹 개선 #43
- feat : Stage4 각 pane 결과 정보 및 MergeOverlay 점수 합산 표시 #43
- feat : Stage3 카운트다운 추가 및 아이템 낙하 속도 랜덤화 #43
- fix : Stage2 결과 모달 score 누락 수정 및 split 모드 결과 표시 추가 #43
- fix : Stage1 결과 모달 범위 표시 exclusive 범위로 수정 및 측정값 단순화 #43
- style : ResultModal 크기 개선 (InfoModal 수준으로 확대) #43
- Merge branch 'main' of https://github.com/greedy-team/quickness-game
- docs : 문서 작성
- Merge pull request #44 from greedy-team/20260513_#42_스테이지_score_표시_제거_및_Stage3_게임로직_단순화
- docs : 이슈 문서 작성 #42
- Merge pull request #41 from greedy-team/20260513_#39_사이드_UI_개편_점수_텍스트화_및_아이콘_버튼_추가
- docs : 설계 파일 업로드 #39
- feat : 결과 모달 티어 범위 포맷 실측값 기준으로 변경 및 score 표시 제거 #39
- style : ResultModal 투명도 제거, 모달 크기 확대, score 조건부 렌더링 #39
- fix : STAGE_SCORE_TIERS 경계값 metric 정렬로 bare 티어 점수 오류 수정 #39
- lucide-react 설치 #39

---

## [0.0.27] - 2026-05-11

**PR:** #38  

**새 기능**
- 점수 `현재/최대` 포맷 통일 + Stage 4 sub-pane 합산 + 가중치 안내 #36
- 결과 모달 점수 획득 내역 + Raw 점수 누적 + 자동/스킵 진행 #36
- App 에 AudioControls 마운트 #36
- AudioControls 우상단 popover 컴포넌트 #36
- playSfx 일회성 SFX 헬퍼 도입 #36
- useAudioVolume 셀렉터 훅 도입 #36
- useAudioStore (zustand + localStorage persist) 도입 #36
- ScoreTable 만점·생존선 요약 라인 추가 #36
- 점수 막대와 생존선 분기점 표시 #36
- TOTAL_MAX_SCORE 상수 도입 #36

**버그 수정**
- 데드 코드 및 aria 의미 충돌 정리 #36

**개선**
- typing tick 이 useAudioVolume(sfx) 구독 #36
- SFX 가 store 볼륨 사용 #36
- openDoor SFX 가 playSfx 사용 #36
- BGM/jumpscare SFX 가 store 볼륨 사용 #36
- BGM 이 useAudioVolume 구독 #36
- BGM + SFX 가 useAudioVolume / playSfx 사용 #36
- heartbeat BGM 이 useAudioVolume 구독 #36
- BgmController 가 useAudioVolume 구독 #36

**문서**
- 사운드 컨트롤 UI 구현 플랜 작성 #36
- 사운드 컨트롤 UI 디자인 스펙 작성 #36
- 점수 표시 UI 구현 플랜 작성 #36
- 점수 표시 UI(만점/생존선) 디자인 스펙 작성 #36

**기타**
- Merge pull request #37 from greedy-team/20260511_#36_점수_표기_및_사운드_컨트롤_UI_추가
- docs : 리포트 문서 작성 #36
- 엔딩 cutoff 700 → 1000 (만점 2240 비율 보정) #36

---

## [0.0.26] - 2026-05-10

**PR:** #35  

**새 기능**
- OG 메타 태그 및 호러 테마 favicon 적용
- TitlePage에 WarningModal 통합 — 홈 진입 시마다 동의 모달 표시
- WarningModal 스타일링 (백드롭, 카드, 애니메이션)
- WarningModal 마운트 시 동의 버튼 자동 포커스
- WarningModal 컴포넌트 골격 및 경고 항목 표시

**버그 수정**
- WarningModal 광과민성 주의 항목 별도 줄로 분리

**문서**
- 홈 화면 공포 경고 모달 구현 계획 추가
- 홈 화면 공포 경고 모달 디자인 스펙 추가

**기타**
- Merge branch 'main' of https://github.com/greedy-team/quickness-game
- Vercel 배포 워크플로우 및 SPA rewrite 설정
- WarningModal ESC 키 무시 검증
- WarningModal 동의 버튼 클릭 콜백 검증

---

