const { getConnectionStatus } = require('../config/database');

const mongoStatus = (req, res, next) => {
  req.isMongoConnected = getConnectionStatus();
  next();
};

module.exports = mongoStatus;
