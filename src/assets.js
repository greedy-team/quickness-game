// src/assets.js
// public/ 하위 파일은 절대경로로 그대로 서빙됨 (Vite 표준).

export const ASSETS = {
  images: {
    hubCorridor:     '/assets/images/bg_hub_corridor.png',
    door:            '/assets/images/door.png',
    doorClear:       '/assets/images/door_clear.png',
    cutsceneOpening: '/assets/images/cutscene_opening.png',
    stage1:          '/assets/images/bg_stage1_clocktower.png',
    stage2:          '/assets/images/bg_stage2_classroom.png',
    stage3:          '/assets/images/bg_stage3_room.png',
    stage4:          '/assets/images/bg_stage4_bathroom.png',
    memoryReal: [
      '/assets/images/memory_real_1.png',
      '/assets/images/memory_real_2.png',
      '/assets/images/memory_real_3.png',
    ],
    memoryFake: [
      '/assets/images/memory_fake_1.png',
      '/assets/images/memory_fake_2.png',
      '/assets/images/memory_fake_3.png',
    ],
    // 엔딩 컷씬 (#26)
    endingAlive:      '/assets/images/greenie_alive.png',
    endingSilhouette: '/assets/images/greenie_silhouette.png',
  },
  sounds: {
    bgm:       '/assets/sounds/bgm.mp3',
    bgmStage3: '/assets/sounds/bgm_stage_3.mp3',
    bgmStage4: '/assets/sounds/bgm_stage_4.mp3',
    openDoor:  '/assets/sounds/open_door_sound.mp3',
    // 엔딩 SFX 슬롯 — 본 이슈 범위에서는 음원 미존재. null이면 EndingCutscene에서 재생 skip.
    // images.endingAlive와 이름 겹치지 않도록 'Sfx' 접미사 사용.
    endingAliveSfx:      null,
    endingSilhouetteSfx: null,
  },
};
