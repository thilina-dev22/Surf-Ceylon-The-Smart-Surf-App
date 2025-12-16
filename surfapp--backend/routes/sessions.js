const express = require('express');
const router = express.Router();
const sessionsController = require('../controllers/sessionsController');

/**
 * Session Tracking Routes - Phase 2
 * Endpoints for tracking and analyzing user surf sessions
 */

// Session management routes
router.post('/start', sessionsController.startSession);
router.post('/:sessionId/end', sessionsController.endSession);
router.get('/user/:userId', sessionsController.getUserSessions);
router.get('/user/:userId/insights', sessionsController.getUserInsights);
router.get('/spot/:spotId/stats', sessionsController.getSpotStats);

module.exports = router;
