// src/audio/trackRegistry.js
import { ASSETS } from '../assets.js';

// 라우트 경로 → 트랙 ID
export const ROUTE_TO_TRACK = {
  '/':         'title',
  '/hub':      'hub',
  '/stage/1':  'stage1',
  '/stage/2':  'stage2',
  '/stage/3':  'stage3',
  '/stage/4':  'stage4',
  '/ending':   'ending',
  '/ranking':  'ranking',
};

// 트랙 ID → 실제 파일 경로 (null = 해당 라우트에서 무음)
// 현재 정책: /hub에서만 BGM 재생. 후속 이슈에서 라우트별 신규 파일 들어오면 본 맵만 갱신.
export const TRACK_TO_FILE = {
  title:    null,
  hub:      ASSETS.sounds.bgm,
  stage1:   null,
  stage2:   null,
  stage3:   null,
  stage4:   null,
  ending:   null,
  ranking:  null,
};

export const BGM_DEFAULTS = {
  volume: 0.7,
  loop: true,
};

// /stage/:id, /ending/:outcome 같은 동적 경로 처리
export function trackIdForPath(pathname) {
  if (pathname.startsWith('/stage/')) {
    const id = pathname.split('/')[2];
    return ROUTE_TO_TRACK[`/stage/${id}`] ?? null;
  }
  if (pathname.startsWith('/ending/') || pathname === '/ending') {
    return ROUTE_TO_TRACK['/ending'] ?? null;
  }
  return ROUTE_TO_TRACK[pathname] ?? null;
}
