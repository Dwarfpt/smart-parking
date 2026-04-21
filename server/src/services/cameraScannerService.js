// ============================================================
//  Сервис камер: QR-сканирование (Без номеров, Анти-Бузинг)
//
//  Архитектура:
//    Сервер опрашивает 1 камеру каждые 2 сек:
//    1) Получает JPEG с ESP32-CAM по HTTP (/cam-hi.jpg)
//    2) Декодирует QR-код локально (jsQR)
//    3) При обнаружении QR — проверяет статус inLot в БД
//    4) Мгновенно открывает шлагбаум
//    5) Генерирует новый QR-код (предотвращение шеринга скриншотов)
// ============================================================
const http = require('http');
const crypto = require('crypto');
const jsQR = require('jsqr');
const sharp = require('sharp');

const Booking      = require('../models/Booking');
const VehicleEntry = require('../models/VehicleEntry');
const { getIO }    = require('./wsService');
const { openBarrier, closeBarrier } = require('./mqttService');

// ——————————— Конфигурация камер ———————————
const CAMERA_ENTRY_URL     = process.env.CAMERA_URL || 'http://192.168.100.48';
const CAMERA_EXIT_URL      = process.env.CAMERA_EXIT_URL || 'http://192.168.100.49';

// Plate Recognizer API (закомментировано)
// const PLATE_API_TOKEN      = process.env.PLATE_RECOGNIZER_TOKEN || '';
// const PLATE_API_URL        = 'https://api.platerecognizer.com/v1/plate-reader/';
// const PLATE_REGIONS        = ['md', 'ro', 'ua'];

// Одна универсальная камера на въезд и выезд
const cameras = [
  {
    id: 'cam-01',
    url: `${CAMERA_ENTRY_URL}/cam-hi.jpg`,
    role: 'universal',
    lotId: 'lot1',
  }
];

const SCAN_INTERVAL_MS     = 2000;
const FETCH_TIMEOUT_MS     = 8000;
const QR_DEDUP_MS          = 10000;  // Не сканировать тот же QR подряд

// Состояние
const lastQR    = new Map();    // камера → { value, time }
let scanStats   = { ok: 0, qr: 0, err: 0 };

// ——————————— Получение JPEG с камеры ———————————

function fetchJpeg(url) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      req.destroy();
      reject(new Error('Timeout'));
    }, FETCH_TIMEOUT_MS);

    const req = http.get(url, (res) => {
      if (res.statusCode !== 200) {
        clearTimeout(timer);
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks));
      });
    });
    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// ——————————— QR: декодирование ———————————

async function decodeQR(jpegBuffer) {
  const { data, info } = await sharp(jpegBuffer)
    .sharpen({ sigma: 1.5 })
    .normalise()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  const result = jsQR(rgba, info.width, info.height, { inversionAttempts: 'attemptBoth' });
  return result?.data?.trim() || null;
}

// ——————————— QR: проверка бронирования ———————————

const QR_PREFIX = 'smartparking://validate/';

function extractToken(qrValue) {
  return qrValue.startsWith(QR_PREFIX) ? qrValue.slice(QR_PREFIX.length) : qrValue;
}

async function checkBooking(qrValue) {
  const token = extractToken(qrValue);
  const booking = await Booking.findOne({ qrToken: token })
    .populate('parkingSpotId', 'spotNumber')
    .populate('userId', 'fullName email');

  if (!booking) {
    return { accessGranted: false, message: 'Бронирование не найдено', bookingDoc: null };
  }

  const now        = new Date();
  const isActive   = booking.status === 'active';
  const isInTime   = now >= booking.startTime && now <= booking.endTime;
  const accessGranted = isActive && isInTime;
  const spotNum    = booking.parkingSpotId?.spotNumber || '?';
  const userName   = booking.userId?.fullName || 'Unknown';

  if (!accessGranted) {
    return {
      accessGranted: false,
      bookingDoc: booking,
      message: `Бронирование ${!isActive ? 'неактивно' : 'вне времени действия'}`
    };
  }

  // --- ANTI-ABUSE И ОДИНОЧНАЯ КАМЕРА ---
  const isEntering = !booking.inLot;
  const actionName = isEntering ? 'ВЪЕЗД' : 'ВЫЕЗД';

  return {
    accessGranted: true,
    bookingDoc: booking,
    isEntering,
    spotNumber: spotNum,
    userName,
    message: `[${actionName}] Добро пожаловать, ${userName}! Место ${spotNum}`,
  };
}

