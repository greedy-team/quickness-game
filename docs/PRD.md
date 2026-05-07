## 1. 프로젝트 개요

| 항목 | 내용 |
| --- | --- |
| **제목** | 그린이는 나야, 둘이 될 수 없어 |
| **장르** | 1인칭 학교 호러 미니게임 (허브형) |
| **러닝타임** | 약 1분 55초 |
| **타겟** | 학교 축제 방문객 |

---

## 2. 컨셉 & 스토리

> *"학교에 남은 밤, 또 다른 내가 나타났다. 가짜를 없애러 4개의 문을 연다."*
> 

야자 후 혼자 남은 학교 → 또 다른 나의 출현 → 복도 끝 4개의 문 → 각 문 안의 시련 → 거울방 최종전 → 진짜 그린이만 생존

---

## 3. 허브 시스템 — "선택의 방"

- **배경:** `bg_hub_corridor.png` (문 4개 배치된 복도)
- **문 에셋:** `door.png` / `door_clear.png`
- **진행:** 1~3번 자유 선택 → 4번은 1·2·3 클리어 시 자동 개방

### 문 상태별 에셋

| 상태 | 사용 에셋 |
| --- | --- |
| **활성** | `door.png` |
| **클리어** | `door_clear.png` |
| **잠김 (4번)** | `door.png` + 어둡게 처리 |
| **개방 (4번)** | `door.png` + 열림 애니메이션 |

---

## 4. 게임 구성

> ⚠️ **모든 점수 구간은 다단계로 세분화되며, 플레이테스트 후 조정 가능**
> 

### 🎯 STAGE 1 — 괘종시계 (1번 문)

| 항목 | 상세 |
| --- | --- |
| **메커닉** | ← 왼쪽 방향키 |
| **룰** | 종소리 9회(1초 간격) → 정적 1초 → 10초째에 ← |
| **점수 (다단계, 가변)** | 오차 범위별 점수 차등 부여 (예: ±0.05·±0.1·±0.2·±0.3·±0.5초 등 다구간) |
| **소요시간** | 약 20초 |

### ⚡ STAGE 2 — 반응속도 (2번 문)

| 항목 | 상세 |
| --- | --- |
| **메커닉** | ↑ 위쪽 방향키 |
| **룰** | 눈동자 빛나는 순간 입력 (페이크 2~3회) |
| **점수 (다단계, 가변)** | 반응시간별 점수 차등 부여 (다구간) |
| **소요시간** | 약 20초 |

### 🎁 STAGE 3 — 캐치 (3번 문)

| 항목 | 상세 |
| --- | --- |
| **메커닉** | → 오른쪽 방향키로 캐치 (가짜는 누르지 않고 흘려보내기) |
| **아이템 구성** | 진짜 기억 4개 + 가짜 기억 2개 (총 6개, 비율 가변) |
| **점수 (5단계, 가변)** | 캐치 시 정확도 tier — 완벽 100 / 훌륭 80 / 좋아 60 / 통과 40 / 아슬 20 |
| **페널티** | 가짜 캐치 시 -50점, 진짜 미캐치 시 0점 |
| **소요시간** | 낙하 시퀀스 약 10초 (인트로 / 결과 화면 별도) |

### 🪞 STAGE 4 — 거울방 합체 (4번 문, 최종)

| 항목 | 상세 |
| --- | --- |
| **메커닉** | 화면 3분할에 Stage 1·2·3 동시 진행 + 4번째 통합 화면(거울방) |
| **점수 (다단계, 가변)** | 각 분할 화면별 다단계 점수 합산 |
| **연출** | 마지막 1초 화면 합쳐짐 → 진짜만 남음 |
| **소요시간** | 약 30초 |

---

## 5. 진행 플로우

```
[타이틀] → [허브] → [1·2·3 자유 진행] → [4번 자동 개방] → [최종전 30초] → [엔딩 10초] → [랭킹]
```

> 오프닝 컷씬은 부스 회전율을 위해 제거됨. 타이틀에서 시작 버튼 클릭 시 곧바로 허브로 진입.

