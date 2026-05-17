import { useGame } from '../context/GameContext';
import socket from '../socket';

export default function ResultsScreen() {
  const { state } = useGame();
  const { roundResults, role, roomCode, questionNumber, totalQuestions } = state;

  if (!roundResults) return null;

  const { correctYear, explanation, genre, question, results, scores } = roundResults;
  const isHost = role === 'host';
  const isLastQuestion = questionNumber >= totalQuestions;

  const handleNext = () => {
    socket.emit('next-question', { roomCode });
  };

  const sortedScores = [...(scores || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="screen">
      <div className="question-header">
        <div className="question-progress">Q{questionNumber} / {totalQuestions} 結果</div>
        <span className={`genre-badge genre-${genre}`}>{genre}</span>
      </div>

      <div className="card">
        <div className="question-text" style={{ fontSize: '0.95rem', marginBottom: '16px' }}>
          {question}
        </div>

        <div className="results-correct">
          <div className="results-correct-label">正解</div>
          <div className="results-correct-year">{correctYear}年</div>
        </div>

        <div className="results-explanation">{explanation}</div>

        <div>
          {results
            .sort((a, b) => a.diff - b.diff)
            .map((r) => (
              <div
                key={r.playerId}
                className={`result-player-row ${r.score === 3 ? 'perfect' : r.score === 1 ? 'nearpin' : ''}`}
              >
                <span className="result-name">{r.name}</span>
                <span className="result-answer">{r.answer}年</span>
                <span className={`result-diff ${r.diff === 0 ? 'exact' : r.diff <= 3 ? 'close' : 'far'}`}>
                  {r.diff === 0 ? 'ピタリ！' : `±${r.diff}年`}
                </span>
                <span className={`result-score ${r.score > 0 ? 'has-score' : ''}`}>
                  {r.score > 0 ? `+${r.score}` : '-'}
                </span>
              </div>
            ))}
        </div>
      </div>

      <div className="card scoreboard">
        <div className="scoreboard-title">📊 現在のスコア</div>
        {sortedScores.map((s, i) => (
          <div key={s.id} className="scoreboard-row">
            <span className="scoreboard-rank">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
            </span>
            <span className="scoreboard-name">{s.name}</span>
            <span className="scoreboard-score">{s.score}pt</span>
          </div>
        ))}
      </div>

      {isHost && (
        <button className="btn btn-primary mt-lg" onClick={handleNext}>
          {isLastQuestion ? '🏆 最終結果を見る' : '➡️ 次の問題へ'}
        </button>
      )}

      {!isHost && (
        <div className="card mt-md" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {isLastQuestion ? 'ホストが最終結果を表示します...' : 'ホストが次の問題へ進みます...'}
          </p>
        </div>
      )}
    </div>
  );
}
