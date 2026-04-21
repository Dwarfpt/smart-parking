// Модель бронирования — разовые и абонементы, QR-коды
const mongoose = require('mongoose');
const crypto = require('crypto');

const bookingSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parkingSpotId:{ type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSpot', required: true },
    parkingLotId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingLot', required: true },
    type:         { type: String, enum: ['reservation', 'subscription'], required: true },
    startTime:    { type: Date, required: true },
    endTime:      { type: Date, required: true },
    subscriptionPeriod: { type: String, enum: ['week', 'month', '3months', 'year', null], default: null },
    status:       { type: String, enum: ['active', 'completed', 'cancelled', 'expired'], default: 'active' },
    totalPrice:   { type: Number, required: true, min: 0 },
    vehiclePlate: { type: String, default: '' },

    // Уникальный токен для QR-кода
    qrToken: { type: String, unique: true, sparse: true },

    // Флаг: находится ли машина на парковке (для одной камеры)
    inLot: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Автоматическая генерация QR-токена при создании
bookingSchema.pre('save', function () {
  if (!this.qrToken) {
    this.qrToken = crypto.randomBytes(20).toString('hex');
  }
});

// Индексы для быстрого поиска
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ parkingSpotId: 1, status: 1 });
bookingSchema.index({ endTime: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
