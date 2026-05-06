export const HERO_FRAME_W = 400;
export const HERO_FRAME_H = 220;

export const HERO_SPRITES = {
  walk_no_weapon: {
    src: '/sprites/unified_5_walk_no_weapon.png',
    frames: 8,
    duration: '0.8s',
    loop: true,
  },
  walk_weapon: {
    src: '/sprites/unified_6_walk_weapon.png',
    frames: 8,
    duration: '0.8s',
    loop: true,
  },
  attack_basic: {
    src: '/sprites/unified_1_attack_basic.png',
    frames: 8,
    duration: '0.6s',
    loop: false,
  },
  attack_thrust: {
    src: '/sprites/unified_2_attack_thrust.png',
    frames: 5,
    duration: '0.4s',
    loop: false,
  },
  attack_upslash: {
    src: '/sprites/unified_3_attack_upslash.png',
    frames: 8,
    duration: '0.6s',
    loop: false,
  },
  attack_down: {
    src: '/sprites/unified_4_attack_down.png',
    frames: 8,
    duration: '0.6s',
    loop: false,
  },
};

// BossFightScene에서 매 공격마다 다음 인덱스로 순환
export const HERO_ATTACK_CYCLE = [
  'attack_basic',
  'attack_thrust',
  'attack_upslash',
  'attack_down',
];

export const BOSS_FRAME_W = 500;
export const BOSS_FRAME_H = 360;

export const BOSS_SPRITES = {
  idle: {
    src: '/sprites/unified_boss_idle.png',
    frames: 8,
    duration: '1.6s',
    loop: true,
  },
  attack: {
    src: '/sprites/unified_boss_attack.png',
    frames: 9,
    duration: '1.0s',
    loop: false,
  },
};

if (import.meta.env?.DEV) {
  console.assert(HERO_SPRITES.walk_weapon.frames === 8, 'sprites: walk_weapon 8 frames');
  console.assert(HERO_SPRITES.attack_thrust.frames === 5, 'sprites: thrust 5 frames');
  console.assert(HERO_ATTACK_CYCLE.length === 4, 'sprites: attack cycle 4 items');
  console.assert(HERO_ATTACK_CYCLE.every((k) => HERO_SPRITES[k]), 'sprites: cycle keys exist');
  console.assert(BOSS_SPRITES.idle.loop === true, 'sprites: boss idle loops');
  console.assert(BOSS_SPRITES.attack.loop === false, 'sprites: boss attack one-shot');
  console.assert(BOSS_FRAME_W === 500 && BOSS_FRAME_H === 360, 'sprites: boss frame 500x360');
}
