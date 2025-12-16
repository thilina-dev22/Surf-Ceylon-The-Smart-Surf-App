const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authController.getProfile);
router.put('/preferences', authController.updatePreferences);
router.put('/profile', authController.updateProfile);
router.put('/password', authController.changePassword);
router.delete('/account', authController.deleteAccount);

module.exports = router;