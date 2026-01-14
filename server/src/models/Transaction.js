// Модель транзакции — пополнения, оплаты, возвраты
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount:      { type: Number, required: true },
    type:        { type: String, enum: ['topup', 'payment', 'refund'], required: true },
    bookingId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    description: { type: String, default: '' },
    balanceAfter:{ type: Number, default: 0 },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
