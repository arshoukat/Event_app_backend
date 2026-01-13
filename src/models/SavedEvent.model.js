const mongoose = require('mongoose');

const savedEventSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  }
}, {
  timestamps: true
});

// Prevent duplicate saves - unique compound index
savedEventSchema.index({ eventId: 1, userId: 1 }, { unique: true });

// Index for faster queries
savedEventSchema.index({ userId: 1, createdAt: -1 });

// Index on eventId for quick lookup
savedEventSchema.index({ eventId: 1 });

module.exports = mongoose.model('SavedEvent', savedEventSchema);

