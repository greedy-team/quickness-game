// src/components/TenSecondsGame/gameUtils.js

export const TARGET = 10.0;

// 통일된 5단계 등급 + 점수 (boundary 동기화)
export function getResult(diff) {
  if (diff <= 0.05) return { grade: "LEGENDARY", title: "⚔️ 레전더리 장비 획득!", desc: "당신은 시간의 신이다. 전설의 무기가 강림했다!", color: "#ffd700", stars: 5 };
  if (diff <= 0.1)  return { grade: "UNIQUE",    title: "💎 유니크 장비 획득!", desc: "정말 정확한 타이밍! 유니크 장비를 획득했다.", color: "#ff007f", stars: 4 };
  if (diff <= 0.2)  return { grade: "EPIC",      title: "✨ 에픽 장비 획득!", desc: "훌륭한 반응속도! 에픽 등급 장비를 획득했다.", color: "#a78bfa", stars: 3 };
  if (diff <= 0.4)  return { grade: "RARE",      title: "🔷 레어 장비 획득!", desc: "나쁘지 않다. 레어 장비를 획득했다.", color: "#60a5fa", stars: 2 };
  return { grade: "COMMON", title: "🛡️ 일반 장비 획득", desc: "그래도 보상은 챙겼다. 다음엔 더 정확하게.", color: "#86efac", stars: 1 };
}

// 등급 ↔ 점수 1:1 매칭
export function getScore(diff) {
  if (diff <= 0.05) return 100;
  if (diff <= 0.1)  return 80;
  if (diff <= 0.2)  return 60;
  if (diff <= 0.4)  return 40;
  return 20;
}
