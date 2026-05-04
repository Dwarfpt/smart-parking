// Модель тикета поддержки — переписка пользователь ↔ админ
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['user', 'admin'], required: true },
  text:       { type: String, required: true, trim: true },
  createdAt:  { type: Date, default: Date.now },
});

const supportTicketSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject:  { type: String, required: true, trim: true },
    status:   { type: String, enum: ['open', 'in-progress', 'closed'], default: 'open' },
    messages: [messageSchema],
  },
  { timestamps: true }
);

supportTicketSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
