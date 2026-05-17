import { io } from 'socket.io-client';

// 本番環境（Viteのビルド後）は同一ホストに繋ぐため undefined にする
const SERVER_URL = import.meta.env.PROD 
  ? undefined 
  : (import.meta.env.VITE_SERVER_URL || 'http://localhost:3001');

const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

export default socket;
