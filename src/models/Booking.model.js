const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  status: {
    type: String,
    enum: ['confirmed', 'cancelled', 'attended'],
    default: 'confirmed'
  },
  ticketType: {
    type: String,
    default: 'free'
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Prevent duplicate bookings - user cannot book the same event twice
bookingSchema.index({ eventId: 1, userId: 1 }, { unique: true });

// Index for quick lookup of user bookings
bookingSchema.index({ userId: 1 });

// Index for quick lookup of event bookings
bookingSchema.index({ eventId: 1 });

module.exports = mongoose.model('Booking', bookingSchema);

