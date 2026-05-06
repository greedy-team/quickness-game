// src/ranking/rankingRepository.js
// 랭킹 저장소 default export.
// 백엔드 도입 시 이 파일만 수정 — 호출하는 컴포넌트는 변경 없음.
import { localStorageRanking } from './localStorageRanking';

export const rankingRepository = localStorageRanking;
