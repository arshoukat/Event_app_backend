const express = require('express');
const router = express.Router();
const { saveEvent, getSavedEvents, unsaveEvent } = require('../controllers/savedEvent.controller');
const { protect } = require('../middleware/auth');

// GET /api/saved-events?userId=... - Get all saved events for a user
router.get('/', protect, getSavedEvents);

// POST /api/saved-events - Save an event
router.post('/', protect, saveEvent);

// DELETE /api/saved-events/:id - Unsave an event
router.delete('/:id', protect, unsaveEvent);

module.exports = router;

