import { createContext, useContext, useReducer, useCallback } from 'react';

const GameContext = createContext(null);

const initialState = {
  role: null, // 'host' | 'player'
  roomCode: null,
  playerName: null,
  players: [],
  gamePhase: 'home', // home | lobby | playing | waiting | results | finished
  currentQuestion: null,
  questionNumber: 0,
  totalQuestions: 0,
  roundResults: null,
  finalScores: null,
  scores: {},
  hasAnswered: false,
  answeredCount: 0,
  totalPlayers: 0,
  error: null,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, role: action.payload };
    case 'SET_ROOM_CODE':
      return { ...state, roomCode: action.payload };
    case 'SET_PLAYER_NAME':
      return { ...state, playerName: action.payload };
    case 'UPDATE_PLAYERS':
      return { ...state, players: action.payload };
    case 'SET_GAME_PHASE':
      return { ...state, gamePhase: action.payload };
    case 'GAME_STARTED':
      return {
        ...state,
        gamePhase: 'playing',
        totalQuestions: action.payload.totalQuestions,
      };
    case 'NEW_QUESTION':
      return {
        ...state,
        gamePhase: 'playing',
        currentQuestion: {
          genre: action.payload.genre,
          question: action.payload.question,
        },
        questionNumber: action.payload.questionNumber,
        totalQuestions: action.payload.totalQuestions,
        scores: action.payload.scores || state.scores,
        hasAnswered: false,
        answeredCount: 0,
        roundResults: null,
      };
    case 'PLAYER_ANSWERED':
      return {
        ...state,
        answeredCount: action.payload.answeredCount,
        totalPlayers: action.payload.totalPlayers,
      };
    case 'SET_HAS_ANSWERED':
      return { ...state, hasAnswered: true, gamePhase: 'waiting' };
    case 'ROUND_RESULTS':
      return {
        ...state,
        gamePhase: 'results',
        roundResults: action.payload,
      };
    case 'GAME_OVER':
      return {
        ...state,
        gamePhase: 'finished',
        finalScores: action.payload.finalScores,
      };
    case 'BACK_TO_LOBBY':
      return {
        ...state,
        gamePhase: 'lobby',
        currentQuestion: null,
        questionNumber: 0,
        roundResults: null,
        finalScores: null,
        hasAnswered: false,
        scores: {},
      };
    case 'RESET':
      return { ...initialState };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch, resetGame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
