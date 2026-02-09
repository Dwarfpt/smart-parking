// WebSocket-клиент (Socket.io) — подключение, подписка на парковки
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';
let socket = null;

// Подключение к WebSocket серверу
export const connectSocket = (token) => {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });
  return socket;
};

// Отключение
export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};

// Геттер
export const getSocket = () => socket;

// Подписка / отписка от обновлений парковки
export const subscribeToParking = (id) => socket?.emit('subscribe:parking', id);
export const unsubscribeFromParking = (id) => socket?.emit('unsubscribe:parking', id);
