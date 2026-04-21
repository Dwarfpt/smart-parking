// Маршруты бронирований — разовые, абонементы, QR-валидация, отмена
const router = require('express').Router();
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const Booking = require('../models/Booking');
const ParkingSpot = require('../models/ParkingSpot');
const Tariff = require('../models/Tariff');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Все роуты требуют авторизации (кроме QR-валидации)

// — Валидация QR-кода —
router.get('/validate/:qrToken', async (req, res) => {
  try {
    const booking = await Booking.findOne({ qrToken: req.params.qrToken })
      .populate('parkingSpotId', 'spotNumber zone floor')
      .populate('parkingLotId', 'name nameRo nameEn address addressRo addressEn')
      .populate('userId', 'name email');

    if (!booking) {
      return res.json({ valid: false, message: 'QR-код не найден.' });
    }

    const now = new Date();

    // Проверка статуса
    if (booking.status !== 'active') {
      return res.json({
        valid: false,
        message: `Бронирование ${booking.status === 'expired' ? 'истекло' : booking.status === 'cancelled' ? 'отменено' : 'завершено'}.`,
        booking,
      });
    }

    // Проверка срока действия
    if (now > booking.endTime) {
      booking.status = 'expired';
      await booking.save();
      return res.json({
        valid: false,
        message: 'Бронирование истекло.',
        booking,
      });
    }

    res.json({
      valid: true,
      message: 'QR-код действителен.',
      booking,
    });
  } catch (error) {
    console.error('Ошибка валидации QR:', error);
    res.status(500).json({ valid: false, message: 'Server error.' });
  }
});

router.use(auth);

