export function getReactionResult(reactionTimeMs) {
  if (reactionTimeMs <= 200) {
    return { grade: "MYTHIC", title: "👑 신화급 무기 각성!", desc: "석상의 안광보다 빨랐습니다! 신의 속도네요.", color: "#ff007f", stars: 5 };
  } else if (reactionTimeMs <= 300) {
    return { grade: "LEGENDARY", title: "⚔️ 전설급 장비 획득!", desc: "엄청난 동체시력입니다! 전설급 장비가 드롭되었습니다.", color: "#ffd700", stars: 4 };
  } else if (reactionTimeMs <= 500) {
    return { grade: "RARE", title: "✨ 레어 장비 획득", desc: "훌륭한 반응입니다. 레어 등급 장비를 얻었습니다.", color: "#a78bfa", stars: 3 };
  } else if (reactionTimeMs <= 1000) {
    return { grade: "COMMON", title: "🛡️ 낡은 장비 획득", desc: "겨우 살아남았습니다. 일반 장비를 얻었습니다.", color: "#86efac", stars: 2 };
  } else {
    return { grade: "FAIL", title: "💀 치명상!", desc: "반응이 너무 늦었습니다. 석상의 분노를 샀습니다.", color: "#f87171", stars: 0 };
  }
}