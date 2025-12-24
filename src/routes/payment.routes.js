const express = require('express');
const router = express.Router();
const {
  createEventWithPayment,
  processEventPayment,
  getPaymentStatus,
  getUserPayments
} = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth');

// Create event with payment (for paid events)
router.post('/events/create-with-payment', protect, createEventWithPayment);

// Process payment for existing event
router.post('/process', protect, processEventPayment);

// Get payment status
router.get('/:paymentId/status', protect, getPaymentStatus);

// Get user's payments
router.get('/', protect, getUserPayments);

module.exports = router;

