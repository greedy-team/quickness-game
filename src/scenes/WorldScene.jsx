import { useEffect, useRef, useState } from 'react';
import { useGame } from '../store/gameStore.jsx';
import useKeyboardMovement from '../hooks/useKeyboardMovement.js';
import Hero from '../components/Hero.jsx';
import './WorldScene.css';

const HERO_SPEED_PX_PER_S = 260;
const HERO_X_MIN = -120;
const HERO_X_MAX = 1820;
const HERO_BOX_WIDTH = 400;
const CHECKPOINT_WIDTH = 80;
const CHECKPOINT_HIT_RANGE = 110; // 그린이 가로중심과 체크포인트 중심 거리 허용치

// 화면 1: MG1, MG2, MG3 체크포인트 (worldStage 0~2가 활성 인덱스)
const SCREEN1 = [
  { sceneId: 'minigame_1', label: 'MG1', centerX: 540,  enterKey: 'Space', enterHint: 'Space로 입장' },
  { sceneId: 'minigame_2', label: 'MG2', centerX: 1080, enterKey: 'Space', enterHint: 'Space로 입장' },
  { sceneId: 'minigame_3', label: 'MG3', centerX: 1620, enterKey: 'Space', enterHint: 'Space로 입장' },
];

// 화면 2: MG4, 보스 체크포인트 (worldStage 4~5가 활성 인덱스)
const SCREEN2 = [
  { sceneId: 'minigame_4', label: 'MG4',  centerX: 480,  enterKey: 'Space', enterHint: 'Space로 입장' },
  { sceneId: 'boss_fight', label: '보스', centerX: 1440, enterKey: 'Space', enterHint: 'Space로 입장' },
];

function getScreen(worldStage) {
  if (worldStage <= 2) return { checkpoints: SCREEN1, activeIndex: worldStage };
  if (worldStage >= 4) return { checkpoints: SCREEN2, activeIndex: worldStage - 4 };
  return null; // worldStage === 3 → armor scene이 라우터에서 활성
}

// worldStage에 따라 그린이 시작 위치를 결정 (이전 체크포인트 위치 유지)
function getInitialHeroX(worldStage) {
  if (worldStage === 0) return HERO_X_MIN;
  if (worldStage <= 2) return SCREEN1[worldStage - 1].centerX - HERO_BOX_WIDTH / 2;
  if (worldStage === 4) return HERO_X_MIN;
  if (worldStage === 5) return SCREEN2[0].centerX - HERO_BOX_WIDTH / 2;
  return HERO_X_MIN;
}

export default function WorldScene() {
  const { state, dispatch } = useGame();
  const screen = getScreen(state.worldStage);
  const initialHeroX = getInitialHeroX(state.worldStage);
  const [heroX, setHeroX] = useState(initialHeroX);
  const [facing, setFacing] = useState('right');
  const [isMoving, setIsMoving] = useState(false);
  const lastTimeRef = useRef(performance.now());
  const heroXRef = useRef(initialHeroX);

  useKeyboardMovement({
    enabled: !!screen,
    onTick: (keys) => {
      const now = performance.now();
      // tab inactive 후 복귀 시 dt 폭주(텔레포트) 방지: 50ms cap
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      let dx = 0;
      if (keys.ArrowRight) dx += HERO_SPEED_PX_PER_S * dt;
      if (keys.ArrowLeft) dx -= HERO_SPEED_PX_PER_S * dt;

      if (dx !== 0) {
        const next = Math.max(HERO_X_MIN, Math.min(HERO_X_MAX, heroXRef.current + dx));
        if (next !== heroXRef.current) {
          heroXRef.current = next;
          setHeroX(next);
          setIsMoving(true);
          setFacing(dx > 0 ? 'right' : 'left');
        } else {
          setIsMoving(false);
        }
      } else {
        setIsMoving(false);
      }
    },
  });

  useEffect(() => {
    const onKey = (e) => {
      if (!screen) return;
      const active = screen.checkpoints[screen.activeIndex];
      if (!active) return;
      if (e.code !== active.enterKey) return;
      const heroCenter = heroXRef.current + HERO_BOX_WIDTH / 2;
      const dist = Math.abs(heroCenter - active.centerX);
      if (dist <= CHECKPOINT_HIT_RANGE) {
        e.preventDefault();
        dispatch({ type: 'GO_TO_SCENE', payload: active.sceneId });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, dispatch]);

  if (!screen) {
    return <div className="world-scene" />;
  }

  const heroCenter = heroX + HERO_BOX_WIDTH / 2;
  const active = screen.checkpoints[screen.activeIndex];
  const atActiveCheckpoint = active
    ? Math.abs(heroCenter - active.centerX) <= CHECKPOINT_HIT_RANGE
    : false;

  return (
    <div className="world-scene">
      <div className="world-hud">누적 점수: {state.totalScore}</div>

      {screen.checkpoints.map((cp, i) => {
        const isActive = i === screen.activeIndex;
        const isDone = i < screen.activeIndex;
        const stateClass = isActive ? 'is-active' : isDone ? 'is-done' : 'is-locked';
        return (
          <div
            key={cp.sceneId}
            className={`world-checkpoint ${stateClass}`}
            style={{ left: cp.centerX - CHECKPOINT_WIDTH / 2 }}
            aria-hidden="true"
          >
            <div className="world-checkpoint-sign">{isDone ? '✓' : cp.label}</div>
            <div className="world-checkpoint-post" />
          </div>
        );
      })}

      <Hero
        x={heroX}
        action={state.hasArmor ? 'walk_weapon' : 'walk_no_weapon'}
        key={state.hasArmor ? 'walk_weapon' : 'walk_no_weapon'}
        playing={isMoving}
        facing={facing}
      />

      {atActiveCheckpoint && active && (
        <div className="world-toast">{active.enterHint}</div>
      )}
    </div>
  );
}
