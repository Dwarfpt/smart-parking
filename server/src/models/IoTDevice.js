// Модель IoT-устройства (ESP32) — контроллер парковочных мест
const mongoose = require('mongoose');

const iotDeviceSchema = new mongoose.Schema(
  {
    deviceId:     { type: String, required: true, unique: true },
    parkingLotId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingLot', required: true },
    name:         { type: String, default: 'ESP32 Controller' },
    spotIds:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSpot' }],
    lastHeartbeat:   { type: Date, default: null },
    status:          { type: String, enum: ['online', 'offline', 'error'], default: 'offline' },
    firmwareVersion: { type: String, default: '1.0.0' },
    ipAddress:       { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IoTDevice', iotDeviceSchema);
