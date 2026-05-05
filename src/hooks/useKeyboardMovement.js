import { useEffect, useRef } from 'react';

const ARROW_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

/**
 * 매 프레임 onTick(keysObj)을 호출. keysObj는 { ArrowLeft: bool, ... }.
 * @param {{ enabled: boolean, onTick: (keys: Record<string, boolean>) => void }} opts
 */
export default function useKeyboardMovement({ enabled, onTick }) {
  const keysRef = useRef({});
  const onTickRef = useRef(onTick);

  useEffect(() => { onTickRef.current = onTick; }, [onTick]);

  useEffect(() => {
    if (!enabled) {
      keysRef.current = {};
      return;
    }
    const down = (e) => {
      if (ARROW_KEYS.includes(e.code) || e.code === 'Space') e.preventDefault();
      keysRef.current[e.code] = true;
    };
    const up = (e) => {
      delete keysRef.current[e.code];
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    let rafId;
    const loop = () => {
      onTickRef.current(keysRef.current);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      cancelAnimationFrame(rafId);
      keysRef.current = {};
    };
  }, [enabled]);
}
