// Модель парковочного места — статус, зона, привязка к устройству
const mongoose = require('mongoose');

const parkingSpotSchema = new mongoose.Schema(
  {
    parkingLotId:    { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingLot', required: true },
    spotNumber:      { type: Number, required: true },
    status:          { type: String, enum: ['free', 'occupied', 'reserved', 'maintenance'], default: 'free' },
    deviceId:        { type: String, default: null },  // ID сенсора ESP32
    floor:           { type: Number, default: 1 },
    zone:            { type: String, default: 'A' },
    isSubscription:  { type: Boolean, default: false }, // закреплено за абонементом
    subscribedUserId:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Уникальный номер места внутри парковки
parkingSpotSchema.index({ parkingLotId: 1, spotNumber: 1 }, { unique: true });

module.exports = mongoose.model('ParkingSpot', parkingSpotSchema);
