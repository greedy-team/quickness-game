// 캐치 게임 — 상수 및 점수 판정 로직 (순수 함수)

export const ITEM_TYPES = ['sword', 'shield', 'potion'];

export const ITEM_EMOJI = {
  sword: '⚔️',
  shield: '🛡️',
  potion: '🧪',
};

export const TARGET_DISTANCE_PERFECT = 15;  // px (시각 inner 30px 반지름)
export const TARGET_DISTANCE_NEAR = 30;     // px (시각 outer 60px 반지름)
export const HIT_RANGE_MAX = 90;            // px (이 범위 밖 입력은 fail로 카운트)

export const GAME_DURATION_MS = 10_000;
export const SPAWN_COUNT = 6;
export const SPAWN_MIN_GAP_MS = 1400;
export const SPAWN_MAX_GAP_MS = 1700;
export const SPAWN_FIRST_AT_MS = 800;
export const FALL_DURATION_MS = 2000;
export const STAGE_HEIGHT_PX = 600;
export const RED_CIRCLE_TOP_RATIO = 0.7;    // stage height의 70% 지점 (제단 위치)

// 거리(px)를 받아 점수와 종류 반환
export function judgeHit(distancePx) {
  if (distancePx <= TARGET_DISTANCE_PERFECT) return { score: 50, kind: 'perfect' };
  if (distancePx <= TARGET_DISTANCE_NEAR) return { score: 20, kind: 'near' };
  return { score: 0, kind: 'fail' };
}

// 총점을 받아 등급/색/별 반환
export function getCatchResult(totalScore) {
  if (totalScore >= 280) return { grade: 'LEGENDARY', title: '⚔️ 전설급 장비 한 세트 완성!', desc: '하늘이 그린이를 인정했다. 완벽한 장비 보관함이다.', color: '#ffd700', stars: 5 };
  if (totalScore >= 200) return { grade: 'RARE', title: '✨ 레어 장비 모음', desc: '훌륭한 캐치! 빛나는 장비를 충분히 모았다.', color: '#a78bfa', stars: 4 };
  if (totalScore >= 120) return { grade: 'COMMON', title: '🛡️ 평범한 장비 보관함', desc: '쓸 만한 장비를 모았다. 보스전 준비는 가능하다.', color: '#86efac', stars: 3 };
  if (totalScore >= 40)  return { grade: 'FAIL', title: '🔨 부족한 장비', desc: '장비가 부족하다. 다시 도전해보자.', color: '#fb923c', stars: 1 };
  return { grade: 'DEAD', title: '💀 빈 손으로 돌아왔다', desc: '아무 장비도 챙기지 못했다.', color: '#f87171', stars: 0 };
}

// 게임 시작 후 아이템이 등장할 시각(ms) 배열
export function planSpawnTimes(
  durationMs = GAME_DURATION_MS,
  count = SPAWN_COUNT,
  minGapMs = SPAWN_MIN_GAP_MS,
  maxGapMs = SPAWN_MAX_GAP_MS,
  firstAtMs = SPAWN_FIRST_AT_MS,
  fallMs = FALL_DURATION_MS,
) {
  const times = [];
  let t = firstAtMs;
  for (let i = 0; i < count; i++) {
    if (t + fallMs > durationMs) break;  // 빨간 원에 도달 못 하면 spawn 안 함
    times.push(t);
    const gap = Math.floor(minGapMs + Math.random() * (maxGapMs - minGapMs));
    t += gap;
  }
  return times;
}

export function pickRandomType() {
  return ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
}

// spawnAt 이후 elapsed 기반 시간 계산으로 현재 y 위치(px) 반환
export function getItemY(elapsedSinceSpawnMs, stageHeightPx = STAGE_HEIGHT_PX, fallDurationMs = FALL_DURATION_MS) {
  const progress = elapsedSinceSpawnMs / fallDurationMs;
  return progress * stageHeightPx;
}
