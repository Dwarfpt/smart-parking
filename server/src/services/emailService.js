// Сервис отправки email — OTP коды для 2FA
const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

// Создание SMTP-транспорта (lazy init)
function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtpUser || !config.smtpPass) {
    console.warn('[Email] SMTP не настроен — коды будут в консоли');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });
  return transporter;
}

// Генерация 6-значного OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Отправка OTP на email
async function sendOTP(email, otp, purpose = 'verification') {
  const transport = getTransporter();

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">
      <h1 style="text-align:center;color:#2563eb">🅿️ Smart Parking</h1>
      <div style="background:#f8fafc;border-radius:12px;padding:30px;text-align:center">
        <h2 style="color:#1e293b">${purpose === 'login' ? 'Код для входа' : 'Подтверждение email'}</h2>
        <p style="color:#64748b">${purpose === 'login' ? 'Введите код для входа:' : 'Ваш код подтверждения:'}</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2563eb;
                    background:white;padding:20px;border-radius:8px;border:2px dashed #2563eb">
          ${otp}
        </div>
        <p style="color:#94a3b8;font-size:14px;margin-top:20px">
          Код действителен 10 минут. Не запрашивали — просто проигнорируйте.
        </p>
      </div>
    </div>`;

  // Если SMTP не настроен — выводим в консоль
  if (!transport) {
    console.log(`[Email] OTP для ${email}: ${otp}`);
    return { success: true, dev: true };
  }

  try {
    const subjects = { verification: 'Подтверждение email', login: 'Код для входа' };
    await transport.sendMail({
      from: config.smtpFrom,
      to: email,
      subject: `Smart Parking — ${subjects[purpose] || subjects.verification}`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('[Email] Ошибка отправки:', error.message);
    console.log(`[Email] OTP для ${email}: ${otp}`);
    return { success: true, dev: true };
  }
}

module.exports = { generateOTP, sendOTP };
