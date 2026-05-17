import { useState } from 'react';
import socket from '../socket';
import { useGame } from '../context/GameContext';

export default function HomeScreen() {
  const { dispatch } = useGame();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = () => {
    setLoading(true);
    socket.emit('create-room', (res) => {
      setLoading(false);
      if (res.success) {
        dispatch({ type: 'SET_ROLE', payload: 'host' });
        dispatch({ type: 'SET_ROOM_CODE', payload: res.roomCode });
        dispatch({ type: 'SET_GAME_PHASE', payload: 'lobby' });
      }
    });
  };

  const handleJoinRoom = () => {
    if (joinCode.length !== 4) return;
    dispatch({ type: 'SET_ROLE', payload: 'player' });
    dispatch({ type: 'SET_ROOM_CODE', payload: joinCode });
    dispatch({ type: 'SET_GAME_PHASE', payload: 'lobby' });
  };

  return (
    <div className="screen">
      <div style={{ marginBottom: '40px' }}>
        <div className="title-main">🎯 年代あてクイズ！</div>
        <div className="title-main" style={{ fontSize: '1.6rem', marginTop: '-4px' }}>それいつの？</div>
        <p className="title-sub">みんなで年代を当てよう！</p>
      </div>

      <div className="card">
        <div className="card-title">🏠 ルームを作る（ホスト）</div>
        <button
          className="btn btn-primary"
          onClick={handleCreateRoom}
          disabled={loading}
        >
          {loading ? '作成中...' : 'ルームを作成する'}
        </button>
      </div>

      <div className="card">
        <div className="card-title">🚪 ルームに参加する</div>
        <div className="input-group">
          <label>ルームコード（4桁）</label>
          <input
            className="input-field"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="1234"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleJoinRoom}
          disabled={joinCode.length !== 4}
        >
          参加する
        </button>
      </div>
    </div>
  );
}
