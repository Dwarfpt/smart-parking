// Модель пользователя — авторизация, баланс, роли
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, minlength: 6, select: false, required: function() { return !this.googleId; } },
    name:     { type: String, required: true, trim: true },
    phone:    { type: String, trim: true, default: '' },
    role:     { type: String, enum: ['user', 'admin'], default: 'user' },
    balance:  { type: Number, default: 0, min: 0 },
    avatar:   { type: String, default: '' },
    isActive: { type: Boolean, default: true },

    // 2FA — верификация email через OTP
    isEmailVerified: { type: Boolean, default: false },
    otpCode:   { type: String, select: false },
    otpExpiry: { type: Date, select: false },

    // Google OAuth
    googleId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

// Хэширование пароля перед сохранением
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Сравнение пароля с хэшем
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Убираем чувствительные поля из JSON-ответа
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otpCode;
  delete obj.otpExpiry;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
