// src/assets.js
// public/ 하위 파일은 절대경로로 그대로 서빙됨 (Vite 표준).

export const ASSETS = {
  images: {
    hubCorridor:       '/assets/images/bg_hub_corridor.webp',
    door:              '/assets/images/door.webp',
    doorClear:         '/assets/images/door_clear.webp',
    cutsceneOpening:   '/assets/images/cutscene_opening.webp',
    cutsceneJumpscare: '/assets/images/cutscene_jumpscare.webp',
    stage1:            '/assets/images/bg_stage1_clocktower.webp',
    stage2:            '/assets/images/bg_stage2_classroom.webp',
    stage3:            '/assets/images/bg_stage3_room.webp',
    stage4:            '/assets/images/bg_stage4_bathroom.webp',
    memoryReal: [
      '/assets/images/memory_real_1.webp',
      '/assets/images/memory_real_2.webp',
      '/assets/images/memory_real_3.webp',
    ],
    memoryFake: [
      '/assets/images/memory_fake_1.webp',
      '/assets/images/memory_fake_2.webp',
      '/assets/images/memory_fake_3.webp',
    ],
    // 엔딩 컷씬 (#26)
    endingAlive:      '/assets/images/greenie_alive.webp',
    endingSilhouette: '/assets/images/greenie_silhouette.webp',
  },
  sounds: {
    bgm:                  '/assets/sounds/bgm.mp3',
    bgmStage3:            '/assets/sounds/bgm_stage_3.mp3',
    bgmStage4:            '/assets/sounds/bgm_stage_4.mp3',
    openDoor:             '/assets/sounds/open_door_sound.mp3',
    // images.cutsceneJumpscare와 키 충돌 방지 위해 'Sfx' 접미사 (ending 패턴 동일).
    cutsceneJumpscareSfx: '/assets/sounds/cutscene_jumpscare.mp3',
    // 엔딩 SFX 슬롯 — 본 이슈 범위에서는 음원 미존재. null이면 EndingCutscene에서 재생 skip.
    // images.endingAlive와 이름 겹치지 않도록 'Sfx' 접미사 사용.
    endingAliveSfx:       null,
    endingSilhouetteSfx:  null,
  },
};
