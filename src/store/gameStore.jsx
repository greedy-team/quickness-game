import { createContext, useContext, useReducer } from 'react';

const initialState = {
  scene: 'intro',         // 'intro' | 'world' | 'minigame_1~3' | 'armor' | 'minigame_4' | 'boss_fight' | 'ending'
  worldStage: 0,          // 0..3
  totalScore: 0,
  hasArmor: false,
  bossHP: 1500,           // PRD §3.2 자리만 (옵션 A에서 미사용)
  lastMiniScore: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'GO_TO_SCENE':
      return { ...state, scene: action.payload };
    case 'SET_WORLD_STAGE':
      return { ...state, worldStage: action.payload };
    case 'ADD_SCORE':
      return {
        ...state,
        totalScore: state.totalScore + action.payload,
        lastMiniScore: action.payload,
      };
    case 'EQUIP_ARMOR':
      return { ...state, hasArmor: true };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
