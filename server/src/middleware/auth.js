// Middleware аутентификации и авторизации
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

// Проверка JWT токена — добавляет req.user
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Нет токена доступа.' });
    }

    const decoded = jwt.verify(header.split(' ')[1], config.jwtSecret);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Пользователь не найден или деактивирован.' });
    }

    req.user = user;
    next();
  } catch (error) {
    const msg = error.name === 'TokenExpiredError' ? 'Токен истёк.' : 'Неверный токен.';
    return res.status(401).json({ message: msg });
  }
};

// Проверка роли пользователя
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Требуется авторизация.' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Недостаточно прав.' });
  }
  next();
};

module.exports = { auth, requireRole };
