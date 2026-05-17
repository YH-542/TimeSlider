import { useMemo } from 'react';
import { useGame } from '../context/GameContext';
import socket from '../socket';

function Confetti() {
  const pieces = useMemo(() => {
    const colors = ['#6C5CE7', '#FF6B6B', '#FECA57', '#00D2D3', '#a855f7', '#ff9f43'];
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${2 + Math.random() * 2}s`,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 8,
      shape: Math.random() > 0.5 ? '50%' : '2px',
    }));
  }, []);

  return (
    <div className="confetti-container">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            borderRadius: p.shape,
          }}
        />
      ))}
    </div>
  );
}

export default function FinalScreen() {
  const { state, resetGame } = useGame();
  const { finalScores, role, roomCode } = state;
  const isHost = role === 'host';

  if (!finalScores) return null;

  const rankEmojis = ['🥇', '🥈', '🥉'];

  const handleBackToLobby = () => {
    socket.emit('back-to-lobby', { roomCode });
  };

  const handleGoHome = () => {
    resetGame();
  };

  return (
    <div className="screen final-screen">
      <Confetti />

      <div className="final-title">🏆 最終結果発表！</div>
      <div className="final-subtitle">お疲れさまでした！</div>

      <div className="final-podium">
        {finalScores.map((s, i) => (
          <div key={s.id} className="podium-item">
            <span className="podium-rank">
              {i < 3 ? rankEmojis[i] : `${i + 1}.`}
            </span>
            <span className="podium-name">{s.name}</span>
            <span className="podium-score">
              {s.score}<span className="podium-pts">pt</span>
            </span>
          </div>
        ))}
      </div>

      {isHost && (
        <>
          <button className="btn btn-primary" onClick={handleBackToLobby}>
            🔄 もう一度遊ぶ
          </button>
          <button className="btn btn-outline" onClick={handleGoHome}>
            🏠 ホームに戻る
          </button>
        </>
      )}

      {!isHost && (
        <button className="btn btn-outline" onClick={handleGoHome}>
          🏠 ホームに戻る
        </button>
      )}
    </div>
  );
}
