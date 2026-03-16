// ============================================================
//  Smart Parking — Express приложение
//  Middleware: helmet, CORS, rate-limit, morgan
//  API маршруты: /api/auth, /api/parking, /api/bookings и др.
// ============================================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');

const app = express();

// ——————————— Middleware ———————————

app.set('trust proxy', 1);                            // Доверяем Docker/nginx прокси
app.use(helmet());                                    // Безопасные HTTP-заголовки
app.use(cors({                                        // CORS для фронтенда
  origin: config.corsOrigin.split(',').map(s => s.trim()),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));             // JSON-парсинг
app.use(express.urlencoded({ extended: true }));      // URL-encoded
app.use(express.raw({ type: 'image/*', limit: '5mb' }));  // Бинарные изображения от ESP32-CAM
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined')); // Логирование

// Ограничение запросов — общий + строгий для авторизации
const isDev = config.nodeEnv === 'development';
app.use('/api/',     rateLimit({ windowMs: 15 * 60_000, max: isDev ? 1000 : 200 }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, max: isDev ? 100  : 30  }));

// ——————————— Маршруты API ———————————

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/parking',  require('./routes/parking'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/tariffs',  require('./routes/tariffs'));
app.use('/api/support',  require('./routes/support'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/iot',      require('./routes/iot'));
app.use('/api/iot/camera', require('./routes/camera'));  // ESP32-CAM: QR-сканер

// Проверка здоровья сервера
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime(), env: config.nodeEnv });
});

// ——————————— Обработка ошибок ———————————

app.use((req, res) => res.status(404).json({ message: 'Маршрут не найден' }));

app.use((err, req, res, _next) => {
  console.error('Необработанная ошибка:', err);
  res.status(500).json({
    message: isDev ? err.message : 'Внутренняя ошибка сервера',
  });
});

module.exports = app;
