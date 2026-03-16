// ============================================================
//  Сервис камер: QR-сканирование + распознавание номеров
//
//  Архитектура:
//    Сервер опрашивает 2 камеры (въезд + выезд) каждые 2 сек:
//    1) Получает JPEG с ESP32-CAM по HTTP (/cam-hi.jpg)
//    2) Декодирует QR-код локально (jsQR)
//    3) При обнаружении QR — проверяет бронирование в БД
//    4) Если есть Plate Recognizer API — распознаёт номер авто
//    5) Открывает шлагбаум через MQTT
//
//  Камеры:
//    cam-entry-01 — въезд (192.168.100.48)
//    cam-exit-01  — выезд (192.168.100.49)
// ============================================================
const http = require('http');
const jsQR = require('jsqr');
const sharp = require('sharp');

const Booking      = require('../models/Booking');
const VehicleEntry = require('../models/VehicleEntry');
const { getIO }    = require('./wsService');
const { openBarrier, closeBarrier } = require('./mqttService');

// ——————————— Конфигурация камер ———————————

// IP-адреса камер (можно переопределить через переменные окружения)
const CAMERA_ENTRY_URL     = process.env.CAMERA_URL || 'http://192.168.100.48';
const CAMERA_EXIT_URL      = process.env.CAMERA_EXIT_URL || 'http://192.168.100.49';

// Plate Recognizer API (распознавание номерных знаков)
const PLATE_API_TOKEN      = process.env.PLATE_RECOGNIZER_TOKEN || '';
const PLATE_API_URL        = 'https://api.platerecognizer.com/v1/plate-reader/';
const PLATE_REGIONS        = ['md', 'ro', 'ua'];  // Молдова, Румыния, Украина

// Определение камер: въезд и выезд с разными IP
const cameras = [
  {
    id: 'cam-entry-01',                              // Камера на ВЪЕЗДЕ
    url: `${CAMERA_ENTRY_URL}/cam-hi.jpg`,           // 800×600 для QR
    role: 'entry',
    lotId: 'lot1',
  },
  {
    id: 'cam-exit-01',                               // Камера на ВЫЕЗДЕ
    url: `${CAMERA_EXIT_URL}/cam-hi.jpg`,            // 800×600 для QR
    role: 'exit',
    lotId: 'lot1',
  },
];

const SCAN_INTERVAL_MS     = 2000;   // Интервал сканирования (мс)
const FETCH_TIMEOUT_MS     = 8000;   // Таймаут запроса кадра
const QR_DEDUP_MS          = 10000;  // Дедупликация QR (10 сек)
const PLATE_DEDUP_MS       = 60000;  // Дедупликация номера (60 сек)
const PLATE_BACKUP_MS      = 300000; // Резервное сканирование номера каждые 5 мин
const PLATE_DELAY_AFTER_QR = 10000; // Задержка перед снимком номера после QR (10 сек)
const PLATE_MIN_CONFIDENCE = 0.5;   // Минимальная уверенность для сохранения номера

// Состояние
const lastQR    = new Map();    // камера → { value, time }
const lastPlate = new Map();    // камера → { plate, time }
const pendingQR = new Map();    // камера → { qrValue, result, jpegBuffer, time } — ожидает номер
let scanStats   = { ok: 0, qr: 0, plates: 0, err: 0 };

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
  // Повышаем контраст для QR (jsQR сам конвертирует в серый)
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

// ——————————— QR: извлечение токена ———————————

const QR_PREFIX = 'smartparking://validate/';

function extractToken(qrValue) {
  return qrValue.startsWith(QR_PREFIX)
    ? qrValue.slice(QR_PREFIX.length)
    : qrValue;
}

// ——————————— QR: проверка бронирования ———————————

