// Маршруты пользователя — профиль, пароль, баланс, транзакции
const router = require('express').Router();
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Все роуты требуют авторизации
router.use(auth);

// — Профиль —
router.get('/profile', async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Обновление профиля —
router.put(
  '/profile',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('phone').optional().trim(),
    body('avatar').optional().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, phone, avatar } = req.body;
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (phone !== undefined) updates.phone = phone;
      if (avatar !== undefined) updates.avatar = avatar;

      const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
        runValidators: true,
      });

      res.json({ message: 'Profile updated', user });
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// — Смена пароля —
router.put(
  '/password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user._id).select('+password');
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }

      user.password = newPassword;
      await user.save();

      res.json({ message: 'Password changed successfully.' });
    } catch (error) {
      console.error('Ошибка смены пароля:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// — Пополнение баланса —
router.post(
  '/topup',
  [body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1')],
  validate,
  async (req, res) => {
    try {
      const { amount } = req.body;

      // Обновляем баланс
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $inc: { balance: amount } },
        { new: true }
      );

      // Создаем транзакцию
      await Transaction.create({
        userId: req.user._id,
        amount,
        type: 'topup',
        description: `Balance top-up: +${amount} MDL`,
        balanceAfter: user.balance,
      });

      res.json({
        message: 'Balance topped up successfully',
        balance: user.balance,
      });
    } catch (error) {
      console.error('Ошибка пополнения:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// — Включение/выключение 2FA —
router.put('/toggle-2fa', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.twoFactorEnabled = !user.twoFactorEnabled;
    await user.save();

    res.json({
      message: user.twoFactorEnabled
        ? 'Two-factor authentication enabled.'
        : 'Two-factor authentication disabled.',
      twoFactorEnabled: user.twoFactorEnabled,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Ошибка переключения 2FA:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Баланс —
router.get('/balance', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ balance: user.balance });
  } catch (error) {
    console.error('Ошибка получения баланса:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — История транзакций —
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const transactions = await Transaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments({ userId: req.user._id });

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Ошибка получения транзакций:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
