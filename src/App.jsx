import { useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import socket from './socket';
import HomeScreen from './components/HomeScreen';
import LobbyScreen from './components/LobbyScreen';
import QuizScreen from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';
import FinalScreen from './components/FinalScreen';
import './index.css';

function AnimatedBackground() {
  return (
    <div className="app-bg">
      <div className="orb" />
      <div className="orb" />
      <div className="orb" />
    </div>
  );
}

function ErrorToast() {
  const { state, dispatch } = useGame();
  useEffect(() => {
    if (state.error) {
      const t = setTimeout(() => dispatch({ type: 'CLEAR_ERROR' }), 3000);
      return () => clearTimeout(t);
    }
  }, [state.error, dispatch]);

  if (!state.error) return null;
  return <div className="error-toast">{state.error}</div>;
}

function GameRouter() {
  const { state, dispatch } = useGame();

  useEffect(() => {
    const onNewQuestion = (data) => dispatch({ type: 'NEW_QUESTION', payload: data });
    const onPlayerAnswered = (data) => dispatch({ type: 'PLAYER_ANSWERED', payload: data });
    const onRoundResults = (data) => dispatch({ type: 'ROUND_RESULTS', payload: data });
    const onGameOver = (data) => dispatch({ type: 'GAME_OVER', payload: data });
    const onBackToLobby = () => dispatch({ type: 'BACK_TO_LOBBY' });
    const onRoomClosed = () => {
      dispatch({ type: 'SET_ERROR', payload: 'ホストが退出したためルームが閉じられました' });
      dispatch({ type: 'RESET' });
    };
    const onError = ({ message }) => dispatch({ type: 'SET_ERROR', payload: message });

    socket.on('new-question', onNewQuestion);
    socket.on('player-answered', onPlayerAnswered);
    socket.on('round-results', onRoundResults);
    socket.on('game-over', onGameOver);
    socket.on('back-to-lobby', onBackToLobby);
    socket.on('room-closed', onRoomClosed);
    socket.on('error', onError);

    return () => {
      socket.off('new-question', onNewQuestion);
      socket.off('player-answered', onPlayerAnswered);
      socket.off('round-results', onRoundResults);
      socket.off('game-over', onGameOver);
      socket.off('back-to-lobby', onBackToLobby);
      socket.off('room-closed', onRoomClosed);
      socket.off('error', onError);
    };
  }, [dispatch]);

  switch (state.gamePhase) {
    case 'home':
      return <HomeScreen />;
    case 'lobby':
      return <LobbyScreen />;
    case 'playing':
    case 'waiting':
      return <QuizScreen />;
    case 'results':
      return <ResultsScreen />;
    case 'finished':
      return <FinalScreen />;
    default:
      return <HomeScreen />;
  }
}

export default function App() {
  return (
    <GameProvider>
      <AnimatedBackground />
      <GameRouter />
      <ErrorToast />
    </GameProvider>
  );
}
