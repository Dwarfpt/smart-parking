// ============================================================
//  MQTT-сервис — связь с ESP32 устройствами
//  Обработка: ИК-датчики мест, шлагбаум, heartbeat
//  Топики:
//    parking/+/spots/status  — статус парковочных мест от датчиков
//    parking/+/heartbeat     — пульс устройств (онлайн/оффлайн)
//    parking/+/barrier/status — статус шлагбаума
//    parking/+/barrier/cmd    — команды шлагбауму (open/close)
// ============================================================
const mqtt = require('mqtt');
const config = require('../config');
const ParkingLot = require('../models/ParkingLot');
const ParkingSpot = require('../models/ParkingSpot');
const IoTDevice = require('../models/IoTDevice');

let mqttClient = null;
let ioInstance = null;

// ——————————— Подключение ———————————

// Кэш mqttId → ObjectId (чтобы не искать в БД каждый раз)
const lotIdCache = new Map();

async function resolveLotId(identifier) {
  // 1. Кэш
  if (lotIdCache.has(identifier)) {
    console.log(`[RESOLVE] '${identifier}' → кэш: ${lotIdCache.get(identifier)}`);
    return lotIdCache.get(identifier);
  }

  // 2. Может быть это уже ObjectId
  if (/^[0-9a-f]{24}$/.test(identifier)) {
    lotIdCache.set(identifier, identifier);
    return identifier;
  }

  // 3. Ищем IoT-устройство по deviceId (parkingLotId — ObjectId, нельзя искать по строке)
  const device = await IoTDevice.findOne({ deviceId: identifier });
  if (device) {
    console.log(`[RESOLVE] '${identifier}' → IoTDevice: ${device.parkingLotId}`);
    lotIdCache.set(identifier, device.parkingLotId);
    return device.parkingLotId;
  }

  // 4. Ищем парковку по mqttId
  const lot = await ParkingLot.findOne({ mqttId: identifier });
  if (lot) {
    console.log(`[RESOLVE] '${identifier}' → ParkingLot.mqttId: ${lot._id}`);
    lotIdCache.set(identifier, lot._id);
    return lot._id;
  }

  return null;
}

const initMqtt = (io) => {
  ioInstance = io;

  const options = { reconnectPeriod: 5000, connectTimeout: 5000 };
  if (config.mqttUsername) {
    options.username = config.mqttUsername;
    options.password = config.mqttPassword;
  }

  mqttClient = mqtt.connect(config.mqttBrokerUrl, options);

  let errorLogged = false;

  mqttClient.on('error', (err) => {
    if (!errorLogged) {
      console.warn('MQTT брокер недоступен:', err.message);
      errorLogged = true;
    }
    mqttClient.end(true);
    mqttClient = null;
  });

  mqttClient.on('connect', () => {
    errorLogged = false;
    console.log('MQTT подключён к', config.mqttBrokerUrl);

    // Подписка на топики от ESP32
    mqttClient.subscribe('parking/+/spots/status', { qos: 1 });
    mqttClient.subscribe('parking/+/heartbeat', { qos: 0 });
    mqttClient.subscribe('parking/+/barrier/status', { qos: 1 });
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const raw = message.toString();
      console.log(`[MQTT] << ${topic}: ${raw.substring(0, 200)}`);
      const payload = JSON.parse(raw);
      const parts = topic.split('/');
      const id = parts[1], type = parts[2], sub = parts[3];

      if (type === 'spots' && sub === 'status')        await handleSpotsUpdate(id, payload);
      else if (type === 'heartbeat')                    await handleHeartbeat(id, payload);
      else if (type === 'barrier' && sub === 'status')  handleBarrierStatus(id, payload);
    } catch (e) {
      console.error('MQTT ошибка обработки:', e.message);
    }
  });

  return mqttClient;
};

// ——————————— Обработчики входящих сообщений ———————————

