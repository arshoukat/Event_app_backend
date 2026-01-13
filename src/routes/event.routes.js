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
  getMyPastEvents,
  getEventByShareToken,
  getShareLink,
  getEventManagement,
  checkCapacity
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

// Share token route (must be before /:id to avoid route conflicts)
router.get('/share/:shareToken', getEventByShareToken);

// Event-specific routes (must be before /:id to avoid route conflicts)
router.get('/:id/share-link', protect, getShareLink);
router.get('/:id/manage', protect, getEventManagement);
router.post('/:id/check-capacity', protect, checkCapacity);
router.post('/:id/register', protect, registerForEvent);

router.route('/:id')
  .get(getEvent)
  .put(protect, updateEvent)
  .delete(protect, deleteEvent);

module.exports = router;

