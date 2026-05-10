# 홈 화면 공포 콘텐츠 경고 모달 — 디자인 스펙

**작성일:** 2026-05-11
**대상 화면:** `/` (TitlePage)
**관련 컴포넌트:** `src/routes/TitlePage/TitlePage.jsx`

---

## 1. 배경 및 목적

`그린이는 나야, 둘이 될 수 없어`는 학원 호러 게임으로 다음과 같은 공포 연출을 포함한다:

- 점프스케어 (`cutscene_jumpscare.mp3/png`, `stage2_sfx_jumpscare.mp3`)
- 큰 효과음 (`stage2_sfx_shutter.mp3`, 11MB의 정적 BGM)
- 화면 글리치 연출 (`stage2_sfx_glitch.mp3`)
- 심장박동음 등 청각적 압박 (`heartbeat_10s.mp3`)
- 학원 괴담 트로프 (어두운 복도, 화장실, 도플갱어)

현재 홈 화면에는 어떠한 사전 경고도 없어, 공포 콘텐츠에 민감하거나 광과민성을 가진 사용자가 무방비로 노출될 수 있다. 본 스펙은 게임 시작 전 사용자가 콘텐츠 특성을 인지하고 동의한 뒤 진행하도록 하는 경고 모달을 정의한다.

## 2. 요구사항

| 항목 | 결정 |
|---|---|
| 표시 방식 | 시작 전 동의 모달 (강제) |
| 표시 빈도 | 홈 `/` 진입 시마다 (저장 없음) |
| 모달 범위 | 전체 차단 — 시작·랭킹 버튼 모두 비활성 |
| 경고 항목 | 점프스케어 / 광과민성 / 이어폰 볼륨 / 12세 권장 |
| 톤 | 담담하고 진지하게 |

표시 빈도가 "매번"인 이유: 게임이 외부에 공유되어 매번 다른 사용자가 진입할 가능성이 높아, 개별 브라우저 단위 동의 기록은 의미가 없음.

## 3. 아키텍처

### 파일 구조

```
src/components/WarningModal/
├── WarningModal.jsx       # 프리젠테이셔널 컴포넌트 (props만 받음)
├── WarningModal.css       # 모달 스타일
└── WarningModal.test.jsx  # 단위 테스트
```

### TitlePage 변경

```jsx
import { useState } from 'react';
import WarningModal from '../../components/WarningModal/WarningModal.jsx';

export default function TitlePage() {
  const [showWarning, setShowWarning] = useState(true);
  // ... 기존 로직 그대로

  return (
    <div className="title-page" style={{...}}>
      {/* 기존 시작/랭킹 버튼 */}
      {showWarning && <WarningModal onAgree={() => setShowWarning(false)} />}
    </div>
  );
}
```

### WarningModal API

```jsx
function WarningModal({ onAgree })
```

- 단일 prop `onAgree: () => void` — 동의 버튼 클릭 시 호출
- 내부 상태 없음. 모든 표시/닫기 로직은 부모(TitlePage)가 제어
- ESC 키 / 백드롭 클릭으로 닫히지 않음 (강제 차단 의도)
- 마운트 시 "동의하고 시작" 버튼에 자동 포커스

### 상태 흐름

1. TitlePage 마운트 → `showWarning = true` → 모달 자동 표시
2. 백드롭 fixed positioning + `z-index: 9999`로 시작/랭킹 버튼 위 덮어 pointer-events 차단
3. "동의하고 시작" 클릭 → `setShowWarning(false)` → 모달 사라짐, 타이틀 사용 가능
4. 다른 라우트로 이동 후 `/`로 다시 오면 컴포넌트 재마운트 → `useState` 초기값 `true`로 다시 표시

## 4. 문구 카피

```
⚠ 시작 전 안내

본 게임은 공포 콘텐츠를 포함합니다.

· 점프스케어와 갑작스러운 큰 효과음이 나옵니다
· 일부 장면에 깜빡이는 화면 연출이 포함됩니다 (광과민성 발작 주의)
· 이어폰 사용 시 볼륨을 미리 낮춰 주세요
· 12세 이상에게 권장합니다

         [ 동의하고 시작 ]
```

## 5. 비주얼 스타일

| 요소 | 스타일 |
|---|---|
| 백드롭 | `rgba(0,0,0,0.85)` 전체 덮음, 클릭 무시 |
| 모달 박스 | 어두운 카드 (`#1a1a1a`), 흰색 1px 테두리, 둥근 모서리 8px, 가로 max 480px |
| 제목 ⚠ | 빨간색 강조 (`#ff4444`), 굵게 |
| 본문 | 흰색, 줄간격 1.6, 좌측 정렬 (목록은 `·` 들여쓰기) |
| 동의 버튼 | 기존 `.title-page__btn` 와 동일 톤 (검정 배경, 호버 시 `#00ffcc` 네온) |
| 진입 애니메이션 | 백드롭 페이드인 200ms, 카드 짧은 scale-up (0.95 → 1) |

## 6. 접근성

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`로 제목 참조
- 마운트 시 동의 버튼에 자동 포커스 (`useRef` + `useEffect`)
- ESC 키 닫기 비활성화 (강제 차단 의도 유지)
- 본문 텍스트 색상 대비 WCAG AA 이상 (흰색 vs `#1a1a1a` → 충분)

## 7. 테스트 (`WarningModal.test.jsx`)

Vitest + React Testing Library:

1. 렌더링 시 4가지 경고 항목이 모두 표시되는지
2. "동의하고 시작" 버튼 클릭 시 `onAgree` 콜백 호출되는지
3. ESC 키로는 닫히지 않는지 (`onAgree` 호출 안 됨 검증)
4. 마운트 시 동의 버튼에 자동 포커스되는지

TitlePage 통합 테스트는 추가하지 않음 — 기존 TitlePage에 테스트 파일이 없고, 단순 토글 로직이라 모달 단위 테스트로 충분.

## 8. 범위 제외 (Out of Scope)

- 동의 기록 저장 (localStorage / 서버) — 매번 표시 정책으로 명시적으로 제외
- 게임 내 다른 화면(스테이지 진입 시점)의 경고 — 본 스펙은 홈 화면 한정
- i18n / 영어 버전 — 현재 한국어 단일 지원 가정
- 사용자별 경고 항목 커스터마이즈 — YAGNI