// Обновление статусов мест от ESP32
// Payload: { spots: [{ spotNumber: 1, occupied: true }, ...] }
const handleSpotsUpdate = async (identifier, payload) => {
  console.log(`[MQTT-SPOTS] Обработка: identifier=${identifier}, spots=${JSON.stringify(payload.spots?.length)}`);
  if (!Array.isArray(payload.spots)) {
    console.warn(`[MQTT-SPOTS] payload.spots не массив!`);
    return;
  }

  // Разрешаем MQTT-идентификатор (например 'lot1') → реальный parkingLotId
  const parkingLotId = await resolveLotId(identifier);
  console.log(`[MQTT-SPOTS] resolveLotId('${identifier}') → ${parkingLotId}`);
  if (!parkingLotId) {
    console.warn(`[MQTT] Неизвестный lotId: ${identifier}`);
    return;
  }
  const updated = [];

  for (const { spotNumber, occupied } of payload.spots) {
    const spot = await ParkingSpot.findOne({ parkingLotId, spotNumber });
    if (!spot) {
      console.warn(`[MQTT-SPOTS] Место ${spotNumber} не найдено для parkingLotId=${parkingLotId}`);
      continue;
    }

    const sensorStatus = occupied ? 'occupied' : 'free';

    // reserved/maintenance не перезаписываем, кроме reserved→occupied (машина приехала)
    if (spot.status === 'maintenance') continue;
    if (spot.status === 'reserved' && sensorStatus !== 'occupied') continue;

    if (spot.status !== sensorStatus) {
      spot.status = sensorStatus;
      await spot.save();
      updated.push({ _id: spot._id, spotNumber: spot.spotNumber, status: sensorStatus });
      console.log(`[MQTT-SPOTS] Место ${spotNumber}: ${spot.status} → ${sensorStatus}`);
    }
  }

  // WebSocket-уведомление об изменениях (всем подписчикам парковки)
  if (updated.length && ioInstance) {
    const wsPayload = { parkingLotId: parkingLotId.toString(), spots: updated };
    console.log(`[MQTT-SPOTS] WS emit parking:${parkingLotId} → ${updated.length} мест`);
    ioInstance.to(`parking:${parkingLotId}`).emit('spots:update', wsPayload);
    ioInstance.to('admin').emit('spots:update', wsPayload);
  } else {
    console.log(`[MQTT-SPOTS] Нет изменений (updated=${updated.length}, io=${!!ioInstance})`);
  }
};

// Heartbeat от ESP32 — обновляем статус устройства
const handleHeartbeat = async (identifier, payload) => {
  const result = await IoTDevice.findOneAndUpdate(
    { $or: [{ deviceId: identifier }, { deviceId: payload.deviceId }] },
    { lastHeartbeat: new Date(), status: 'online', ipAddress: payload.ip || '' }
  );
  // Если не нашли по deviceId — ищем через mqttId парковки
  if (!result && payload.deviceId) {
    const lot = await ParkingLot.findOne({ mqttId: identifier });
    if (lot) {
      await IoTDevice.findOneAndUpdate(
        { parkingLotId: lot._id },
        { lastHeartbeat: new Date(), status: 'online', ipAddress: payload.ip || '', deviceId: payload.deviceId }
      );
    }
  }
};

// Статус шлагбаума → WebSocket
const handleBarrierStatus = (identifier, payload) => {
  ioInstance?.emit('barrier:status', { parkingLotId: identifier, ...payload });
};

// ——————————— Команды для ESP32 ———————————

// Вспомогательная отправка MQTT-сообщения
const publish = (topic, data, qos = 1) => {
  if (!mqttClient) {
    console.warn(`[MQTT] ⚠️  publish failed (no client): ${topic}`);
    return;
  }
  if (!mqttClient.connected) {
    console.warn(`[MQTT] ⚠️  publish failed (disconnected): ${topic}`);
    return;
  }
  mqttClient.publish(topic, JSON.stringify(data), { qos });
  console.log(`[MQTT] >> ${topic} ${JSON.stringify(data)}`);
};

// Открыть шлагбаум (lotId может быть ObjectId или mqttId)
const openBarrier = async (lotId) => {
  const mqttId = await resolveToMqttId(lotId);
  publish(`parking/${mqttId}/barrier/cmd`, { action: 'open' });
};

// Закрыть шлагбаум
const closeBarrier = async (lotId) => {
  const mqttId = await resolveToMqttId(lotId);
  publish(`parking/${mqttId}/barrier/cmd`, { action: 'close' });
};

// Обновить дисплей
const updateDisplay = (lotId, data) => publish(`parking/${lotId}/display/update`, data, 0);

// Обновить LED на месте
const updateSpotLed = (lotId, spotNumber, color) =>
  publish(`parking/${lotId}/led/cmd`, { spotNumber, color }, 0);

// Резолв ObjectId → mqttId для публикации в MQTT-топик
async function resolveToMqttId(lotId) {
  // Если уже строка-slug (не ObjectId) — используем как есть
  if (typeof lotId === 'string' && !/^[0-9a-f]{24}$/.test(lotId)) return lotId;
  // Ищем парковку по ObjectId и возвращаем mqttId
  const lot = await ParkingLot.findById(lotId).select('mqttId').lean();
  return lot?.mqttId || lotId.toString();
}

const getMqttClient = () => mqttClient;

module.exports = { initMqtt, openBarrier, closeBarrier, updateDisplay, updateSpotLed, getMqttClient };
