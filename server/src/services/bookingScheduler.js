// Планировщик — автоматическое завершение просроченных бронирований
// Каждые 60 сек проверяет active бронирования с истёкшим endTime
const Booking = require('../models/Booking');
const ParkingSpot = require('../models/ParkingSpot');

// Проверка и завершение просроченных бронирований
const checkExpiredBookings = async (io) => {
  try {
    const expired = await Booking.find({ status: 'active', endTime: { $lte: new Date() } });

    for (const booking of expired) {
      booking.status = 'expired';
      await booking.save();

      // Освобождаем место
      const spot = await ParkingSpot.findById(booking.parkingSpotId);
      if (spot) {
        if (booking.type === 'subscription') {
          spot.isSubscription = false;
          spot.subscribedUserId = null;
        }
        spot.status = 'free';
        await spot.save();

        // Уведомляем клиентов через WebSocket (по комнате парковки)
        if (io) {
          const payload = {
            parkingLotId: spot.parkingLotId,
            spots: [{ _id: spot._id, spotNumber: spot.spotNumber, status: 'free' }],
          };
          io.to(`parking:${spot.parkingLotId}`).emit('spots:update', payload);
          io.to('admin').emit('spots:update', payload);
        }
      }
    }

    if (expired.length > 0) console.log(`Истекло ${expired.length} бронирований`);
  } catch (error) {
    console.error('Ошибка проверки бронирований:', error);
  }
};

// Запуск — каждые 60 секунд
const startBookingScheduler = (io) => {
  setInterval(() => checkExpiredBookings(io), 60_000);
  console.log('Планировщик бронирований запущен (каждые 60с)');
};

module.exports = { startBookingScheduler, checkExpiredBookings };
