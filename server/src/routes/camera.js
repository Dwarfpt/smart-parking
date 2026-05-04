// ============================================================
//  Маршрут: POST /api/iot/camera/scan
//  ESP32-CAM отправляет JPEG → сервер декодирует QR-код
//  и проверяет бронирование в БД
// ============================================================
const router = require('express').Router();
const jsQR   = require('jsqr');
const sharp  = require('sharp');

const Booking      = require('../models/Booking');
const ParkingLot   = require('../models/ParkingLot');
const VehicleEntry = require('../models/VehicleEntry');

// ——————————— POST /scan — приём JPEG, декодирование QR ———————————
router.post('/scan', async (req, res) => {
  try {
    // ESP32-CAM отправляет бинарный JPEG в body
    // (Content-Type: image/jpeg)
    const imgBuffer = req.body;

    if (!imgBuffer || !imgBuffer.length) {
      return res.json({
        type: 'none', value: '', accessGranted: false,
        bookingId: '', message: 'Пустое изображение',
      });
    }

    const lotId    = req.headers['x-lot-id']    || 'lot1';
    const deviceId = req.headers['x-device-id']  || '';
    const camRole  = req.headers['x-cam-role']   || 'entry';

    // ——— Декодирование JPEG → raw RGBA пиксели ———
    let rawData, width, height;
    try {
      // Предобработка: повысить контраст и чёткость, затем в RGBA для jsQR
      const { data, info } = await sharp(imgBuffer)
        .sharpen()            // повысить чёткость
        .normalise()          // нормализация яркости/контраста
        .ensureAlpha()        // гарантируем 4 канала (RGBA)
        .raw()
        .toBuffer({ resolveWithObject: true });

      rawData = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
      width   = info.width;
      height  = info.height;
    } catch (err) {
      console.error('[SCAN] Sharp error:', err.message);
      return res.json({
        type: 'none', value: '', accessGranted: false,
        bookingId: '', message: 'Ошибка декодирования изображения',
      });
    }

    // ——— Поиск QR-кода ———
    const qrResult = jsQR(rawData, width, height, {
      inversionAttempts: 'attemptBoth',
    });

    if (!qrResult || !qrResult.data) {
      return res.json({
        type: 'none', value: '', accessGranted: false,
        bookingId: '', message: 'QR-код не найден',
      });
    }

    const qrValue = qrResult.data.trim();
    console.log(`[SCAN] QR обнаружен: "${qrValue}" от ${deviceId} (${camRole})`);

    // ——— Извлечение токена из smartparking://validate/{token} ———
    const QR_PREFIX = 'smartparking://validate/';
    const token = qrValue.startsWith(QR_PREFIX)
      ? qrValue.slice(QR_PREFIX.length)
      : qrValue;

    // ——— Проверка бронирования по QR-токену ———
    const booking = await Booking.findOne({ qrToken: token })
      .populate('parkingSpotId', 'spotNumber')
      .populate('userId', 'fullName email');

    if (!booking) {
      console.log(`[SCAN] Бронирование не найдено для QR: ${qrValue.substring(0, 16)}...`);
      return res.json({
        type: 'qr', value: qrValue, accessGranted: false,
        bookingId: '', message: 'Бронирование не найдено',
      });
    }

    // Проверяем статус и время
    const now = new Date();
    const isActive   = booking.status === 'active';
    const isInTime   = now >= booking.startTime && now <= booking.endTime;
    const accessGranted = isActive && isInTime;

    const spotNum = booking.parkingSpotId?.spotNumber || '?';
    const userName = booking.userId?.fullName || 'Unknown';

    if (accessGranted) {
      console.log(`[SCAN] ДОСТУП РАЗРЕШЁН — ${userName}, место ${spotNum}`);
    } else {
      console.log(`[SCAN] ДОСТУП ЗАПРЕЩЁН — статус: ${booking.status}, в диапазоне: ${isInTime}`);
    }

    return res.json({
      type: 'qr',
      value: qrValue,
      accessGranted,
      bookingId: booking._id.toString(),
      message: accessGranted
        ? `Добро пожаловать, ${userName}! Место ${spotNum}`
        : `Бронирование ${!isActive ? 'неактивно' : 'вне времени действия'}`,
    });

  } catch (error) {
    console.error('[SCAN] Ошибка:', error);
    res.status(500).json({
      type: 'none', value: '', accessGranted: false,
      bookingId: '', message: 'Server error',
    });
  }
});

