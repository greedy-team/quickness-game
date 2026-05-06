// src/store/gameStore.jsx
import { createContext, useContext, useReducer } from 'react';

const initialState = {
  // 'intro' | 'world' | 'minigame_1' | 'minigame_2' | 'minigame_3' | 'armor'
  // | 'minigame_4' | 'boss_fight' | 'nickname_input' | 'ranking' | 'ending'
  scene: 'intro',
  worldStage: 0,
  totalScore: 0,
  hasArmor: false,
  lastMiniScore: null,
  rankingMode: null,                // 'after_clear' | 'readonly' | null
  lastRegisteredEntryId: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'GO_TO_SCENE':
      return { ...state, scene: action.payload };
    case 'GO_TO_RANKING':
      // payload: 'after_clear' | 'readonly'
      return { ...state, scene: 'ranking', rankingMode: action.payload };
    case 'SET_LAST_RANKING_ENTRY':
      return { ...state, lastRegisteredEntryId: action.payload };
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
