// Заполнение БД начальными данными: пользователи, парковки, тарифы, IoT
// Запуск: node src/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./config');
const User = require('./models/User');
const ParkingLot = require('./models/ParkingLot');
const ParkingSpot = require('./models/ParkingSpot');
const Tariff = require('./models/Tariff');
const IoTDevice = require('./models/IoTDevice');

const seed = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('MongoDB подключена');

    // Очистка всех коллекций
    await Promise.all([
      User.deleteMany({}), ParkingLot.deleteMany({}), ParkingSpot.deleteMany({}),
      Tariff.deleteMany({}), IoTDevice.deleteMany({}),
    ]);

    // ——— Пользователи ———
    await User.create({ email: 'admin@smartparking.md', password: 'admin123', name: 'Administrator', phone: '+373 60 000 000', role: 'admin', balance: 0 });
    await User.create({ email: 'user@smartparking.md',  password: 'user123',  name: 'Иван Петров',   phone: '+373 69 123 456', role: 'user',  balance: 500 });
    await User.create({ email: 'maria@example.com',     password: 'maria123', name: 'Мария Иванова',  phone: '+373 78 987 654', role: 'user',  balance: 250 });
    console.log('Пользователи: 3');

    // ——— Парковки (Кишинёв) ———
    const lot1 = await ParkingLot.create({ name: 'Парковка Центр',      address: 'ул. Штефан чел Маре 1, Кишинёв',  description: 'Центральная парковка', location: { type: 'Point', coordinates: [28.8297, 47.0245] }, totalSpots: 8, workingHours: { open: '06:00', close: '23:00' } });
    const lot2 = await ParkingLot.create({ name: 'Парковка Ботаника',   address: 'бул. Дечебал 10, Кишинёв',        description: 'Район Ботаника',       location: { type: 'Point', coordinates: [28.8453, 47.0140] }, totalSpots: 6, workingHours: { open: '00:00', close: '23:59' } });
    const lot3 = await ParkingLot.create({ name: 'Парковка Рышкановка', address: 'ул. Московская 15, Кишинёв',      description: 'Возле супермаркета',    location: { type: 'Point', coordinates: [28.8120, 47.0380] }, totalSpots: 4, workingHours: { open: '07:00', close: '22:00' } });
    console.log('Парковки: 3');

    // ——— Места ———
    const makeSpots = (lot, n) =>
      ParkingSpot.insertMany(
        Array.from({ length: n }, (_, i) => ({
          parkingLotId: lot._id, spotNumber: i + 1, status: 'free',
          zone: i < Math.ceil(n / 2) ? 'A' : 'B', floor: 1,
          deviceId: `esp32_${lot.name.replace(/\s/g, '_').toLowerCase()}_spot${i + 1}`,
        }))
      );
    const [s1, s2, s3] = await Promise.all([makeSpots(lot1, 8), makeSpots(lot2, 6), makeSpots(lot3, 4)]);
    console.log('Места:', s1.length + s2.length + s3.length);

    // ——— Тарифы (MDL) ———
    await Tariff.create({ parkingLotId: lot1._id, name: 'Стандарт Центр',      pricePerHour: 25, subscriptionWeek: 600,  subscriptionMonth: 2000, subscription3Months: 5500, subscriptionYear: 18000, peakMultiplier: 1.5, peakHoursStart: '08:00', peakHoursEnd: '18:00' });
    await Tariff.create({ parkingLotId: lot2._id, name: 'Стандарт Ботаника',   pricePerHour: 20, subscriptionWeek: 500,  subscriptionMonth: 1700, subscription3Months: 4700, subscriptionYear: 15000, peakMultiplier: 1.3, peakHoursStart: '09:00', peakHoursEnd: '17:00' });
    await Tariff.create({ parkingLotId: lot3._id, name: 'Эконом Рышкановка',   pricePerHour: 15, subscriptionWeek: 400,  subscriptionMonth: 1300, subscription3Months: 3600, subscriptionYear: 12000, peakMultiplier: 1.2, peakHoursStart: '08:00', peakHoursEnd: '19:00' });
    console.log('Тарифы: 3');

    // ——— IoT устройства (ESP32) ———
    await IoTDevice.create({ deviceId: 'esp32_centr_001',    parkingLotId: lot1._id, name: 'ESP32 Центр',      spotIds: s1.map(s => s._id), status: 'offline' });
    await IoTDevice.create({ deviceId: 'esp32_botanica_001', parkingLotId: lot2._id, name: 'ESP32 Ботаника',   spotIds: s2.map(s => s._id), status: 'offline' });
    await IoTDevice.create({ deviceId: 'esp32_ryshk_001',    parkingLotId: lot3._id, name: 'ESP32 Рышкановка', spotIds: s3.map(s => s._id), status: 'offline' });
    console.log('IoT устройства: 3');

    console.log('\n=== Готово ===');
    console.log('Админ:  admin@smartparking.md / admin123');
    console.log('Юзер:   user@smartparking.md / user123');
    console.log('Юзер2:  maria@example.com / maria123\n');
    process.exit(0);
  } catch (e) {
    console.error('Ошибка seed:', e);
    process.exit(1);
  }
};

seed();