// ——————————— GET /scan/test — проверка что эндпоинт работает ———————————
router.get('/scan', (req, res) => {
  res.json({ status: 'ok', message: 'POST image/jpeg to this endpoint' });
});

// ——————————— POST /verify — ESP32 отправляет текст QR, сервер проверяет бронирование ———————————
router.post('/verify', async (req, res) => {
  try {
    const { qrToken, lotId, deviceId, role } = req.body;

    if (!qrToken) {
      return res.json({
        type: 'qr', value: '', accessGranted: false,
        bookingId: '', message: 'Пустой QR-токен',
      });
    }

    console.log(`[VERIFY] QR: "${qrToken.substring(0, 32)}..." от ${deviceId} (${role})`);

    // ——— Извлечение токена из smartparking://validate/{token} ———
    const QR_PREFIX = 'smartparking://validate/';
    const cleanToken = qrToken.startsWith(QR_PREFIX)
      ? qrToken.slice(QR_PREFIX.length)
      : qrToken;

    // ——— Проверка бронирования по QR-токену ———
    const booking = await Booking.findOne({ qrToken: cleanToken })
      .populate('parkingSpotId', 'spotNumber')
      .populate('userId', 'fullName email');

    if (!booking) {
      console.log(`[VERIFY] Бронирование не найдено для QR: ${qrToken.substring(0, 16)}...`);
      return res.json({
        type: 'qr', value: qrToken, accessGranted: false,
        bookingId: '', message: 'Бронирование не найдено',
      });
    }

    // Проверяем статус и время
    const now = new Date();
    const isActive   = booking.status === 'active';
    const isInTime   = now >= booking.startTime && now <= booking.endTime;
    const accessGranted = isActive && isInTime;

    const spotNum = booking.parkingSpotId?.spotNumber || '?';
    const userName = booking.userId?.fullName || 'Unknown';

    if (accessGranted) {
      console.log(`[VERIFY] ДОСТУП РАЗРЕШЁН — ${userName}, место ${spotNum}`);
    } else {
      console.log(`[VERIFY] ДОСТУП ЗАПРЕЩЁН — статус: ${booking.status}, в диапазоне: ${isInTime}`);
    }

    return res.json({
      type: 'qr',
      value: qrToken,
      accessGranted,
      bookingId: booking._id.toString(),
      message: accessGranted
        ? `Добро пожаловать, ${userName}! Место ${spotNum}`
        : `Бронирование ${!isActive ? 'неактивно' : 'вне времени действия'}`,
    });

  } catch (error) {
    console.error('[VERIFY] Ошибка:', error);
    res.status(500).json({
      type: 'qr', value: '', accessGranted: false,
      bookingId: '', message: 'Server error',
    });
  }
});

// ——————————— GET /plates — список распознанных номеров ———————————
router.get('/plates', async (req, res) => {
  try {
    const { lotId, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (lotId) filter.lotId = lotId;

    const entries = await VehicleEntry.find(filter)
      .select('-imageBase64')   // без фото в списке (экономия трафика)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await VehicleEntry.countDocuments(filter);

    res.json({ entries, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('[PLATES] Ошибка:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ——————————— GET /plates/latest — последний распознанный номер ———————————
router.get('/plates/latest', async (req, res) => {
  try {
    const { lotId, cameraId } = req.query;
    const filter = {};
    if (lotId)    filter.lotId    = lotId;
    if (cameraId) filter.cameraId = cameraId;

    const entry = await VehicleEntry.findOne(filter)
      .sort({ createdAt: -1 })
      .populate('bookingId', 'startTime endTime status');

    if (!entry) return res.json({ entry: null });
    res.json({ entry });
  } catch (error) {
    console.error('[PLATES] Ошибка:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ——————————— GET /plates/:id — одна запись с фото ———————————
router.get('/plates/:id', async (req, res) => {
  try {
    const entry = await VehicleEntry.findById(req.params.id)
      .populate('bookingId', 'startTime endTime status');

    if (!entry) return res.status(404).json({ message: 'Not found' });
    res.json({ entry });
  } catch (error) {
    console.error('[PLATES] Ошибка:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ——————————— GET /plates/:id/image — фото как JPEG ———————————
router.get('/plates/:id/image', async (req, res) => {
  try {
    const entry = await VehicleEntry.findById(req.params.id).select('imageBase64');
    if (!entry?.imageBase64) return res.status(404).json({ message: 'No image' });

    const imgBuffer = Buffer.from(entry.imageBase64, 'base64');
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(imgBuffer);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
