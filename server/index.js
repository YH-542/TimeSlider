import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());

// フロントエンドのビルド結果（dist）を静的ファイルとして配信
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// その他のリクエストはすべてReactのindex.htmlを返す（ルーティング用）
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Load questions
const questionsPath = join(__dirname, '..', 'public', 'questions.json');
const allQuestions = JSON.parse(readFileSync(questionsPath, 'utf-8'));

// In-memory rooms store
const rooms = {};

function generateRoomCode() {
  let code;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (rooms[code]);
  return code;
}

function calculateScores(answers, correctYear) {
  const results = [];
  let hasPerfect = false;

  // First pass: check for perfect matches and collect timestamps
  for (const [playerId, data] of Object.entries(answers)) {
    const diff = Math.abs(data.answer - correctYear);
    if (diff === 0) hasPerfect = true;
    results.push({ playerId, answer: data.answer, diff, timestamp: data.timestamp, score: 0 });
  }

  if (hasPerfect) {
    // ピタリ賞が複数いる場合、一番早い人に3点
    const perfects = results.filter((r) => r.diff === 0);
    perfects.sort((a, b) => a.timestamp - b.timestamp);
    perfects[0].score = 3;
  } else {
    // ニアピン賞が複数いる場合、一番早い人に1点
    const minDiff = Math.min(...results.map((r) => r.diff));
    const nearests = results.filter((r) => r.diff === minDiff);
    nearests.sort((a, b) => a.timestamp - b.timestamp);
    nearests[0].score = 1;
  }

  return results;
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Host creates a room
  socket.on('create-room', (callback) => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      host: socket.id,
      players: {},
      state: 'lobby', // lobby | playing | results | finished
      currentQuestionIndex: 0,
      questions: [],
      answers: {},
      scores: {},
      roundResults: [],
    };
    socket.join(roomCode);
    socket.roomCode = roomCode;
    console.log(`Room created: ${roomCode} by ${socket.id}`);
    callback({ success: true, roomCode });
  });

  // Player joins a room
  socket.on('join-room', ({ roomCode, name, birthYear }, callback) => {
    const room = rooms[roomCode];
    if (!room) {
      return callback({ success: false, error: 'ルームが見つかりません' });
    }
    if (room.state !== 'lobby') {
      return callback({ success: false, error: 'ゲームは既に開始されています' });
    }
    const playerCount = Object.keys(room.players).length;
    if (playerCount >= 4) {
      return callback({ success: false, error: 'ルームが満員です（最大4人）' });
    }

    room.players[socket.id] = {
      name,
      birthYear: parseInt(birthYear),
      socketId: socket.id,
    };
    room.scores[socket.id] = 0;

    socket.join(roomCode);
    socket.roomCode = roomCode;

    // Notify all in room about updated player list
    io.to(roomCode).emit('players-updated', {
      players: Object.values(room.players).map((p) => ({
        id: p.socketId,
        name: p.name,
        birthYear: p.birthYear,
      })),
    });

    console.log(`${name} joined room ${roomCode}`);
    callback({ success: true });
  });

  // Host starts the game
  socket.on('start-game', ({ roomCode, questionCount = 10, selectedGenres = [] }) => {
    const room = rooms[roomCode];
    if (!room || room.host !== socket.id) return;

    // Filter questions based on youngest player's birth year
    const birthYears = Object.values(room.players).map((p) => p.birthYear);
    const baseYear = Math.max(...birthYears);

    let filtered = allQuestions.filter((q) => q.answerYear >= baseYear);

    // Filter by selected genres if any are chosen
    if (selectedGenres && selectedGenres.length > 0) {
      filtered = filtered.filter((q) => selectedGenres.includes(q.genre));
    }

    // Shuffle and pick questions
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    room.questions = shuffled.slice(0, Math.min(questionCount, shuffled.length));

    if (room.questions.length === 0) {
      io.to(roomCode).emit('error', { message: '出題可能な問題がありません' });
      return;
    }

    room.state = 'playing';
    room.currentQuestionIndex = 0;
    room.answers = {};

    const q = room.questions[0];
    io.to(roomCode).emit('game-started', {
      totalQuestions: room.questions.length,
    });

    // Small delay before first question
    setTimeout(() => {
      io.to(roomCode).emit('new-question', {
        questionNumber: 1,
        totalQuestions: room.questions.length,
        genre: q.genre,
        question: q.question,
        scores: room.scores,
      });
    }, 500);

    console.log(`Game started in room ${roomCode} with ${room.questions.length} questions`);
  });

  // Player submits answer
  socket.on('submit-answer', ({ roomCode, answer }) => {
    const room = rooms[roomCode];
    if (!room || room.state !== 'playing') return;

    room.answers[socket.id] = {
      answer: parseInt(answer),
      timestamp: Date.now()
    };

    // Notify that this player answered
    io.to(roomCode).emit('player-answered', {
      playerId: socket.id,
      answeredCount: Object.keys(room.answers).length,
      totalPlayers: Object.keys(room.players).length,
    });

    // Check if all players answered
    const allAnswered =
      Object.keys(room.answers).length === Object.keys(room.players).length;

    if (allAnswered) {
      const currentQ = room.questions[room.currentQuestionIndex];
      const results = calculateScores(room.answers, currentQ.answerYear);

      // Update total scores
      for (const r of results) {
        room.scores[r.playerId] = (room.scores[r.playerId] || 0) + r.score;
      }

      // Build round results with player names
      const roundResults = results.map((r) => ({
        ...r,
        name: room.players[r.playerId]?.name || 'Unknown',
        totalScore: room.scores[r.playerId],
      }));

      room.roundResults.push(roundResults);

      // Emit results
      io.to(roomCode).emit('round-results', {
        correctYear: currentQ.answerYear,
        explanation: currentQ.explanation,
        question: currentQ.question,
        genre: currentQ.genre,
        results: roundResults,
        scores: Object.entries(room.scores).map(([id, score]) => ({
          id,
          name: room.players[id]?.name || 'Unknown',
          score,
        })),
        questionNumber: room.currentQuestionIndex + 1,
        totalQuestions: room.questions.length,
      });
    }
  });

  // Host advances to next question
  socket.on('next-question', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.host !== socket.id) return;

    room.currentQuestionIndex++;
    room.answers = {};

    if (room.currentQuestionIndex >= room.questions.length) {
      // Game over
      room.state = 'finished';
      const finalScores = Object.entries(room.scores)
        .map(([id, score]) => ({
          id,
          name: room.players[id]?.name || 'Unknown',
          score,
        }))
        .sort((a, b) => b.score - a.score);

      io.to(roomCode).emit('game-over', { finalScores });
      return;
    }

    room.state = 'playing';
    const q = room.questions[room.currentQuestionIndex];

    io.to(roomCode).emit('new-question', {
      questionNumber: room.currentQuestionIndex + 1,
      totalQuestions: room.questions.length,
      genre: q.genre,
      question: q.question,
      scores: room.scores,
    });
  });

  // Back to lobby
  socket.on('back-to-lobby', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.host !== socket.id) return;

    room.state = 'lobby';
    room.currentQuestionIndex = 0;
    room.questions = [];
    room.answers = {};
    room.roundResults = [];
    // Reset scores
    for (const id of Object.keys(room.scores)) {
      room.scores[id] = 0;
    }

    io.to(roomCode).emit('back-to-lobby');
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    const roomCode = socket.roomCode;
    if (!roomCode || !rooms[roomCode]) return;

    const room = rooms[roomCode];

    if (room.host === socket.id) {
      // Host left, destroy room
      io.to(roomCode).emit('room-closed');
      delete rooms[roomCode];
      console.log(`Room ${roomCode} destroyed (host left)`);
    } else {
      // Player left
      delete room.players[socket.id];
      delete room.scores[socket.id];

      io.to(roomCode).emit('players-updated', {
        players: Object.values(room.players).map((p) => ({
          id: p.socketId,
          name: p.name,
          birthYear: p.birthYear,
        })),
      });

      // If in playing state and all remaining players have answered
      if (room.state === 'playing') {
        delete room.answers[socket.id];
        const allAnswered =
          Object.keys(room.answers).length ===
          Object.keys(room.players).length;
        if (allAnswered && Object.keys(room.players).length > 0) {
          const currentQ = room.questions[room.currentQuestionIndex];
          const results = calculateScores(room.answers, currentQ.answerYear);
          for (const r of results) {
            room.scores[r.playerId] = (room.scores[r.playerId] || 0) + r.score;
          }
          const roundResults = results.map((r) => ({
            ...r,
            name: room.players[r.playerId]?.name || 'Unknown',
            totalScore: room.scores[r.playerId],
          }));
          io.to(roomCode).emit('round-results', {
            correctYear: currentQ.answerYear,
            explanation: currentQ.explanation,
            question: currentQ.question,
            genre: currentQ.genre,
            results: roundResults,
            scores: Object.entries(room.scores).map(([id, score]) => ({
              id,
              name: room.players[id]?.name || 'Unknown',
              score,
            })),
            questionNumber: room.currentQuestionIndex + 1,
            totalQuestions: room.questions.length,
          });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🎮 Server running on http://localhost:${PORT}`);
});
