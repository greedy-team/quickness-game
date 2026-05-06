import { BOSS_SPRITES, BOSS_FRAME_W, BOSS_FRAME_H } from '../../constants/sprites';
import './Boss.css';

/**
 * Sprite-sheet boss renderer.
 * NOTE: 애니메이션을 다시 시작하려면 caller가 `<Boss key={action} ... />`처럼 key를 넣어야 한다.
 */
export default function Boss({
  action = 'idle',
  x = 1400,
  bottom = 151,
  dying = false,
}) {
  const a = BOSS_SPRITES[action];
  if (!a) return null;
  return (
    <div
      className={dying ? 'boss-sprite is-dying' : 'boss-sprite'}
      style={{
        bottom,
        left: x,
        width: BOSS_FRAME_W,
        height: BOSS_FRAME_H,
        backgroundImage: `url(${a.src})`,
        backgroundSize: `${BOSS_FRAME_W * a.frames}px ${BOSS_FRAME_H}px`,
        animation: `boss-play ${a.duration} steps(${a.frames}) ${a.loop ? 'infinite' : 'forwards'}`,
        ['--end-pos']: `-${BOSS_FRAME_W * a.frames}px`,
      }}
    />
  );
}
