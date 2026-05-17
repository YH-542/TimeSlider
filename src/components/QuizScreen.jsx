import { useState, useEffect, useCallback } from 'react';
import socket from '../socket';
import { useGame } from '../context/GameContext';

export default function QuizScreen() {
  const { state, dispatch } = useGame();
  const { currentQuestion, questionNumber, totalQuestions, roomCode, hasAnswered, answeredCount, totalPlayers } = state;

  const currentYear = new Date().getFullYear();
  const minYear = 1990;
  const maxYear = currentYear;
  const midYear = Math.round((minYear + maxYear) / 2);

  const [sliderValue, setSliderValue] = useState(midYear);

  // Reset slider on new question
  useEffect(() => {
    setSliderValue(midYear);
  }, [questionNumber, midYear]);

  const handleSliderChange = useCallback((e) => {
    setSliderValue(parseInt(e.target.value));
  }, []);

  const handleSubmit = () => {
    if (hasAnswered) return;
    socket.emit('submit-answer', { roomCode, answer: sliderValue });
    dispatch({ type: 'SET_HAS_ANSWERED' });
  };

  const progress = ((sliderValue - minYear) / (maxYear - minYear)) * 100;

  if (!currentQuestion) return null;

  if (hasAnswered) {
    return (
      <div className="screen">
        <div className="card">
          <div className="waiting-overlay">
            <div className="waiting-spinner" />
            <div className="waiting-text">他のプレイヤーの回答を待っています...</div>
            <div className="waiting-count">
              {answeredCount} / {totalPlayers} 人が回答済み
            </div>
            <div style={{ marginTop: '20px', fontSize: '1.2rem', color: 'var(--primary-light)' }}>
              あなたの回答: <strong>{sliderValue}年</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="question-header">
        <div className="question-progress">
          Q{questionNumber} / {totalQuestions}
        </div>
        <span className={`genre-badge genre-${currentQuestion.genre}`}>
          {currentQuestion.genre}
        </span>
      </div>

      <div className="card">
        <div className="question-text">{currentQuestion.question}</div>

        <div className="slider-container">
          <div className="slider-year-display">
            <span className="slider-year-value">{sliderValue}</span>
            <span className="slider-year-unit">年</span>
          </div>

          <div className="slider-track-wrapper">
            <input
              className="slider-input"
              type="range"
              min={minYear}
              max={maxYear}
              value={sliderValue}
              onChange={handleSliderChange}
              style={{ '--progress': `${progress}%` }}
            />
          </div>

          <div className="slider-labels">
            <span>{minYear}</span>
            <span>{maxYear}</span>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={handleSubmit}>
          ✅ この年で決定！
        </button>
      </div>
    </div>
  );
}
