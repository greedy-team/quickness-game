// 캐치 게임 — 상수 및 점수 판정 로직 (순수 함수)

export const ITEM_TYPES = ['sword', 'shield', 'potion'];

export const ITEM_EMOJI = {
  sword: '⚔️',
  shield: '🛡️',
  potion: '🧪',
};

// 시각이 transform scale 1.6 적용. 빨간 원 시각 직경 96px (좌표 60px) 기준.
export const TARGET_DISTANCE_PERFECT = 30;  // 좌표 30px = 시각 48px (빨간 원 반지름)
export const TARGET_DISTANCE_NEAR = 60;     // 좌표 60px = 시각 96px (빨간 원 직경)
export const HIT_RANGE_MAX = 150;           // 이 범위 밖 입력은 fail로 카운트
// 떨어지는 이모지의 시각 height 보정 (font-size 48px 기준 약 50px)
// getItemY는 div의 top edge를 반환하므로 시각 center 비교 시 이 값의 절반을 더해야 함
export const ITEM_VISUAL_HEIGHT_PX = 50;

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

// 5개 spawn 만점 250 기준 5단계 등급 (다른 게임과 통일)
export function getCatchResult(totalScore) {
  if (totalScore >= 230) return { grade: 'LEGENDARY', title: '⚔️ 레전더리 장비 한 세트!', desc: '하늘이 인정한 캐치 마스터. 완벽한 장비 보관함이다.', color: '#ffd700', stars: 5 };
  if (totalScore >= 180) return { grade: 'UNIQUE',    title: '💎 유니크 장비 보관함', desc: '훌륭한 집중력! 유니크 등급 장비를 모았다.', color: '#ff007f', stars: 4 };
  if (totalScore >= 130) return { grade: 'EPIC',      title: '✨ 에픽 장비 모음', desc: '좋은 캐치! 에픽 등급 장비를 충분히 모았다.', color: '#a78bfa', stars: 3 };
  if (totalScore >= 80)  return { grade: 'RARE',      title: '🔷 레어 장비 보관함', desc: '쓸 만한 장비를 모았다. 보스전 준비는 가능하다.', color: '#60a5fa', stars: 2 };
  return { grade: 'COMMON', title: '🛡️ 일반 장비 보관함', desc: '아쉬운 결과지만 약간의 장비는 챙겼다.', color: '#86efac', stars: 1 };
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
