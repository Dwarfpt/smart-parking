// Маршруты авторизации — регистрация, вход, OTP, Google OAuth, refresh
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const config = require('../config');
const User = require('../models/User');
const { validate } = require('../middleware/validate');
const { generateOTP, sendOTP } = require('../services/emailService');
const { auth } = require('../middleware/auth');

// — Регистрация —
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password, name, phone } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists.' });
      }

      // Создание пользователя (не верифицирован)
      const user = await User.create({ email, password, name, phone });

      // Генерация и отправка OTP
      const otp = generateOTP();
      user.otpCode = otp;
      user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 минут
      await user.save();

      await sendOTP(email, otp, 'verification');

      // Генерация временного токена для OTP верификации
      const tempToken = jwt.sign({ id: user._id, role: user.role, pendingOtp: true }, config.jwtSecret, {
        expiresIn: '15m',
      });

      const response = {
        message: 'Registration successful. Please verify your email.',
        requireOtp: true,
        tempToken,
        user: user.toJSON(),
      };

      // В dev-режиме возвращаем OTP для тестирования
      if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
        response.otp = otp;
      }

      res.status(201).json(response);
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      res.status(500).json({ message: 'Server error during registration.' });
    }
  }
);

// — Вход —
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password +otpCode +otpExpiry');
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      // Если 2FA включена — отправляем OTP
      if (user.twoFactorEnabled) {
        const otp = generateOTP();
        user.otpCode = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await sendOTP(email, otp, 'login');

        const tempToken = jwt.sign({ id: user._id, role: user.role, pendingOtp: true }, config.jwtSecret, {
          expiresIn: '15m',
        });

        const response = {
          message: 'OTP sent to your email.',
          requireOtp: true,
          tempToken,
        };

        if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
          response.otp = otp;
        }

        return res.json(response);
      }

      // 2FA выключена — выдаём токен сразу
      const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn,
      });

      res.json({
        message: 'Login successful',
        token,
        user: user.toJSON(),
      });
    } catch (error) {
      console.error('Ошибка входа:', error);
      res.status(500).json({ message: 'Server error during login.' });
    }
  }
);

// — Подтверждение OTP —
router.post(
  '/verify-otp',
  [
    body('tempToken').notEmpty().withMessage('Token is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('Valid OTP code is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { tempToken, otp } = req.body;

      // Декодируем temp-токен
      let decoded;
      try {
        decoded = jwt.verify(tempToken, config.jwtSecret);
      } catch {
        return res.status(401).json({ message: 'Token expired. Please try again.' });
      }

      if (!decoded.pendingOtp) {
        return res.status(400).json({ message: 'Invalid token.' });
      }

      const user = await User.findById(decoded.id).select('+otpCode +otpExpiry');
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      // Проверка OTP
      if (!user.otpCode || user.otpCode !== otp) {
        return res.status(400).json({ message: 'Invalid OTP code.' });
      }

      if (user.otpExpiry < new Date()) {
        return res.status(400).json({ message: 'OTP code expired.' });
      }

      // Очистка OTP и верификация email
      user.otpCode = undefined;
      user.otpExpiry = undefined;
      user.isEmailVerified = true;
      await user.save();

      // Выдача полноценного токена
      const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn,
      });

      res.json({
        message: 'Verification successful',
        token,
        user: user.toJSON(),
      });
    } catch (error) {
      console.error('Ошибка подтверждения OTP:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// — Повторная отправка OTP —
router.post(
  '/resend-otp',
  [body('tempToken').notEmpty().withMessage('Token is required')],
  validate,
  async (req, res) => {
    try {
      const { tempToken } = req.body;

      let decoded;
      try {
        decoded = jwt.verify(tempToken, config.jwtSecret);
      } catch {
        return res.status(401).json({ message: 'Token expired. Please login again.' });
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const otp = generateOTP();
      user.otpCode = otp;
      user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      await sendOTP(user.email, otp, 'login');

      res.json({ message: 'New OTP sent to your email.' });
    } catch (error) {
      console.error('Ошибка повторной отправки OTP:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// — Google OAuth —
router.post(
  '/google',
  [body('credential').notEmpty().withMessage('Google credential is required')],
  validate,
  async (req, res) => {
    try {
      const { credential } = req.body;

      const { OAuth2Client } = require('google-auth-library');
      const client = new OAuth2Client(config.googleClientId);

      let payload;
      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: config.googleClientId,
        });
        payload = ticket.getPayload();
      } catch {
        return res.status(401).json({ message: 'Invalid Google credential.' });
      }

      const { sub: googleId, email, name, picture } = payload;

      // Ищем или создаём пользователя
      let user = await User.findOne({ $or: [{ googleId }, { email }] });

      if (user) {
        // Привязываем Google если ещё не привязан
        if (!user.googleId) {
          user.googleId = googleId;
          user.isEmailVerified = true;
          if (picture && !user.avatar) user.avatar = picture;
          await user.save();
        }
      } else {
        user = await User.create({
          email,
          name,
          googleId,
          avatar: picture || '',
          isEmailVerified: true,
        });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated.' });
      }

      const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn,
      });

      res.json({
        message: 'Google login successful',
        token,
        user: user.toJSON(),
      });
    } catch (error) {
      console.error('Ошибка Google OAuth:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// — Текущий пользователь —
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

// — Обновление токена —
router.post('/refresh', auth, async (req, res) => {
  try {
    const token = jwt.sign({ id: req.user._id, role: req.user.role }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
    res.json({ token, user: req.user.toJSON() });
  } catch (error) {
    console.error('Ошибка обновления токена:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
