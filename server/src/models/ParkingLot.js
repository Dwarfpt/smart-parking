// Модель парковки — название, адрес, геолокация, часы работы
const mongoose = require('mongoose');

const parkingLotSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    nameRo:      { type: String, default: '', trim: true },
    nameEn:      { type: String, default: '', trim: true },
    address:     { type: String, required: true, trim: true },
    addressRo:   { type: String, default: '', trim: true },
    addressEn:   { type: String, default: '', trim: true },
    description: { type: String, default: '' },
    location: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [долгота, широта]
    },
    totalSpots: { type: Number, required: true, min: 1 },
    image:      { type: String, default: '' },
    workingHours: {
      open:  { type: String, default: '00:00' },
      close: { type: String, default: '23:59' },
    },
    isActive: { type: Boolean, default: true },
    mqttId:   { type: String, unique: true, sparse: true }, // ID для MQTT-топиков (например 'lot1')
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Геоиндекс для поиска ближайших парковок
parkingLotSchema.index({ location: '2dsphere' });

// Виртуальные связи
parkingLotSchema.virtual('spots', { ref: 'ParkingSpot', localField: '_id', foreignField: 'parkingLotId' });
parkingLotSchema.virtual('tariff', { ref: 'Tariff', localField: '_id', foreignField: 'parkingLotId', justOne: true });

module.exports = mongoose.model('ParkingLot', parkingLotSchema);
