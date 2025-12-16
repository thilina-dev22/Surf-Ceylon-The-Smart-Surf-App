const express = require('express');
const router = express.Router();
const { getSpots } = require('../controllers/spotsController');

router.get('/', getSpots);

module.exports = router;
