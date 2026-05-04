// ============================================================
//  Модель: Запись о транспортном средстве
//  Хранит распознанный номер, страну, фото, привязку к бронированию
// ============================================================
const mongoose = require('mongoose');

const vehicleEntrySchema = new mongoose.Schema({
  plate:        { type: String, default: '' },              // Распознанный номер
  country:      { type: String, default: '' },              // Код страны (md, ro, ua…)
  region:       { type: String, default: '' },              // Регион
  confidence:   { type: Number, default: 0 },               // Уверенность 0..1
  vehicleType:  { type: String, default: '' },              // Тип ТС (car, truck…)
  imageBase64:  { type: String, default: '' },              // JPEG кадр в base64
  cameraId:     { type: String, default: '' },              // ID камеры
  lotId:        { type: String, default: '' },              // Парковка
  role:         { type: String, enum: ['entry', 'exit'], default: 'entry' },
  bookingId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  qrToken:      { type: String, default: '' },              // Привязка к QR
  accessGranted:{ type: Boolean, default: false },
}, {
  timestamps: true,                                         // createdAt, updatedAt
});

vehicleEntrySchema.index({ createdAt: -1 });
vehicleEntrySchema.index({ plate: 1 });
vehicleEntrySchema.index({ bookingId: 1 });
vehicleEntrySchema.index({ lotId: 1, createdAt: -1 });

module.exports = mongoose.model('VehicleEntry', vehicleEntrySchema);
