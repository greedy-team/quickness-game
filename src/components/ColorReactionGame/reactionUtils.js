// 통일된 5단계 등급 + 점수 (boundary 동기화)
export function getReactionResult(reactionTimeMs) {
  if (reactionTimeMs <= 150) return { grade: "LEGENDARY", title: "⚔️ 레전더리 장비 획득!", desc: "석상의 안광보다 빨랐다! 신의 속도다.", color: "#ffd700", stars: 5 };
  if (reactionTimeMs <= 250) return { grade: "UNIQUE",    title: "💎 유니크 장비 획득!", desc: "엄청난 동체시력! 유니크 장비가 드롭되었다.", color: "#ff007f", stars: 4 };
  if (reactionTimeMs <= 400) return { grade: "EPIC",      title: "✨ 에픽 장비 획득!", desc: "훌륭한 반응. 에픽 등급 장비를 얻었다.", color: "#a78bfa", stars: 3 };
  if (reactionTimeMs <= 600) return { grade: "RARE",      title: "🔷 레어 장비 획득", desc: "충분히 빠르다. 레어 장비를 얻었다.", color: "#60a5fa", stars: 2 };
  return { grade: "COMMON", title: "🛡️ 일반 장비 획득", desc: "겨우 살아남았다. 일반 장비를 얻었다.", color: "#86efac", stars: 1 };
}

// 등급 ↔ 점수 1:1 매칭
export function getScore(ms) {
  if (ms <= 150) return 100;
  if (ms <= 250) return 80;
  if (ms <= 400) return 60;
  if (ms <= 600) return 40;
  return 20;
}
