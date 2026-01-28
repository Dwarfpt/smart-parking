// Маршруты парковок — список, детали, места (публичные)
const router = require('express').Router();
const { body, param, query } = require('express-validator');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ParkingLot = require('../models/ParkingLot');
const ParkingSpot = require('../models/ParkingSpot');
const Tariff = require('../models/Tariff');

// — Список парковок —
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius, search } = req.query;

    let filter = { isActive: true };

    // Поиск по названию/адресу
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    let parkingQuery;

    // Геопоиск — ближайшие парковки
    if (lat && lng) {
      const maxDistance = parseInt(radius) || 5000; // метры, по умолчанию 5 км
      parkingQuery = ParkingLot.find({
        ...filter,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            $maxDistance: maxDistance,
          },
        },
      });
    } else {
      parkingQuery = ParkingLot.find(filter);
    }

    const parkingLots = await parkingQuery.lean();

    // Для каждой парковки подсчитываем свободные места
    const result = await Promise.all(
      parkingLots.map(async (lot) => {
        const spotCounts = await ParkingSpot.aggregate([
          { $match: { parkingLotId: lot._id } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]);

        const counts = { free: 0, occupied: 0, reserved: 0, maintenance: 0 };
        spotCounts.forEach((s) => {
          counts[s._id] = s.count;
        });

        // Активный тариф
        const tariff = await Tariff.findOne({
          parkingLotId: lot._id,
          isActive: true,
        }).lean();

        return {
          ...lot,
          spotCounts: counts,
          freeSpots: counts.free,
          tariff: tariff
            ? { pricePerHour: tariff.pricePerHour, name: tariff.name }
            : null,
        };
      })
    );

    res.json({ parkingLots: result });
  } catch (error) {
    console.error('Ошибка получения парковок:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Детали парковки —
router.get('/:id', async (req, res) => {
  try {
    const lot = await ParkingLot.findById(req.params.id).lean();
    if (!lot) {
      return res.status(404).json({ message: 'Parking lot not found.' });
    }

    // Все места
    const spots = await ParkingSpot.find({ parkingLotId: lot._id }).lean();

    // Тариф
    const tariff = await Tariff.findOne({
      parkingLotId: lot._id,
      isActive: true,
    }).lean();

    res.json({ parkingLot: lot, spots, tariff });
  } catch (error) {
    console.error('Ошибка получения парковки:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Места парковки —
router.get('/:id/spots', async (req, res) => {
  try {
    const spots = await ParkingSpot.find({
      parkingLotId: req.params.id,
    }).lean();

    res.json({ spots });
  } catch (error) {
    console.error('Ошибка получения мест:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
