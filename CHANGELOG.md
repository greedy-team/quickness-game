# Changelog

**현재 버전:** 0.0.27  
**마지막 업데이트:** 2026-05-11T11:57:41Z  

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

