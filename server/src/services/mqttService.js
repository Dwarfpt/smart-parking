// MQTT-сервис — связь с ESP32: датчики мест, шлагбаум, дисплей, LED
const mqtt = require('mqtt');
const config = require('../config');
const ParkingSpot = require('../models/ParkingSpot');
const IoTDevice = require('../models/IoTDevice');

let mqttClient = null;
let ioInstance = null;

// ——————————— Подключение ———————————

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
      const payload = JSON.parse(message.toString());
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
  if (!Array.isArray(payload.spots)) return;

  const device = await IoTDevice.findOne({
    $or: [{ deviceId: identifier }, { parkingLotId: identifier }],
  });
  const parkingLotId = device ? device.parkingLotId : identifier;
  const updated = [];

  for (const { spotNumber, occupied } of payload.spots) {
    const spot = await ParkingSpot.findOne({ parkingLotId, spotNumber });
    if (!spot) continue;

    const sensorStatus = occupied ? 'occupied' : 'free';

    // reserved/maintenance не перезаписываем, кроме reserved→occupied (машина приехала)
    if (spot.status === 'maintenance') continue;
    if (spot.status === 'reserved' && sensorStatus !== 'occupied') continue;

    if (spot.status !== sensorStatus) {
      spot.status = sensorStatus;
      await spot.save();
      updated.push({ _id: spot._id, spotNumber: spot.spotNumber, status: sensorStatus });
    }
  }

  // WebSocket-уведомление об изменениях
  if (updated.length && ioInstance) {
    ioInstance.emit('spots:update', { parkingLotId, spots: updated });
  }
};

// Heartbeat от ESP32 — обновляем статус устройства
const handleHeartbeat = async (identifier, payload) => {
  await IoTDevice.findOneAndUpdate(
    { $or: [{ deviceId: identifier }, { deviceId: payload.deviceId }] },
    { lastHeartbeat: new Date(), status: 'online', ipAddress: payload.ip || '' }
  );
};

// Статус шлагбаума → WebSocket
const handleBarrierStatus = (identifier, payload) => {
  ioInstance?.emit('barrier:status', { parkingLotId: identifier, ...payload });
};

// ——————————— Команды для ESP32 ———————————

// Вспомогательная отправка MQTT-сообщения
const publish = (topic, data, qos = 1) => {
  if (mqttClient?.connected) mqttClient.publish(topic, JSON.stringify(data), { qos });
};

// Открыть шлагбаум
const openBarrier = (lotId) => publish(`parking/${lotId}/barrier/cmd`, { action: 'open' });

// Закрыть шлагбаум
const closeBarrier = (lotId) => publish(`parking/${lotId}/barrier/cmd`, { action: 'close' });

// Обновить дисплей
const updateDisplay = (lotId, data) => publish(`parking/${lotId}/display/update`, data, 0);

// Обновить LED на месте
const updateSpotLed = (lotId, spotNumber, color) =>
  publish(`parking/${lotId}/led/cmd`, { spotNumber, color }, 0);

const getMqttClient = () => mqttClient;

module.exports = { initMqtt, openBarrier, closeBarrier, updateDisplay, updateSpotLed, getMqttClient };
