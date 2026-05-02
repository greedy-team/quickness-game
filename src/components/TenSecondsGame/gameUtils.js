// src/components/TenSecondsGame/gameUtils.js

export const TARGET = 10.0;

export function getResult(diff) {
  if (diff <= 0.05) {
    return { grade: "LEGENDARY", title: "⚔️ 전설급 장비 획득!", desc: "당신은 시간의 신이다. 전설급 장비가 드롭되었습니다!", color: "#ffd700", stars: 5 };
  } else if (diff <= 0.2) {
    return { grade: "RARE", title: "✨ 레어 장비 획득!", desc: "훌륭한 반응속도! 레어 등급 장비를 획득했습니다.", color: "#a78bfa", stars: 4 };
  } else if (diff <= 0.5) {
    return { grade: "COMMON", title: "🛡️ 성공적인 훈련이다!", desc: "나쁘지 않아. 일반 장비를 획득했습니다.", color: "#86efac", stars: 3 };
  } else if (diff <= 1.0) {
    return { grade: "FAIL", title: "🔨 장비 강화 실패", desc: "강화 재료가 사라졌습니다. 다시 도전하세요.", color: "#fb923c", stars: 1 };
  } else {
    return { grade: "DEAD", title: "💀 그린이가 쓰러졌습니다...", desc: "마을로 돌아갔습니다. 다음엔 잘 할 수 있을 거에요.", color: "#f87171", stars: 0 };
  }
}