async function checkBooking(qrValue) {
  const token = extractToken(qrValue);
  const booking = await Booking.findOne({ qrToken: token })
    .populate('parkingSpotId', 'spotNumber')
    .populate('userId', 'fullName email');

  if (!booking) {
    return { accessGranted: false, message: 'Бронирование не найдено', bookingId: '' };
  }

  const now        = new Date();
  const isActive   = booking.status === 'active';
  const isInTime   = now >= booking.startTime && now <= booking.endTime;
  const accessGranted = isActive && isInTime;
  const spotNum    = booking.parkingSpotId?.spotNumber || '?';
  const userName   = booking.userId?.fullName || 'Unknown';

  return {
    accessGranted,
    bookingId: booking._id.toString(),
    spotNumber: spotNum,
    userName,
    message: accessGranted
      ? `Добро пожаловать, ${userName}! Место ${spotNum}`
      : `Бронирование ${!isActive ? 'неактивно' : 'вне времени действия'}`,
  };
}

// ——————————— Номер: вызов Plate Recognizer API ———————————

async function recognizePlate(jpegBuffer) {
  if (!PLATE_API_TOKEN) return null;

  const blob = new Blob([jpegBuffer], { type: 'image/jpeg' });
  const form = new FormData();
  form.append('upload', blob, 'frame.jpg');
  for (const region of PLATE_REGIONS) {
    form.append('regions', region);
  }

  const res = await fetch(PLATE_API_URL, {
    method: 'POST',
    headers: { Authorization: `Token ${PLATE_API_TOKEN}` },
    body: form,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Plate API ${res.status}: ${text.substring(0, 100)}`);
  }

  const json = await res.json();
  const best = json.results?.[0];
  if (!best || !best.plate) return null;

  // Отсеиваем низкую уверенность (мусор / QR-артефакты)
  if ((best.score || 0) < PLATE_MIN_CONFIDENCE) {
    console.log(`[PLATE] 🗑️  Отброшен (${(best.score * 100).toFixed(0)}%): ${best.plate}`);
    return null;
  }

  return {
    plate:       best.plate.toUpperCase(),
    country:     best.region?.code || '',
    region:      best.region?.score ? `${(best.region.score * 100).toFixed(0)}%` : '',
    confidence:  best.score || 0,
    vehicleType: best.vehicle?.type || '',
  };
}

// ——————————— Номер: обработка результата ———————————

async function handlePlateResult(plateResult, jpegBuffer, cam) {
  if (!plateResult) return;

  // Дедупликация — тот же номер в течение PLATE_DEDUP_MS
  const prev = lastPlate.get(cam.id);
  const now  = Date.now();
  if (prev && prev.plate === plateResult.plate && (now - prev.time) < PLATE_DEDUP_MS) {
    return;
  }
  lastPlate.set(cam.id, { plate: plateResult.plate, time: now });
  scanStats.plates++;

  // Сохраняем фото (сжимаем до 320px ширины для экономии места)
  const thumbnail = await sharp(jpegBuffer)
    .resize(320)
    .jpeg({ quality: 70 })
    .toBuffer();

  const entry = new VehicleEntry({
    plate:       plateResult.plate,
    country:     plateResult.country,
    confidence:  plateResult.confidence,
    vehicleType: plateResult.vehicleType,
    imageBase64: thumbnail.toString('base64'),
    cameraId:    cam.id,
    lotId:       cam.lotId,
    role:        cam.role,
  });

  // Привязка к pendingQR → открытие шлагбаума
  const pending = pendingQR.get(cam.id);
  if (pending && (now - pending.time) < 30000) {
    entry.bookingId     = pending.result.bookingId;
    entry.qrToken       = extractToken(pending.qrValue);
    entry.accessGranted = true;

    // Сохраняем номер в бронировании
    try {
      await Booking.findByIdAndUpdate(pending.result.bookingId, {
        vehiclePlate: plateResult.plate,
      });
    } catch (_) { /* не критично */ }

    pendingQR.delete(cam.id);

    // ОТКРЫВАЕМ ШЛАГБАУМ (QR + номер подтверждены)
    openBarrier(cam.lotId);
    console.log(`[BARRIER] 🔓 ${cam.lotId} — шлагбаум открыт (QR ✅ + номер ${plateResult.plate} ✅)`);
  }

  await entry.save();

  // WebSocket broadcast
  const io = getIO();
  if (io) {
    const event = {
      plate:      plateResult.plate,
      country:    plateResult.country,
      confidence: plateResult.confidence,
      vehicleType:plateResult.vehicleType,
      camera:     cam.id,
      lotId:      cam.lotId,
      role:       cam.role,
      entryId:    entry._id.toString(),
      barrierOpened: !!entry.accessGranted,
      timestamp:  entry.createdAt,
    };
    io.to(`parking:${cam.lotId}`).emit('plate:detected', event);
    io.to('admin').emit('plate:detected', event);
  }

  return entry;
}

// ——————————— QR: обработка результата (НЕ открывает шлагбаум — ждёт номер) ———————————

async function handleQRResult(qrValue, jpegBuffer, cam) {
  // Дедупликация QR
  const prev = lastQR.get(cam.id);
  const now  = Date.now();
  if (prev && prev.value === qrValue && (now - prev.time) < QR_DEDUP_MS) {
    return false; // дубликат
  }
  lastQR.set(cam.id, { value: qrValue, time: now });
  scanStats.qr++;

  // Проверка бронирования
  const result = await checkBooking(qrValue);

  const icon = result.accessGranted ? '✅' : '❌';
  console.log(`[QR-SCAN] ${icon} ${cam.id} | QR: "${qrValue.substring(0, 40)}" | ${result.message}`);

  // Если доступ разрешён — сохраняем в pendingQR, шлагбаум откроется после номера
  if (result.accessGranted) {
    pendingQR.set(cam.id, { qrValue, result, jpegBuffer, time: now });
    console.log(`[QR-SCAN] ⏳ ${cam.id} — ожидание номерного знака для открытия шлагбаума…`);
  }

  // WebSocket broadcast
  const io = getIO();
  if (io) {
    const event = {
      camera: cam.id, role: cam.role, lotId: cam.lotId,
      qrValue, ...result,
      awaitingPlate: result.accessGranted,
      timestamp: new Date().toISOString(),
    };
    io.to(`parking:${cam.lotId}`).emit('qr:scan', event);
    io.to('admin').emit('qr:scan', event);
  }

  return true; // новый QR обработан
}

// ——————————— Главный цикл сканирования ———————————

async function scanCamera(cam) {
  if (cam._busy) return;
  cam._busy = true;

  try {
    const jpeg = await fetchJpeg(cam.url);
    scanStats.ok++;
    cam._scanCount = (cam._scanCount || 0) + 1;

    // Камера снова доступна
    if (cam._lastError) {
      console.log(`[SCAN] 🟢 ${cam.id}: камера снова доступна`);
      cam._lastError = null;
    }

    // ——— 1. QR-код (каждый кадр, бесплатно) ———
    const qrValue = await decodeQR(jpeg);
    let isNewQR = false;
    if (qrValue) {
      isNewQR = await handleQRResult(qrValue, jpeg, cam);
    }

    // ——— 2. Номер авто (только по QR-триггеру) ———
    // После НОВОГО QR ждём 10 сек и делаем свежий снимок
    //   (телефон уже убран → камера видит номер)
    if (PLATE_API_TOKEN && isNewQR) {
      cam._lastPlateCall = Date.now();
      console.log(`[PLATE] ⏳ ${cam.id} — QR обнаружен, жду ${PLATE_DELAY_AFTER_QR / 1000}с перед снимком номера…`);
      setTimeout(async () => {
        try {
          const freshJpeg = await fetchJpeg(cam.url);
          console.log(`[PLATE] 🔍 ${cam.id} — свежий кадр (${freshJpeg.length} байт)`);
          const plateResult = await recognizePlate(freshJpeg);
          if (plateResult) {
            console.log(`[PLATE] 🚗 ${cam.id} | ${plateResult.plate} | ${plateResult.country.toUpperCase()} | ${(plateResult.confidence * 100).toFixed(0)}%`);
            await handlePlateResult(plateResult, freshJpeg, cam);
          } else {
            console.log(`[PLATE] ⚠️  ${cam.id} — номер не обнаружен, повторная попытка через 5с…`);
            // Повторная попытка через 5 секунд
            setTimeout(async () => {
              try {
                const retryJpeg = await fetchJpeg(cam.url);
                const retryPlate = await recognizePlate(retryJpeg);
                if (retryPlate) {
                  console.log(`[PLATE] 🚗 ${cam.id} (повтор) | ${retryPlate.plate} | ${(retryPlate.confidence * 100).toFixed(0)}%`);
                  await handlePlateResult(retryPlate, retryJpeg, cam);
                } else {
                  // Номер не распознан — открываем шлагбаум по одному QR (fallback)
                  const pending = pendingQR.get(cam.id);
                  if (pending) {
                    pendingQR.delete(cam.id);
                    openBarrier(cam.lotId);
                    console.log(`[BARRIER] 🔓 ${cam.lotId} — шлагбаум открыт (QR ✅, номер не распознан — fallback)`);
                  }
                }
              } catch (err) {
                console.log(`[PLATE] ❌ ${cam.id} (повтор): ${err.message}`);
                // Fallback: открываем по QR
                const pending = pendingQR.get(cam.id);
                if (pending) {
                  pendingQR.delete(cam.id);
                  openBarrier(cam.lotId);
                  console.log(`[BARRIER] 🔓 ${cam.lotId} — шлагбаум открыт (QR ✅, ошибка камеры — fallback)`);
                }
              }
            }, 5000);
          }
        } catch (err) {
          console.log(`[PLATE] ❌ ${cam.id}: ${err.message}`);
          // Fallback: открываем по QR если камера недоступна
          const pending = pendingQR.get(cam.id);
          if (pending) {
            pendingQR.delete(cam.id);
            openBarrier(cam.lotId);
            console.log(`[BARRIER] 🔓 ${cam.lotId} — шлагбаум открыт (QR ✅, камера недоступна — fallback)`);
          }
        }
      }, PLATE_DELAY_AFTER_QR);
    }

    // Если нет Plate API — шлагбаум открываем сразу по QR (как раньше)
    if (!PLATE_API_TOKEN && isNewQR) {
      const pending = pendingQR.get(cam.id);
      if (pending) {
        pendingQR.delete(cam.id);
        openBarrier(cam.lotId);
        console.log(`[BARRIER] 🔓 ${cam.lotId} — шлагбаум открыт (QR ✅, Plate API не настроен)`);
      }
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

// ——————————— Запуск / остановка ———————————

let scanTimers = [];

function startCameraScanner() {
  const plateStatus = PLATE_API_TOKEN
    ? `номера по QR-триггеру + резерв каждые ${PLATE_BACKUP_MS / 60000} мин`
    : 'номера ВЫКЛ (нет PLATE_RECOGNIZER_TOKEN)';

  console.log(`[SCAN] Запуск (${cameras.length} камер, QR каждые ${SCAN_INTERVAL_MS / 1000}с, ${plateStatus})`);

  for (const cam of cameras) {
    const timer = setInterval(() => scanCamera(cam), SCAN_INTERVAL_MS);
    scanTimers.push(timer);
  }

  // Статус каждые 60 секунд
  const statusTimer = setInterval(() => {
    console.log(
      `[SCAN] Статус: кадров=${scanStats.ok}, QR=${scanStats.qr}, ` +
      `номеров=${scanStats.plates}, ошибок=${scanStats.err}`
    );
    scanStats = { ok: 0, qr: 0, plates: 0, err: 0 };
  }, 15_000);
  scanTimers.push(statusTimer);
}

function stopCameraScanner() {
  for (const timer of scanTimers) clearInterval(timer);
  scanTimers = [];
}

module.exports = { startCameraScanner, stopCameraScanner };
