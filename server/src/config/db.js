// Подключение к MongoDB
const mongoose = require('mongoose');
const config = require('./index');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB подключена: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Ошибка подключения MongoDB: ${error.message}`);
    console.error('Убедитесь что MongoDB запущена:', config.mongoUri);
    process.exit(1);
  }
};

module.exports = connectDB;
