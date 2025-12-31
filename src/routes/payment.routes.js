const express = require('express');
const router = express.Router();
const {
  createEventWithPayment,
  processEventPayment,
  processEventPaymentWithIBAN,
  getPaymentStatus,
  getUserPayments
} = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth');

// Create event with payment (for paid events)
router.post('/events/create-with-payment', protect, createEventWithPayment);

// Process payment for existing event
router.post('/process', protect, processEventPayment);

// Process event payment with IBAN transfer
router.post('/event/:eventId/pay', protect, processEventPaymentWithIBAN);

// Get payment status
router.get('/:paymentId/status', protect, getPaymentStatus);

// Get user's payments
router.get('/', protect, getUserPayments);

module.exports = router;

