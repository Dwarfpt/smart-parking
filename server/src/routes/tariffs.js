// Маршруты тарифов — CRUD (публичный просмотр, админ-управление)
const router = require('express').Router();
const { body } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const Tariff = require('../models/Tariff');

// — Список тарифов —
router.get('/', async (req, res) => {
  try {
    const { parkingLotId } = req.query;
    const filter = {};
    if (parkingLotId) filter.parkingLotId = parkingLotId;

    const tariffs = await Tariff.find(filter).populate('parkingLotId', 'name address');
    res.json({ tariffs });
  } catch (error) {
    console.error('Ошибка получения тарифов:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Детали тарифа —
router.get('/:id', async (req, res) => {
  try {
    const tariff = await Tariff.findById(req.params.id).populate('parkingLotId', 'name address');
    if (!tariff) {
      return res.status(404).json({ message: 'Tariff not found.' });
    }
    res.json({ tariff });
  } catch (error) {
    console.error('Ошибка получения тарифа:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Создание тарифа —
router.post(
  '/',
  auth,
  requireRole('admin'),
  [
    body('parkingLotId').isMongoId().withMessage('Valid parking lot ID is required'),
    body('pricePerHour').isFloat({ min: 0 }).withMessage('Price per hour must be >= 0'),
    body('name').optional().trim(),
    body('subscriptionWeek').optional().isFloat({ min: 0 }),
    body('subscriptionMonth').optional().isFloat({ min: 0 }),
    body('subscription3Months').optional().isFloat({ min: 0 }),
    body('subscriptionYear').optional().isFloat({ min: 0 }),
    body('peakMultiplier').optional().isFloat({ min: 1 }),
    body('peakHoursStart').optional().trim(),
    body('peakHoursEnd').optional().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const tariff = await Tariff.create(req.body);

      // WebSocket broadcast
      const io = req.app.get('io');
      if (io) {
        io.emit('tariff:updated', { tariff });
      }

      res.status(201).json({ message: 'Tariff created', tariff });
    } catch (error) {
      console.error('Ошибка создания тарифа:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// — Обновление тарифа —
router.put(
  '/:id',
  auth,
  requireRole('admin'),
  [
    body('pricePerHour').optional().isFloat({ min: 0 }),
    body('name').optional().trim(),
    body('subscriptionWeek').optional().isFloat({ min: 0 }),
    body('subscriptionMonth').optional().isFloat({ min: 0 }),
    body('subscription3Months').optional().isFloat({ min: 0 }),
    body('subscriptionYear').optional().isFloat({ min: 0 }),
    body('peakMultiplier').optional().isFloat({ min: 1 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  async (req, res) => {
    try {
      const tariff = await Tariff.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

      if (!tariff) {
        return res.status(404).json({ message: 'Tariff not found.' });
      }

      // WebSocket broadcast
      const io = req.app.get('io');
      if (io) {
        io.emit('tariff:updated', { tariff });
      }

      res.json({ message: 'Tariff updated', tariff });
    } catch (error) {
      console.error('Ошибка обновления тарифа:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// — Удаление тарифа —
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const tariff = await Tariff.findByIdAndDelete(req.params.id);
    if (!tariff) {
      return res.status(404).json({ message: 'Tariff not found.' });
    }
    res.json({ message: 'Tariff deleted' });
  } catch (error) {
    console.error('Ошибка удаления тарифа:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
