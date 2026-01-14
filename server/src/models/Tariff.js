// Модель тарифа — почасовая оплата, абонементы, пиковые часы
const mongoose = require('mongoose');

const tariffSchema = new mongoose.Schema(
  {
    parkingLotId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingLot', required: true },
    name:         { type: String, default: 'Стандартный' },
    pricePerHour: { type: Number, required: true, min: 0 },

    // Цены абонементов (MDL)
    subscriptionWeek:    { type: Number, default: 0 },
    subscriptionMonth:   { type: Number, default: 0 },
    subscription3Months: { type: Number, default: 0 },
    subscriptionYear:    { type: Number, default: 0 },

    // Динамическое ценообразование
    peakMultiplier:  { type: Number, default: 1.5 },
    peakHoursStart:  { type: String, default: '08:00' },
    peakHoursEnd:    { type: String, default: '18:00' },
    isActive:        { type: Boolean, default: true },
  },
  { timestamps: true }
);

tariffSchema.index({ parkingLotId: 1 });

module.exports = mongoose.model('Tariff', tariffSchema);
