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
const Booking = require('./models/Booking');
const VehicleEntry = require('./models/VehicleEntry');
const Transaction = require('./models/Transaction');

const seed = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('MongoDB подключена');

    // Очистка: удаляем коллекции целиком (в т.ч. индексы)
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collNames = collections.map(c => c.name);
    for (const name of collNames) {
      await mongoose.connection.db.dropCollection(name);
    }
    console.log('Коллекции очищены:', collNames.join(', '));

    // Пересоздаём индексы
    await Promise.all([
      User.createCollection(), ParkingLot.createCollection(),
      ParkingSpot.createCollection(), Tariff.createCollection(),
      IoTDevice.createCollection(), Booking.createCollection(),
      VehicleEntry.createCollection(), Transaction.createCollection(),
    ]);
    await ParkingLot.syncIndexes();

    // ——— Пользователи ———
    await User.create({ email: 'admin@smartparking.md', password: 'admin123', name: 'Administrator', phone: '+373 60 000 000', role: 'admin', balance: 0, isEmailVerified: true });
    await User.create({ email: 'user@smartparking.md',  password: 'user123',  name: 'Иван Петров',   phone: '+373 69 123 456', role: 'user',  balance: 500, isEmailVerified: true });
    await User.create({ email: 'maria@example.com',     password: 'maria123', name: 'Мария Иванова',  phone: '+373 78 987 654', role: 'user',  balance: 250, isEmailVerified: true });
    console.log('Пользователи: 3');

    // ——— Парковки (Кишинёв) ———
    const lot1 = await ParkingLot.create({ name: 'Smart Parking Макет', nameRo: 'Smart Parking Machetă', nameEn: 'Smart Parking Model', address: 'Макет — ESP32 + камера + шлагбаум', addressRo: 'Machetă — ESP32 + cameră + barieră', addressEn: 'Physical model — ESP32 + camera + barrier', description: 'Физический макет парковки: 4 места, ИК-датчики, камера, шлагбаум', location: { type: 'Point', coordinates: [28.8190, 47.0310] }, totalSpots: 4, workingHours: { open: '00:00', close: '23:59' }, mqttId: 'lot1' });
    const lot2 = await ParkingLot.create({ name: 'Парковка Центр',      nameRo: 'Parcare Centru',       nameEn: 'Center Parking',        address: 'ул. Штефан чел Маре 1, Кишинёв',  addressRo: 'str. Ștefan cel Mare 1, Chișinău',  addressEn: 'Stefan cel Mare st. 1, Chisinau',  description: 'Центральная парковка', location: { type: 'Point', coordinates: [28.8297, 47.0245] }, totalSpots: 8, workingHours: { open: '06:00', close: '23:00' } });
    const lot3 = await ParkingLot.create({ name: 'Парковка Ботаника',   nameRo: 'Parcare Botanica',     nameEn: 'Botanica Parking',      address: 'бул. Дечебал 10, Кишинёв',        addressRo: 'bd. Decebal 10, Chișinău',          addressEn: 'Decebal blvd. 10, Chisinau',        description: 'Район Ботаника',       location: { type: 'Point', coordinates: [28.8453, 47.0140] }, totalSpots: 6, workingHours: { open: '00:00', close: '23:59' } });
    const lot4 = await ParkingLot.create({ name: 'Парковка Рышкановка', nameRo: 'Parcare Râșcani',      nameEn: 'Ryshkanovka Parking',   address: 'ул. Московская 15, Кишинёв',      addressRo: 'str. Moscovei 15, Chișinău',        addressEn: 'Moskovskaya st. 15, Chisinau',      description: 'Возле супермаркета',    location: { type: 'Point', coordinates: [28.8120, 47.0380] }, totalSpots: 4, workingHours: { open: '07:00', close: '22:00' } });
    console.log('Парковки: 4');

    // ——— Места ———
    // Макет (lot1): 4 места, привязка к ESP32 barrier ИК-датчикам
    const s1 = await ParkingSpot.insertMany([
      { parkingLotId: lot1._id, spotNumber: 1, status: 'free', zone: 'A', floor: 1, deviceId: 'barrier-01_ir1' },
      { parkingLotId: lot1._id, spotNumber: 2, status: 'free', zone: 'A', floor: 1, deviceId: 'barrier-01_ir2' },
      { parkingLotId: lot1._id, spotNumber: 3, status: 'free', zone: 'B', floor: 1, deviceId: 'barrier-01_ir3' },
      { parkingLotId: lot1._id, spotNumber: 4, status: 'free', zone: 'B', floor: 1, deviceId: 'barrier-01_ir4' },
    ]);
    const makeSpots = (lot, n) =>
      ParkingSpot.insertMany(
        Array.from({ length: n }, (_, i) => ({
          parkingLotId: lot._id, spotNumber: i + 1, status: 'free',
          zone: i < Math.ceil(n / 2) ? 'A' : 'B', floor: 1,
          deviceId: `esp32_${lot.name.replace(/\s/g, '_').toLowerCase()}_spot${i + 1}`,
        }))
      );
    const [s2, s3, s4] = await Promise.all([makeSpots(lot2, 8), makeSpots(lot3, 6), makeSpots(lot4, 4)]);
    console.log('Места:', s1.length + s2.length + s3.length + s4.length);

    // ——— Тарифы (MDL) ———
    await Tariff.create({ parkingLotId: lot1._id, name: 'Макет Стандарт',        nameRo: 'Machetă Standard',     nameEn: 'Model Standard',       pricePerHour: 20, subscriptionWeek: 500,  subscriptionMonth: 1700, subscription3Months: 4500, subscriptionYear: 15000, peakMultiplier: 1.0, peakHoursStart: '00:00', peakHoursEnd: '23:59' });
    await Tariff.create({ parkingLotId: lot2._id, name: 'Стандарт Центр',        nameRo: 'Standard Centru',      nameEn: 'Standard Center',      pricePerHour: 25, subscriptionWeek: 600,  subscriptionMonth: 2000, subscription3Months: 5500, subscriptionYear: 18000, peakMultiplier: 1.5, peakHoursStart: '08:00', peakHoursEnd: '18:00' });
    await Tariff.create({ parkingLotId: lot3._id, name: 'Стандарт Ботаника',     nameRo: 'Standard Botanica',    nameEn: 'Standard Botanica',    pricePerHour: 20, subscriptionWeek: 500,  subscriptionMonth: 1700, subscription3Months: 4700, subscriptionYear: 15000, peakMultiplier: 1.3, peakHoursStart: '09:00', peakHoursEnd: '17:00' });
    await Tariff.create({ parkingLotId: lot4._id, name: 'Эконом Рышкановка',     nameRo: 'Econom Râșcani',       nameEn: 'Economy Ryshkanovka',  pricePerHour: 15, subscriptionWeek: 400,  subscriptionMonth: 1300, subscription3Months: 3600, subscriptionYear: 12000, peakMultiplier: 1.2, peakHoursStart: '08:00', peakHoursEnd: '19:00' });
    console.log('Тарифы: 4');

    // ——— IoT устройства (ESP32) ———
    // Макет: шлагбаум + 2 камеры (въезд/выезд)
    await IoTDevice.create({ deviceId: 'barrier-01',          parkingLotId: lot1._id, name: 'ESP32 Шлагбаум + ИК-датчики', spotIds: s1.map(s => s._id), status: 'offline', ipAddress: '192.168.100.50' });
    await IoTDevice.create({ deviceId: 'cam-entry-01',        parkingLotId: lot1._id, name: 'ESP32-CAM Въезд',              spotIds: [],                 status: 'offline', ipAddress: '192.168.100.48' });
    await IoTDevice.create({ deviceId: 'cam-exit-01',         parkingLotId: lot1._id, name: 'ESP32-CAM Выезд',              spotIds: [],                 status: 'offline', ipAddress: '192.168.100.49' });
    // Другие парковки (виртуальные устройства)
    await IoTDevice.create({ deviceId: 'esp32_centr_001',     parkingLotId: lot2._id, name: 'ESP32 Центр',                  spotIds: s2.map(s => s._id), status: 'offline' });
    await IoTDevice.create({ deviceId: 'esp32_botanica_001',  parkingLotId: lot3._id, name: 'ESP32 Ботаника',               spotIds: s3.map(s => s._id), status: 'offline' });
    await IoTDevice.create({ deviceId: 'esp32_ryshk_001',     parkingLotId: lot4._id, name: 'ESP32 Рышкановка',             spotIds: s4.map(s => s._id), status: 'offline' });
    console.log('IoT устройства: 6 (3 макет + 3 виртуальных)');

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