---

## 6. 점수 시스템

- **방식:** 오차 범위별 **다단계 차등 점수** (구간 개수·점수 추후 확정)
- **누적:** 4개 스테이지 점수 합산 → 최종 등급 산출
- **등급:** 누적 점수 기반 S / A / B / F (구간 추후 확정)
- **활용:** 부스 일일 랭킹 보드 운영

---

## 7. 에셋 리스트

### ✅ 확정 에셋

| 파일명 | 용도 |
| --- | --- |
| `bg_hub_corridor.png` | 허브 배경 |
| `door.png` | 기본 문 |
| `door_clear.png` | 클리어된 문 |
| `bgm.mp3` | 기본 배경음 |
| `greenie_alive.png` | 엔딩 — 성공 (귀신을 떨친 진짜 그린이) |
| `greenie_silhouette.png` | 엔딩 — 실패 (귀신이 된 그린이) |

### 🎨 생성 필요 이미지 에셋 (프롬프트 포함)

[assets 이미지](https://www.notion.so/assets-358b889a1dd780439e09d5b45aff394f?pvs=21)

### 🎨 생성 필요 이미지 에셋

### **`bg_stage1_clocktower.png`** — STAGE 1 시계탑

```
First-person POV inside an old Korean school clocktower
at night, massive grandfather clock face dominating the
center, swinging brass pendulum, dusty wooden gears, faint
moonlight through cracked windows, cold blue-teal lighting,
horror atmosphere, cinematic depth --ar 16:9
```

### **`bg_stage2_classroom.png`** — STAGE 2 빈 교실

```
First-person POV looking into dark empty classroom
at midnight, rows of empty desks, large window reflecting
faint glow, chalkboard barely visible, single flickering
fluorescent light, cold blue tones, eerie silence, horror
game style --ar 16:9
```

### **`bg_stage3_room.png`** — STAGE 3 무너지는 방

```
First-person POV in a surreal classroom with ceiling
dissolving into void, school memorabilia floating and falling
from above (photos, notebooks, uniforms), dreamlike misty
atmosphere, soft blue-purple glow, melancholic horror
--ar 16:9
```

### **`bg_stage4_bathroom.png`** — STAGE 4 화장실 거울방

```
First-person POV facing a row of three old school bathroom
mirrors at night, cracked tiles, dripping faucets, single
flickering bulb, blood-stained sink, dark stalls, extreme
horror atmosphere, cold green-teal lighting --ar 16:9
```

### **`greenie_silhouette.png`** — 가짜 그린이

```
Cute cartoon giraffe character mascot wearing Korean high 
school uniform, standing on two legs, long neck, 
silhouette/dark shadow version, slightly tilted head, eerie 
posture, transparent PNG background, full body, horror 
atmosphere contrast with cute design --ar 1:2
```

### **`eyes_glow.png`** — 빛나는 눈 (Stage 2 트리거)

```
Pair of glowing red eyes in pure black darkness, sharp
intense glow, transparent PNG background, close-up --ar 1:1
```

### **`greenie.png` — 그린이 (메인 캐릭터)**

`greenie_alive.png`

```
Cute cartoon giraffe character mascot wearing Korean high 
school uniform, standing on two legs, long neck, friendly 
design, big eyes, yellow body with brown spots, transparent 
PNG background, full body, front view, clean illustration 
style --ar 1:2
```

### **`clock_pendulum.png`** — 시계 추

```
Old brass pendulum of grandfather clock, transparent PNG
background, slight motion blur, ornate engraving, horror
aesthetic --ar 1:2
```

### **`memory_real_1.png` / `memory_real_2.png` / `memory_real_3.png`** — 진짜 기억 아이템

```
Korean school items as floating memory fragments:
1) school uniform photo, 2) handwritten notebook page,
3) friendship photo. Soft warm glow, transparent PNG
background, nostalgic style --ar 1:1
```

### **`memory_fake_1.png` / `memory_fake_2.png` / `memory_fake_3.png`** — 가짜 기억 아이템

```
Distorted Korean school items as corrupted memories:
1) torn uniform photo with faces scratched out, 2) notebook with red scribbles, 3) photo with one face replaced. Glitchy red aura, transparent PNG background --ar 1:1
```

### **`cutscene_ending_true.png`** — 엔딩 (성공)

> ⚠️ 대체됨 — `greenie_alive.png`로 대체 운영 (#26 참고)

```
Cute giraffe character looking into cracked mirror showing 
only one reflection, dawn light, hopeful yet eerie, soft 
warm glow --ar 16:9
```

### **`cutscene_ending_bad.png`** — 엔딩 (실패)

> ⚠️ 대체됨 — `greenie_silhouette.png`로 대체 운영 (#26 참고)

```
Cute giraffe character's reflection in mirror smiling 
sinisterly while the real giraffe looks confused, dark red 
atmosphere, distorted edges, horror --ar 16:9
```

---

### 📁 폴더 매핑

```
public/assets/images/
├── hub/          → default, door, door_clear
├── backgrounds/  → bg_stage1_clocktower ~ bg_stage4_bathroom
├── characters/   → greenie_silhouette, eyes_glow, mirror_reflections
├── objects/      → clock_pendulum, memory_real_1~3, memory_fake_1~3
└── cutscenes/    → cutscene_ending_true, cutscene_ending_bad
```

---

## 8. 사운드 자산

### ✅ 확정

- **`bgm.mp3`** — 기본 배경음
- **`open_door_sound.mp3`** — 문 열림 효과음 (허브)

### 🎵 BGM 라우팅 정책

- BGM은 `/hub` 라우트에서만 재생됨 (부스 운영상 게임 진행 중에는 무음 — 효과음 명료성 확보)
- 타이틀 / 각 스테이지 / 엔딩 / 랭킹 화면은 무음
- 후속 이슈에서 라우트별 BGM 트랙 분리 시 `TRACK_TO_FILE` 맵만 수정하면 자동 활성화

### 🔊 추가 검토 중

| 구간 | 상태 |
| --- | --- |
| Stage 1 (종소리 ×9, 시계 추, 봉인음) | TBD |
| Stage 2 (페이크 신호, 트리거음) | TBD |
| Stage 3 (캐치음, 가짜 기억음) | TBD |
| Stage 4 (거울 균열, 합체 충격음) | TBD |
| 오프닝 / 엔딩 컷씬 | TBD |
| 보이스 (*"그린아…"* 등) | TBD |

---

## 9. 폴더 구조

```
public/
├── assets/
│   ├── images/
│   └── sounds/
```

---

## 10. UI / UX

- **시점:** 1인칭 (손전등 흔들림)
- **HUD 좌하단:** 현재 획득 점수 표시
- **HUD 우하단:** 진행도 (1/4 → 4/4)
- **자막:** 큰 글씨 한글, 컷씬 2초 인트로

---

## 11. 부스 운영

| 항목 | 상세 |
| --- | --- |
| **인원** | 운영 2명 |
| **장비** | PC, 모니터, 키보드, 스피커, 헤드폰(Stage 1) |
| **회전율** | 시간당 25~28명 |
| **실패 처리** | 다음 스테이지 자동 진행 |
| **랭킹** | 화이트보드 / 디지털 보드 |

---

## 12. 개발 우선순위

1. **MVP:** 허브 + Stage 1~3
2. **핵심:** Stage 4 (3분할) + 4번 문 개방
3. **연출:** 엔딩 컷씬 / 사운드 / 1인칭 (오프닝 컷씬은 운영상 제외)
4. **추가:** 랭킹, 엔딩 분기

---

## 13. 가변 변수 (Tunable)

- **점수 구간 개수 및 점수 배분 (전 스테이지 다단계)**
- **누적 점수 기반 등급(S/A/B/F) 컷오프**
- Stage 1 종소리 간격 / 정적 길이
- Stage 2 페이크 신호 횟수
- Stage 3 아이템 낙하 속도 / 진짜·가짜 비율
- Stage 4 클리어 기준
- 전체 러닝타임
- 추가 BGM/SFX