// src/assets.js
// public/ 하위 파일은 절대경로로 그대로 서빙됨 (Vite 표준).

export const ASSETS = {
  images: {
    hubCorridor:     '/assets/images/bg_hub_corridor.png',
    door:            '/assets/images/door.png',
    doorClear:       '/assets/images/door_clear.png',
    cutsceneOpening: '/assets/images/cutscene_opening.png',
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
  },
  sounds: {
    bgm:      '/assets/sounds/bgm.mp3',
    openDoor: '/assets/sounds/open_door_sound.mp3',
  },
};
