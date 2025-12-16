const express = require('express');
const router = express.Router();
const { getForecastChart } = require('../controllers/forecastController');

router.get('/', getForecastChart);

module.exports = router;
