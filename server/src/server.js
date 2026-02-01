// Точка входа — запуск HTTP-сервера, WebSocket, MQTT, планировщик
const http = require('http');
const app = require('./app');
const config = require('./config');
const connectDB = require('./config/db');
const { initWebSocket } = require('./services/wsService');
const { initMqtt } = require('./services/mqttService');
const { startBookingScheduler } = require('./services/bookingScheduler');

const startServer = async () => {
  await connectDB();                           // 1. MongoDB
  const server = http.createServer(app);       // 2. HTTP
  const io = initWebSocket(server);            // 3. WebSocket
  app.set('io', io);

  try { initMqtt(io); } catch (e) {            // 4. MQTT (опционально)
    console.warn('MQTT недоступен:', e.message);
  }

  startBookingScheduler(io);                   // 5. Планировщик

  server.listen(config.port, () => {           // 6. Запуск
    console.log(`\n  Smart Parking | ${config.nodeEnv} | :${config.port}`);
    console.log(`  API: http://localhost:${config.port}/api\n`);
  });

  // Корректное завершение
  const shutdown = (sig) => {
    console.log(`\n${sig} — завершаем...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
};

startServer().catch((err) => { console.error('Ошибка запуска:', err); process.exit(1); });
