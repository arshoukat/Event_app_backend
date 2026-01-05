const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  getMyUpcomingEvents,
  getMyOngoingEvents,
  getMyPastEvents
} = require('../controllers/event.controller');
const { protect } = require('../middleware/auth');
const upload = require('../config/multer');

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'Image file size exceeds 10MB limit'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'File upload error',
      message: err.message
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      error: 'File upload error',
      message: err.message
    });
  }
  next();
};

router.route('/')
  .get(getEvents)
  .post(protect, upload.single('coverImage'), handleMulterError, createEvent);

// My events routes (must be before /:id to avoid route conflicts)
router.get('/my/upcoming', protect, getMyUpcomingEvents);
router.get('/my/ongoing', protect, getMyOngoingEvents);
router.get('/my/past', protect, getMyPastEvents);

router.route('/:id')
  .get(getEvent)
  .put(protect, updateEvent)
  .delete(protect, deleteEvent);

router.post('/:id/register', protect, registerForEvent);

module.exports = router;