// ——————————— QR: обработка результата (Мгновенно открывает шлагбаум) ———————————

async function handleQRResult(qrValue, jpegBuffer, cam) {
  const prev = lastQR.get(cam.id);
  const now  = Date.now();
  if (prev && prev.value === qrValue && (now - prev.time) < QR_DEDUP_MS) {
    return false;
  }
  lastQR.set(cam.id, { value: qrValue, time: now });
  scanStats.qr++;

  const result = await checkBooking(qrValue);
  const icon = result.accessGranted ? '✅' : '❌';
  console.log(`[QR-SCAN] ${icon} ${cam.id} | QR: "${qrValue.substring(0, 40)}" | ${result.message}`);

  // Если доступ разрешён — МГНОВЕННО открываем шлагбаум и сжигаем QR!
  if (result.accessGranted) {
    const booking = result.bookingDoc;
    
    // ОТКРЫТИЕ ШЛАГБАУМА (3 попытки с интервалом 1 сек — гарантия доставки)
    openBarrier(cam.lotId);
    console.log(`[BARRIER] 🔓 ${cam.lotId} — шлагбаум открыт (QR ✅)`);
    setTimeout(() => openBarrier(cam.lotId), 1000);
    setTimeout(() => openBarrier(cam.lotId), 2000);

    // МЕНЯЕМ СТАТУС ВЪЕЗДА
    booking.inLot = result.isEntering;
    
    if (!result.isEntering && booking.type === 'reservation') {
        booking.status = 'completed';
    }

    // ГЕНЕРАЦИЯ НОВОГО QR-КОДА (Anti-Sharing)
    booking.qrToken = crypto.randomBytes(20).toString('hex');
    await booking.save();
    console.log(`[ANTI-ABUSE] Токен обновлен. Сгенерирован новый QR-код для следующего проезда.`);
  }

  // WebSocket broadcast
  const io = getIO();
  if (io) {
    const event = {
      camera: cam.id, role: cam.role, lotId: cam.lotId,
      qrValue, ...result,
      timestamp: new Date().toISOString(),
    };
    io.to(`parking:${cam.lotId}`).emit('qr:scan', event);
    io.to('admin').emit('qr:scan', event);
  }

  return true;
}

// ——————————— Главный цикл сканирования ———————————

async function scanCamera(cam) {
  if (cam._busy) return;
  cam._busy = true;

  try {
    const jpeg = await fetchJpeg(cam.url);
    scanStats.ok++;
    cam._scanCount = (cam._scanCount || 0) + 1;

    if (cam._lastError) {
      console.log(`[SCAN] 🟢 ${cam.id}: камера снова доступна`);
      cam._lastError = null;
    }

    // 1. Считываем QR-код
    const qrValue = await decodeQR(jpeg);
    if (qrValue) {
      await handleQRResult(qrValue, jpeg, cam);
    }
  } catch (err) {
    if (!cam._lastError || cam._lastError !== err.message) {
      console.log(`[SCAN] ⚠️  ${cam.id}: ${err.message}`);
      cam._lastError = err.message;
    }
    scanStats.err++;
  } finally {
    cam._busy = false;
  }
}

// /*
// --- ЗАКОММЕНТИРОВАНО: РАСПОЗНАВАНИЕ НОМЕРОВ ---
// 
// async function recognizePlate(jpegBuffer) {
//   // Логика отправки кадра на Plate Recognizer API
// }
// async function handlePlateResult(plateResult, jpegBuffer, cam) {
//   // Сохранение логов машины и открытие шлагбаума
// }
// */

// ——————————— Запуск / остановка ———————————

let scanTimers = [];

function startCameraScanner() {
  console.log(`[SCAN] Запуск (${cameras.length} камер, QR каждые ${SCAN_INTERVAL_MS / 1000}с, номера ВЫКЛ)`);

  for (const cam of cameras) {
    const timer = setInterval(() => scanCamera(cam), SCAN_INTERVAL_MS);
    scanTimers.push(timer);
  }

  const statusTimer = setInterval(() => {
    console.log(`[SCAN] Статус: кадров=${scanStats.ok}, QR=${scanStats.qr}, ошибок=${scanStats.err}`);
    scanStats = { ok: 0, qr: 0, err: 0 };
  }, 15_000);
  scanTimers.push(statusTimer);
}

function stopCameraScanner() {
  for (const timer of scanTimers) clearInterval(timer);
  scanTimers = [];
}

module.exports = { startCameraScanner, stopCameraScanner };
