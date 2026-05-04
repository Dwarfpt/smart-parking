// Маршруты IoT — ESP32 устройства (CRUD, статус)
const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const IoTDevice = require('../models/IoTDevice');

// — Список устройств —
router.get('/', auth, requireRole('admin'), async (req, res) => {
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

// — Регистрация устройства —
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { deviceId, parkingLotId, name, spotIds } = req.body;

    const existing = await IoTDevice.findOne({ deviceId });
    if (existing) {
      return res.status(400).json({ message: 'Device already registered.' });
    }

    const device = await IoTDevice.create({
      deviceId,
      parkingLotId,
      name: name || 'ESP32 Controller',
      spotIds: spotIds || [],
    });

    res.status(201).json({ message: 'Device registered', device });
  } catch (error) {
    console.error('Ошибка регистрации устройства:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Статус устройства —
router.get('/:deviceId/status', auth, async (req, res) => {
  try {
    const device = await IoTDevice.findOne({ deviceId: req.params.deviceId })
      .populate('parkingLotId', 'name')
      .populate('spotIds', 'spotNumber status');

    if (!device) {
      return res.status(404).json({ message: 'Device not found.' });
    }

    res.json({ device });
  } catch (error) {
    console.error('Ошибка получения статуса:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Удаление устройства —
router.delete('/:deviceId', auth, requireRole('admin'), async (req, res) => {
  try {
    const device = await IoTDevice.findOneAndDelete({ deviceId: req.params.deviceId });
    if (!device) {
      return res.status(404).json({ message: 'Device not found.' });
    }
    res.json({ message: 'Device deleted' });
  } catch (error) {
    console.error('Ошибка удаления устройства:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
