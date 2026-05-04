// WebSocket-сервис — Socket.io, комнаты: parking, user, admin
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');

let io = null;

// Инициализация Socket.io
const initWebSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin.split(',').map((s) => s.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  // Аутентификация — анонимные подключения разрешены (для карты)
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) { socket.user = null; return next(); }
    try {
      socket.user = jwt.verify(token, config.jwtSecret);
    } catch {
      socket.user = null;
    }
    next();
  });

  io.on('connection', (socket) => {
    // Подписка на обновления конкретной парковки
    socket.on('subscribe:parking', (id) => socket.join(`parking:${id}`));
    socket.on('unsubscribe:parking', (id) => socket.leave(`parking:${id}`));

    // Личные уведомления (только авторизованные)
    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
      if (socket.user.role === 'admin') socket.join('admin');
    }
  });

  console.log('WebSocket сервер запущен');
  return io;
};

// Геттер инстанса io
const getIO = () => io;

// Отправить событие пользователю
const emitToUser = (userId, event, data) => io?.to(`user:${userId}`).emit(event, data);

// Отправить событие админам
const emitToAdmins = (event, data) => io?.to('admin').emit(event, data);

// Отправить обновление подписчикам парковки
const emitToParkingSubscribers = (lotId, event, data) => io?.to(`parking:${lotId}`).emit(event, data);

module.exports = { initWebSocket, getIO, emitToUser, emitToAdmins, emitToParkingSubscribers };
