// Маршруты администратора — статистика, пользователи, парковки, устройства
const router = require('express').Router();
const { body } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const User = require('../models/User');
const ParkingLot = require('../models/ParkingLot');
const ParkingSpot = require('../models/ParkingSpot');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const IoTDevice = require('../models/IoTDevice');

// Все роуты — только админ
router.use(auth, requireRole('admin'));

// — Статистика —
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalParkingLots,
      totalSpots,
      activeBookings,
      totalRevenue,
      todayBookings,
      onlineDevices,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      ParkingLot.countDocuments({ isActive: true }),
      ParkingSpot.countDocuments(),
      Booking.countDocuments({ status: 'active' }),
      Transaction.aggregate([
        { $match: { type: 'payment' } },
        { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
      ]),
      Booking.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      IoTDevice.countDocuments({ status: 'online' }),
    ]);

    // Spots по статусам
    const spotsByStatus = await ParkingSpot.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Бронирования за последние 7 дней (для графика)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const bookingsPerDay = await Booking.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$totalPrice' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Выручка за последние 30 дней
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenuePerDay = await Transaction.aggregate([
      {
        $match: {
          type: 'payment',
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: { $abs: '$amount' } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Новые пользователи за последние 7 дней
    const newUsersPerDay = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, role: 'user' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      overview: {
        totalUsers,
        totalParkingLots,
        totalSpots,
        activeBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
        todayBookings,
        onlineDevices,
      },
      spotsByStatus: spotsByStatus.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      charts: {
        bookingsPerDay,
        revenuePerDay,
        newUsersPerDay,
      },
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Список пользователей —
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) filter.role = role;

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Детали пользователя —
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // История бронирований
    const bookings = await Booking.find({ userId: req.params.id })
      .populate('parkingLotId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Транзакции
    const transactions = await Transaction.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ user, bookings, transactions });
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Редактирование пользователя —
router.put(
  '/users/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('phone').optional().trim(),
    body('role').optional().isIn(['user', 'admin']),
    body('isActive').optional().isBoolean(),
    body('isEmailVerified').optional().isBoolean(),
    body('twoFactorEnabled').optional().isBoolean(),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, email, phone, role, isActive, isEmailVerified, twoFactorEnabled } = req.body;
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (role !== undefined) updates.role = role;
      if (isActive !== undefined) updates.isActive = isActive;
      if (isEmailVerified !== undefined) updates.isEmailVerified = isEmailVerified;
      if (twoFactorEnabled !== undefined) updates.twoFactorEnabled = twoFactorEnabled;

      const user = await User.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      res.json({ message: 'User updated', user });
    } catch (error) {
      console.error('Ошибка обновления пользователя:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// — Деактивация пользователя —
router.delete('/users/:id', async (req, res) => {
  try {
    // Не удаляем — деактивируем
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Отменяем активные бронирования
    await Booking.updateMany(
      { userId: req.params.id, status: 'active' },
      { status: 'cancelled' }
    );

    res.json({ message: 'User deactivated', user });
  } catch (error) {
    console.error('Ошибка деактивации пользователя:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Пополнение баланса пользователя —
router.post(
  '/users/:id/credit',
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    body('description').optional().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { amount, description } = req.body;

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $inc: { balance: amount } },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      await Transaction.create({
        userId: req.params.id,
        amount,
        type: 'topup',
        description: description || `Admin credit: +${amount} MDL`,
        balanceAfter: user.balance,
      });

      res.json({ message: 'Balance credited', user });
    } catch (error) {
      console.error('Ошибка пополнения баланса:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// — Управление парковками —

// Создание парковки
router.post(
  '/parking',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('totalSpots').isInt({ min: 1 }).withMessage('Total spots must be >= 1'),
    body('latitude').isFloat().withMessage('Valid latitude is required'),
    body('longitude').isFloat().withMessage('Valid longitude is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, address, description, totalSpots, latitude, longitude, image, workingHours } =
        req.body;

      const lot = await ParkingLot.create({
        name,
        address,
        description: description || '',
        location: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        totalSpots,
        image: image || '',
        workingHours: workingHours || { open: '00:00', close: '23:59' },
      });

      // Автоматически создаем парковочные места
      const spots = [];
      for (let i = 1; i <= totalSpots; i++) {
        spots.push({
          parkingLotId: lot._id,
          spotNumber: i,
          status: 'free',
          zone: 'A',
          floor: 1,
        });
      }
      await ParkingSpot.insertMany(spots);

      res.status(201).json({ message: 'Parking lot created', parkingLot: lot });
    } catch (error) {
      console.error('Ошибка создания парковки:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// Обновление парковки
router.put('/parking/:id', async (req, res) => {
  try {
    const updates = { ...req.body };

    // Если передали координаты, формируем GeoJSON
    if (req.body.latitude && req.body.longitude) {
      updates.location = {
        type: 'Point',
        coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)],
      };
      delete updates.latitude;
      delete updates.longitude;
    }

    const lot = await ParkingLot.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!lot) {
      return res.status(404).json({ message: 'Parking lot not found.' });
    }

    res.json({ message: 'Parking lot updated', parkingLot: lot });
  } catch (error) {
    console.error('Ошибка обновления парковки:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Удаление парковки (soft)
router.delete('/parking/:id', async (req, res) => {
  try {
    const lot = await ParkingLot.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!lot) {
      return res.status(404).json({ message: 'Parking lot not found.' });
    }

    res.json({ message: 'Parking lot deactivated', parkingLot: lot });
  } catch (error) {
    console.error('Ошибка удаления парковки:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — IoT-устройства —
router.get('/devices', async (req, res) => {
  try {
    const devices = await IoTDevice.find()
      .populate('parkingLotId', 'name address')
      .sort({ lastHeartbeat: -1 });

    res.json({ devices });
  } catch (error) {
    console.error('Ошибка получения устройств:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Все бронирования —
router.get('/bookings', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const bookings = await Booking.find(filter)
      .populate('userId', 'name email')
      .populate('parkingSpotId', 'spotNumber zone')
      .populate('parkingLotId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(filter);

    res.json({
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Ошибка получения бронирований:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
