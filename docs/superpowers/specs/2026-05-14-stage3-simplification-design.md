# Stage3 단순화 및 Score UI 제거 설계

**날짜:** 2026-05-14  
**이슈:** `.issues/20260513_기능개선_스테이지_score_제거_및_Stage3_게임로직_단순화.md`

---

## 개요

4가지 독립적인 변경을 한 번에 처리한다.

1. 모든 스테이지 좌측하단 score 표시 제거
2. Stage3 가짜 기억 전부 제거, 진짜 기억 4개만 유지
3. Stage3 판정 로직을 catch / miss 이진 판정으로 단순화
4. → 키 반응 CatchZone을 y축 70% 위치로 이동

---

## 변경 파일

| 파일 | 변경 |
|------|------|
| `src/components/HudOverlay/HudOverlay.jsx` | stage 라우트 브랜치에서 score div 제거 |
| `src/stages/stage3/stage3.config.js` | 전면 재구조화 |
| `src/stages/stage3/Stage3Field.jsx` | fake 제거, 단순 catch/miss, zoneCenter 70 |
| `src/stages/stage3/Stage3Game.jsx` | ResultModal breakdown 단순화 |
| `src/stages/stage3/CatchZone.css` | top 50% → 70% |

---

## 섹션 1: HudOverlay score 제거

`HudOverlay.jsx`의 `/stage/` 라우트 분기에서 score 표시를 완전히 제거한다.

```jsx
// 변경 전
if (pathname.startsWith('/stage/')) {
  return (
    <div className="hud-overlay" aria-hidden="false">
      <div className="hud-overlay__score-simple">SCORE {total}</div>
    </div>
  );
}

// 변경 후
if (pathname.startsWith('/stage/')) {
  return null;
}
```

Stage3Field 내부 HUD의 "점수" 행도 제거한다. "남은 조각" 행은 유지.

---

## 섹션 2: stage3.config.js 재구조화

accuracyTiers, fakePenalty, fakeLabel, missScore, realCount 제거.  
catchPoints와 단순 레이블로 대체.

```js
export const STAGE3_CONFIG = {
  durationSec:             10,
  itemCount:               4,       // 전부 real
  fallDurationSec:         2.0,
  catchZoneRatio:          0.25,
  spawnIntervalJitterSec:  0.4,
  horizontalRandomRatio:   0.2,
  seed:                    null,

  catchPoints: 25,        // 캐치 성공 시 고정 점수 (4 × 25 = 100 max)
  catchLabel:  '캐치!',
  missLabel:   '놓침',
};
```

---

## 섹션 3: Stage3Field.jsx 단순화

### buildSequence
fake/real 섞기 로직 제거. 4개 모두 real, `ASSETS.images.memoryReal` 풀에서 랜덤 선택.  
mulberry32 PRNG는 재현성을 위해 유지.

```js
function buildSequence(config) {
  const seed = config.seed ?? Date.now();
  const rand = mulberry32(seed);
  const baseInterval = config.durationSec / config.itemCount;

  return Array.from({ length: config.itemCount }, (_, i) => {
    const offset = (rand() * 2 - 1) * config.spawnIntervalJitterSec;
    const spawnAt = Math.max(0, i * baseInterval + offset);
    const horizontalPct = 50 + (rand() * 2 - 1) * config.horizontalRandomRatio * 100;
    const imgSrc = ASSETS.images.memoryReal[Math.floor(rand() * ASSETS.images.memoryReal.length)];
    return { imgSrc, spawnAt, horizontalPct };
  });
}
```

### catch 로직 (keydown handler)
zoneCenter를 70으로 변경. tier 계산 제거. fake 분기 제거.

```js
const zoneCenter = 70;   // 변경 (기존 50)
const zoneHalf = config.catchZoneRatio / 2 * 100;
const zoneTop = zoneCenter - zoneHalf;
const zoneBottom = zoneCenter + zoneHalf;

const candidates = itemsRef.current.filter(
  (it) => it.status === 'falling' && it.topPercent >= zoneTop && it.topPercent <= zoneBottom
);
if (candidates.length === 0) return;

const target = candidates.reduce((best, it) =>
  Math.abs(it.topPercent - zoneCenter) < Math.abs(best.topPercent - zoneCenter) ? it : best
);

addPoints(config.catchPoints);
showPopup(config.catchLabel, config.catchPoints, '#FFD700');
statsRef.current.caughtCount += 1;
setItems((prev) => prev.map((it) => it.id === target.id ? { ...it, status: 'caught' } : it));
```

### statsRef 단순화
```js
statsRef = { caughtCount: 0, missedCount: 0 }
```

RAF 루프 내 아이템 timeout 처리:
```js
if (localT > config.fallDurationSec) {
  statsRef.current.missedCount += 1;
  return { ...it, status: 'missed', topPercent: 110 };
}
```

### onResult 페이로드
```js
onResult({
  metric,
  caughtCount: statsRef.current.caughtCount,
  missedCount: statsRef.current.missedCount,
  realCount: config.itemCount,
  totalScore: totalPointsRef.current,
});
```

### HUD
"점수" 행 제거. "남은 조각" 행만 유지.

---

## 섹션 4: Stage3Game.jsx ResultModal 단순화

breakdown을 캐치/놓침 두 행으로 축소.

```js
const breakdown = [];
if (caughtCount > 0) {
  breakdown.push({
    label: '캐치',
    value: `${caughtCount}개`,
    delta: `+${caughtCount * STAGE3_CONFIG.catchPoints}`,
    color: '#FFD700',
  });
}
if (missedCount > 0) {
  breakdown.push({
    label: '놓침',
    value: `${missedCount}개`,
    delta: null,
    color: '#888',
  });
}
```

comment 로직 및 isSuccess:
```js
const isSuccess = caughtCount >= realCount / 2;  // 기존 ratio 기반 → 직접 비교로 변경

if (caughtCount === realCount)         comment = '모든 기억을 되찾았습니다.';
else if (caughtCount >= realCount / 2) comment = '대부분의 조각을 회수했습니다.';
else                                   comment = '기억이 흩어져버렸습니다.';
```

Stage3Game.jsx 상단 destructure도 업데이트:
```js
const { caughtCount, missedCount, realCount, totalScore } = resultData;
```

---

## 섹션 5: CatchZone.css

```css
/* 변경 전 */
top: 50%;
/* 변경 후 */
top: 70%;
```

---

## 테스트 고려사항

- `Stage3Field` 관련 테스트가 있다면 새 config 구조(catchPoints 등)에 맞게 업데이트
- HudOverlay 테스트: stage 라우트에서 score 미표시 확인
- ResultModal 테스트: breakdown 행 수 변경 반영
