// src/ranking/ranking.config.js
// 닉네임/랭킹 보드 튜닝 단일 소스. 모든 가변 값은 여기서 조정한다.

export const RANKING_CONFIG = {
  // 닉네임 검증 (정규식 없음 — 길이만 체크)
  nicknameMinLength: 1,
  nicknameMaxLength: 8,

  // 보드
  topN: 10,

  // /ranking 자동 복귀 (Space/Enter 또는 만료 시 resetGame + navigate('/'))
  autoReturnMs: 15000,

  // 결말 라벨 (보드 표시용)
  outcomeLabels: {
    alive:      '⭐ alive',
    silhouette: '👻 silhouette',
  },

  // 저장소 — schema 변경 시 .v2 등으로 키 갱신
  storageKey: 'quickness-game.ranking.v1',
  storageCap: 200,
};