// — Создание бронирования —
router.post(
  '/',
  [
    body('parkingSpotId').isMongoId().withMessage('Valid parking spot ID is required'),
    body('startTime').isISO8601().withMessage('Valid start time is required'),
    body('endTime').isISO8601().withMessage('Valid end time is required'),
    body('vehiclePlate').optional().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { parkingSpotId, startTime, endTime, vehiclePlate } = req.body;

      const start = new Date(startTime);
      const end = new Date(endTime);

      // Проверка что дата в будущем (допуск 2 минуты на задержку сети)
      const now = new Date();
      now.setMinutes(now.getMinutes() - 2);
      if (start < now) {
        return res.status(400).json({ message: 'Start time must be in the future.' });
      }

      // Проверка максимум 7 дней
      const diffDays = (end - start) / (1000 * 60 * 60 * 24);
      if (diffDays > 7) {
        return res.status(400).json({
          message: 'Reservation cannot exceed 7 days. Use subscription for longer periods.',
        });
      }

      if (end <= start) {
        return res.status(400).json({ message: 'End time must be after start time.' });
      }

      // Проверяем место
      const spot = await ParkingSpot.findById(parkingSpotId);
      if (!spot) {
        return res.status(404).json({ message: 'Parking spot not found.' });
      }

      // Блокировка: место физически занято (ИК-датчик обнаружил машину)
      if (spot.status === 'occupied') {
        return res.status(400).json({ message: 'This spot is physically occupied.' });
      }

      // Блокировка: место на обслуживании
      if (spot.status === 'maintenance') {
        return res.status(400).json({ message: 'This spot is under maintenance.' });
      }

      // Проверка на подписку
      if (spot.isSubscription && spot.subscribedUserId?.toString() !== req.user._id.toString()) {
        return res.status(400).json({ message: 'This spot is reserved for a subscriber.' });
      }

      // Проверка конфликтов бронирований
      const conflict = await Booking.findOne({
        parkingSpotId,
        status: 'active',
        $or: [
          { startTime: { $lt: end }, endTime: { $gt: start } },
        ],
      });

      if (conflict) {
        return res.status(400).json({ message: 'This spot is already booked for the selected time.' });
      }

      // Считаем стоимость
      const tariff = await Tariff.findOne({
        parkingLotId: spot.parkingLotId,
        isActive: true,
      });

      if (!tariff) {
        return res.status(400).json({ message: 'No active tariff found for this parking lot.' });
      }

      const hours = (end - start) / (1000 * 60 * 60);
      let totalPrice = hours * tariff.pricePerHour;

      // Динамическое ценообразование — проверяем пиковые часы
      const startHour = start.getHours();
      const peakStart = parseInt(tariff.peakHoursStart);
      const peakEnd = parseInt(tariff.peakHoursEnd);
      if (startHour >= peakStart && startHour < peakEnd) {
        totalPrice *= tariff.peakMultiplier;
      }

      totalPrice = Math.round(totalPrice * 100) / 100;

      // Проверка баланса
      const user = await User.findById(req.user._id);
      if (user.balance < totalPrice) {
        return res.status(400).json({
          message: 'Insufficient balance.',
          required: totalPrice,
          current: user.balance,
        });
      }

      // Списание
      user.balance -= totalPrice;
      await user.save();

      // Создание бронирования
      const booking = await Booking.create({
        userId: req.user._id,
        parkingSpotId,
        parkingLotId: spot.parkingLotId,
        type: 'reservation',
        startTime: start,
        endTime: end,
        totalPrice,
        vehiclePlate: vehiclePlate || '',
      });

      // Обновление статуса места
      spot.status = 'reserved';
      await spot.save();

      // Транзакция
      await Transaction.create({
        userId: req.user._id,
        amount: -totalPrice,
        type: 'payment',
        bookingId: booking._id,
        description: `Reservation: Spot #${spot.spotNumber}`,
        balanceAfter: user.balance,
      });

      // WebSocket — уведомляем подписчиков парковки
      const io = req.app.get('io');
      if (io) {
        const spotPayload = {
          parkingLotId: spot.parkingLotId,
          spots: [{ _id: spot._id, spotNumber: spot.spotNumber, status: 'reserved' }],
        };
        io.to(`parking:${spot.parkingLotId}`).emit('spots:update', spotPayload);
        io.to('admin').emit('spots:update', spotPayload);
        io.to(`user:${req.user._id}`).emit('booking:confirmed', { booking });
      }

      res.status(201).json({
        message: 'Reservation created successfully',
        booking,
        balance: user.balance,
      });
    } catch (error) {
      console.error('Ошибка создания бронирования:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// — Создание абонемента —
router.post(
  '/subscription',
  [
    body('parkingSpotId').isMongoId().withMessage('Valid parking spot ID is required'),
    body('period').isIn(['week', 'month', '3months', 'year']).withMessage('Valid period is required'),
    body('vehiclePlate').optional().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { parkingSpotId, period, vehiclePlate } = req.body;

      const spot = await ParkingSpot.findById(parkingSpotId);
      if (!spot) {
        return res.status(404).json({ message: 'Parking spot not found.' });
      }

      // Блокировка: место физически занято (ИК-датчик обнаружил машину)
      if (spot.status === 'occupied') {
        return res.status(400).json({ message: 'This spot is physically occupied.' });
      }

      // Блокировка: место на обслуживании
      if (spot.status === 'maintenance') {
        return res.status(400).json({ message: 'This spot is under maintenance.' });
      }

      // Проверка что место не занято подпиской
      if (spot.isSubscription) {
        return res.status(400).json({ message: 'This spot already has an active subscription.' });
      }

      // Активные подписки на это место
      const activeSubscription = await Booking.findOne({
        parkingSpotId,
        type: 'subscription',
        status: 'active',
      });
      if (activeSubscription) {
        return res.status(400).json({ message: 'This spot already has an active subscription.' });
      }

      // Тариф
      const tariff = await Tariff.findOne({
        parkingLotId: spot.parkingLotId,
        isActive: true,
      });
      if (!tariff) {
        return res.status(400).json({ message: 'No active tariff found.' });
      }

      // Стоимость подписки
      const priceMap = {
        week: tariff.subscriptionWeek,
        month: tariff.subscriptionMonth,
        '3months': tariff.subscription3Months,
        year: tariff.subscriptionYear,
      };

      const totalPrice = priceMap[period];
      if (!totalPrice || totalPrice <= 0) {
        return res.status(400).json({ message: `Subscription for '${period}' is not available.` });
      }

      // Проверка баланса
      const user = await User.findById(req.user._id);
      if (user.balance < totalPrice) {
        return res.status(400).json({
          message: 'Insufficient balance.',
          required: totalPrice,
          current: user.balance,
        });
      }

      // Рассчитываем даты
      const startTime = new Date();
      const endTime = new Date();
      switch (period) {
        case 'week':
          endTime.setDate(endTime.getDate() + 7);
          break;
        case 'month':
          endTime.setMonth(endTime.getMonth() + 1);
          break;
        case '3months':
          endTime.setMonth(endTime.getMonth() + 3);
          break;
        case 'year':
          endTime.setFullYear(endTime.getFullYear() + 1);
          break;
      }

      // Списание
      user.balance -= totalPrice;
      await user.save();

      // Бронирование
      const booking = await Booking.create({
        userId: req.user._id,
        parkingSpotId,
        parkingLotId: spot.parkingLotId,
        type: 'subscription',
        startTime,
        endTime,
        subscriptionPeriod: period,
        totalPrice,
        vehiclePlate: vehiclePlate || '',
      });

      // Закрепляем место за юзером
      spot.isSubscription = true;
      spot.subscribedUserId = req.user._id;
      spot.status = 'reserved';
      await spot.save();

      // Транзакция
      await Transaction.create({
        userId: req.user._id,
        amount: -totalPrice,
        type: 'payment',
        bookingId: booking._id,
        description: `Subscription (${period}): Spot #${spot.spotNumber}`,
        balanceAfter: user.balance,
      });

      // WebSocket — уведомляем подписчиков парковки
      const io = req.app.get('io');
      if (io) {
        const spotPayload = {
          parkingLotId: spot.parkingLotId,
          spots: [{ _id: spot._id, spotNumber: spot.spotNumber, status: 'reserved' }],
        };
        io.to(`parking:${spot.parkingLotId}`).emit('spots:update', spotPayload);
        io.to('admin').emit('spots:update', spotPayload);
      }

      res.status(201).json({
        message: 'Subscription created successfully',
        booking,
        balance: user.balance,
      });
    } catch (error) {
      console.error('Ошибка создания абонемента:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// — Мои бронирования —
router.get('/my', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;

    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const bookings = await Booking.find(filter)
      .populate('parkingSpotId', 'spotNumber zone floor')
      .populate('parkingLotId', 'name nameRo nameEn address addressRo addressEn')
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

// — Детали бронирования —
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
      .populate('parkingSpotId', 'spotNumber zone floor')
      .populate('parkingLotId', 'name nameRo nameEn address addressRo addressEn');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Ошибка получения бронирования:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Отмена бронирования —
router.put('/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: 'active',
    });

    if (!booking) {
      return res.status(404).json({ message: 'Active booking not found.' });
    }

    if (booking.inLot) {
      return res.status(400).json({ message: 'Невозможно отменить бронь: машина всё ещё физически находится на парковке.' });
    }

    // Рассчитываем возврат
    let refundAmount = 0;
    const now = new Date();

    if (booking.type === 'reservation') {
      // Если ещё не началось — полный возврат
      if (now < booking.startTime) {
        refundAmount = booking.totalPrice;
      } else {
        // Частичный возврат за неиспользованное время
        const totalDuration = booking.endTime - booking.startTime;
        const usedDuration = now - booking.startTime;
        const remainingRatio = Math.max(0, (totalDuration - usedDuration) / totalDuration);
        refundAmount = Math.round(booking.totalPrice * remainingRatio * 100) / 100;
      }
    } else if (booking.type === 'subscription') {
      // Возврат пропорционально оставшемуся времени
      const totalDuration = booking.endTime - booking.startTime;
      const usedDuration = now - booking.startTime;
      const remainingRatio = Math.max(0, (totalDuration - usedDuration) / totalDuration);
      refundAmount = Math.round(booking.totalPrice * remainingRatio * 0.8 * 100) / 100; // 80% от оставшегося
    }

    // Обновляем бронирование
    booking.status = 'cancelled';
    await booking.save();

    // Освобождаем место
    const spot = await ParkingSpot.findById(booking.parkingSpotId);
    if (spot) {
      spot.status = 'free';
      if (booking.type === 'subscription') {
        spot.isSubscription = false;
        spot.subscribedUserId = null;
      }
      await spot.save();

      // WebSocket — уведомляем подписчиков парковки
      const io = req.app.get('io');
      if (io) {
        const spotPayload = {
          parkingLotId: spot.parkingLotId,
          spots: [{ _id: spot._id, spotNumber: spot.spotNumber, status: 'free' }],
        };
        io.to(`parking:${spot.parkingLotId}`).emit('spots:update', spotPayload);
        io.to('admin').emit('spots:update', spotPayload);
        io.to(`user:${req.user._id}`).emit('booking:cancelled', { bookingId: booking._id });
      }
    }

    // Возврат средств
    if (refundAmount > 0) {
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $inc: { balance: refundAmount } },
        { new: true }
      );

      await Transaction.create({
        userId: req.user._id,
        amount: refundAmount,
        type: 'refund',
        bookingId: booking._id,
        description: `Refund for cancelled ${booking.type}: Spot #${spot?.spotNumber || '?'}`,
        balanceAfter: user.balance,
      });
    }

    res.json({
      message: 'Booking cancelled successfully',
      refundAmount,
    });
  } catch (error) {
    console.error('Ошибка отмены бронирования:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
