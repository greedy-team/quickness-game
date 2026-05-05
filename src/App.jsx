import { useEffect } from 'react';
import { useGame } from './store/gameStore.jsx';
import IntroScene from './scenes/IntroScene.jsx';
import WorldScene from './scenes/WorldScene.jsx';
import PlaceholderScene from './scenes/PlaceholderScene.jsx';
import EndingScene from './scenes/EndingScene.jsx';
import TenSecondsGame from './components/TenSecondsGame/TenSecondsGame';
import ColorReactionGame from './components/ColorReactionGame/ColorReactionGame';
import CatchGame from './components/CatchGame/CatchGame';
import './App.css';

export default function App() {
  const { state, dispatch } = useGame();

  // armor 진입 시 갑옷 자동 장착
  useEffect(() => {
    if (state.scene === 'armor' && !state.hasArmor) {
      dispatch({ type: 'EQUIP_ARMOR' });
    }
  }, [state.scene, state.hasArmor, dispatch]);

  return (
    <div className="app-stage" key={state.scene}>
      {state.scene === 'intro' && <IntroScene />}
      {state.scene === 'world' && <WorldScene />}
      {state.scene === 'minigame_1' && (
        <TenSecondsGame
          onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
          onContinue={() => {
            dispatch({ type: 'SET_WORLD_STAGE', payload: 1 });
            dispatch({ type: 'GO_TO_SCENE', payload: 'world' });
          }}
        />
      )}
      {state.scene === 'minigame_2' && (
        <ColorReactionGame
          onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
          onContinue={() => {
            dispatch({ type: 'SET_WORLD_STAGE', payload: 2 });
            dispatch({ type: 'GO_TO_SCENE', payload: 'world' });
          }}
        />
      )}
      {state.scene === 'minigame_3' && (
        <CatchGame
          onComplete={(score) => dispatch({ type: 'ADD_SCORE', payload: score })}
          onContinue={() => {
            dispatch({ type: 'SET_WORLD_STAGE', payload: 3 });
            dispatch({ type: 'GO_TO_SCENE', payload: 'armor' });
          }}
        />
      )}
      {state.scene === 'armor' && (
        <PlaceholderScene title="🛡 갑옷 장착" description="훈련을 마친 그린이! 갑옷과 검을 손에 넣었다!"
          onContinue={() => {
            dispatch({ type: 'SET_WORLD_STAGE', payload: 4 });
            dispatch({ type: 'GO_TO_SCENE', payload: 'world' });
          }} />
      )}
      {state.scene === 'minigame_4' && (
        <PlaceholderScene title="⚔️ 미니게임 4: 병렬 진행" description="(별도 이슈에서 구현 예정)"
          onContinue={() => {
            dispatch({ type: 'SET_WORLD_STAGE', payload: 5 });
            dispatch({ type: 'GO_TO_SCENE', payload: 'world' });
          }} />
      )}
      {state.scene === 'boss_fight' && (
        <PlaceholderScene title="🔥 보스전" description="(별도 이슈에서 구현 예정)"
          onContinue={() => dispatch({ type: 'GO_TO_SCENE', payload: 'ending' })} />
      )}
      {state.scene === 'ending' && <EndingScene />}
    </div>
  );
}
