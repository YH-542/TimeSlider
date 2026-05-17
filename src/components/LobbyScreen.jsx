import { useState, useEffect } from 'react';
import socket from '../socket';
import { useGame } from '../context/GameContext';

export default function LobbyScreen() {
  const { state, dispatch } = useGame();
  const { role, roomCode, players } = state;
  const isHost = role === 'host';

  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const allGenres = ['音楽', '映画', 'アニメ', 'ゲーム', '歴史', '流行語'];
  const [selectedGenres, setSelectedGenres] = useState([]);  // empty = all

  const toggleGenre = (genre) => {
    if (genre === 'all') {
      setSelectedGenres([]);
      return;
    }
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) {
        return prev.filter((g) => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
  };

  const isAllSelected = selectedGenres.length === 0;

  useEffect(() => {
    const handlePlayersUpdated = ({ players: p }) => {
      dispatch({ type: 'UPDATE_PLAYERS', payload: p });
    };

    const handleGameStarted = (data) => {
      dispatch({ type: 'GAME_STARTED', payload: data });
    };

    socket.on('players-updated', handlePlayersUpdated);
    socket.on('game-started', handleGameStarted);

    return () => {
      socket.off('players-updated', handlePlayersUpdated);
      socket.off('game-started', handleGameStarted);
    };
  }, [dispatch]);

  const handleJoin = () => {
    if (!name.trim() || !birthYear) return;
    const year = parseInt(birthYear);
    if (year < 1950 || year > 2020) {
      setJoinError('誕生年は1950〜2020の範囲で入力してください');
      return;
    }
    setJoinError('');

    socket.emit('join-room', { roomCode, name: name.trim(), birthYear: year }, (res) => {
      if (res.success) {
        setJoined(true);
        dispatch({ type: 'SET_PLAYER_NAME', payload: name.trim() });
      } else {
        setJoinError(res.error);
      }
    });
  };

  const handleStart = () => {
    socket.emit('start-game', { roomCode, questionCount, selectedGenres });
  };

  // ホスト・ゲスト共通: まだ参加登録していない場合は入力フォームを表示
  if (!joined) {
    return (
      <div className="screen">
        <div className="title-main" style={{ fontSize: '1.5rem' }}>
          {isHost ? '🏠 ルーム作成完了！' : '🚪 ルームに参加'}
        </div>
        <div className="room-code-display">
          <div className="room-code-label">ルームコード</div>
          <div className="room-code-value">{roomCode}</div>
        </div>

        {isHost && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '16px', fontSize: '0.9rem' }}>
            このコードを他のプレイヤーに共有してください。<br />
            まずあなたの情報を入力して入室しましょう！
          </p>
        )}

        <div className="card">
          <div className="card-title">{isHost ? '👤 あなたの情報' : '👤 プレイヤー情報'}</div>
          <div className="input-group">
            <label>ニックネーム</label>
            <input
              className="input-field"
              type="text"
              maxLength={8}
              placeholder="たろう"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>誕生年（西暦）</label>
            <input
              className="input-field"
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="2000"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          {joinError && (
            <p style={{ color: '#FF6B6B', fontSize: '0.85rem', marginBottom: '12px' }}>
              {joinError}
            </p>
          )}
          <button
            className="btn btn-primary"
            onClick={handleJoin}
            disabled={!name.trim() || birthYear.length !== 4}
          >
            入室する
          </button>
        </div>
      </div>
    );
  }

  const avatarEmojis = ['🐱', '🐶', '🐰', '🦊'];

  return (
    <div className="screen">
      <div className="title-main" style={{ fontSize: '1.5rem' }}>🎮 待機室</div>

      <div className="room-code-display">
        <div className="room-code-label">ルームコード</div>
        <div className="room-code-value">{roomCode}</div>
      </div>

      <div className="card">
        <div className="card-title">👥 参加者</div>
        {players.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
            プレイヤーの参加を待っています...
          </p>
        ) : (
          <ul className="player-list">
            {players.map((p, i) => (
              <li key={p.id} className="player-item">
                <div className={`player-avatar c${i % 4}`}>{avatarEmojis[i % 4]}</div>
                <span className="player-name">{p.name}</span>
                <span className="player-birth">{p.birthYear}年生</span>
              </li>
            ))}
          </ul>
        )}
        <div className="player-count">{players.length} / 4 人</div>
      </div>

      {isHost && (
        <>
          <div className="card">
            <div className="card-title">🏷️ ジャンル</div>
            <div className="genre-select">
              <button
                className={`genre-option ${isAllSelected ? 'active' : ''}`}
                onClick={() => toggleGenre('all')}
              >
                🎯 すべて
              </button>
              {allGenres.map((g) => {
                const emojis = { '音楽': '🎵', '映画': '🎬', 'アニメ': '📺', 'ゲーム': '🎮', '歴史': '📖', '流行語': '💬' };
                return (
                  <button
                    key={g}
                    className={`genre-option ${!isAllSelected && selectedGenres.includes(g) ? 'active' : ''}`}
                    onClick={() => toggleGenre(g)}
                  >
                    {emojis[g]} {g}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-title">⚙️ 出題数</div>
            <div className="question-count-select">
              {[5, 10, 20, 30].map((n) => (
                <button
                  key={n}
                  className={`count-option ${questionCount === n ? 'active' : ''}`}
                  onClick={() => setQuestionCount(n)}
                >
                  {n}問
                </button>
              ))}
            </div>
            <button
              className="btn btn-secondary"
              onClick={handleStart}
            >
              🚀 ゲームスタート！（{players.length}人参加中）
            </button>
            {players.length === 1 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center', marginTop: '8px' }}>
                ※ 1人プレイモード（スコアアタック）で開始します
              </p>
            )}
          </div>
        </>
      )}

      {!isHost && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            ホストがゲームを開始するまでお待ちください...
          </p>
          <div className="waiting-spinner" style={{ marginTop: '16px' }} />
        </div>
      )}
    </div>
  );
}
