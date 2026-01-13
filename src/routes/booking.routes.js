const express = require('express');
const router = express.Router();
const { createBooking, getMyBookings } = require('../controllers/booking.controller');
const { protect } = require('../middleware/auth');

// GET /api/bookings?userId=... - Get all bookings for a user
router.get('/', protect, getMyBookings);

// POST /api/bookings - Create a new booking for a free event
router.post('/', protect, createBooking);

module.exports = router;

