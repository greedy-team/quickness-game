import { HERO_SPRITES, HERO_FRAME_W, HERO_FRAME_H } from '../constants/sprites';
import './Hero.css';

/**
 * Sprite-sheet hero renderer.
 * NOTE: To restart the animation when `action` changes, the caller must set
 *   <Hero key={action} action={action} ... />
 * because React's key prop only takes effect when applied by the parent.
 */
export default function Hero({
  action = 'walk_no_weapon',
  x = 100,
  bottom = 180,
  facing = 'right',
  playing = true,
}) {
  const a = HERO_SPRITES[action];
  if (!a) return null;
  return (
    <div
      className={playing ? 'hero-sprite' : 'hero-sprite paused'}
      style={{
        bottom,
        left: x,
        width: HERO_FRAME_W,
        height: HERO_FRAME_H,
        backgroundImage: `url(${a.src})`,
        backgroundSize: `${HERO_FRAME_W * a.frames}px ${HERO_FRAME_H}px`,
        animation: `hero-play ${a.duration} steps(${a.frames}) ${a.loop ? 'infinite' : 'forwards'}`,
        ['--end-pos']: `-${HERO_FRAME_W * a.frames}px`,
        transform: facing === 'left' ? 'scaleX(-1)' : 'none',
      }}
    />
  );
}
