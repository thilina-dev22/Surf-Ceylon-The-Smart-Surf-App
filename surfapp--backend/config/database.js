const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
let isMongoConnected = false;

const connectDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of default 30
    });
    console.log('✅ MongoDB connected - Session tracking enabled');
    isMongoConnected = true;
    return true;
  } catch (err) {
    console.warn('⚠️  MongoDB connection failed - Session tracking disabled');
    console.warn('   App will still work for spot viewing and forecasts');
    console.warn('   To enable session tracking, ensure MongoDB is running');
    console.warn('   Error:', err.message);
    isMongoConnected = false;
    return false;
  }
};

const getConnectionStatus = () => isMongoConnected;

module.exports = {
  connectDatabase,
  getConnectionStatus
};
