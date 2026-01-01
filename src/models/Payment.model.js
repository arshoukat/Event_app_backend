const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'SAR', // Saudi Riyal (HyperPay default)
    enum: ['SAR', 'USD', 'EUR', 'AED']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  // HyperPay transaction details
  hyperpayTransactionId: {
    type: String,
    select: false
  },
  hyperpayCheckoutId: {
    type: String,
    select: false
  },
  hyperpayResourcePath: {
    type: String,
    select: false
  },
  // Encrypted card information
  encryptedCardNumber: {
    type: String,
    required: true,
    select: false
  },
  encryptedCardHolder: {
    type: String,
    select: false
  },
  encryptedExpiryMonth: {
    type: String,
    select: false
  },
  encryptedExpiryYear: {
    type: String,
    select: false
  },
  // Last 4 digits for display (not encrypted)
  last4Digits: {
    type: String,
    required: true
  },
  cardBrand: {
    type: String,
    enum: ['VISA', 'MASTER', 'AMEX', 'MADA', 'DISCOVER', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  // Payment metadata
  paymentMethod: {
    type: String,
    enum: ['card', 'applepay', 'googlepay'],
    default: 'card'
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  failureReason: {
    type: String,
    select: false
  }
}, {
  timestamps: true
});

// Index for faster queries
paymentSchema.index({ event: 1, user: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ hyperpayTransactionId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

