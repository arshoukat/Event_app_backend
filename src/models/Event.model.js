const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Please add an event date']
  },
  startTime: {
    type: Date,
    required: [true, 'Please add a start time']
  },
  endTime: {
    type: Date,
    required: [true, 'Please add an end time']
  },
  location: {
    type: String,
    trim: true
  },
  venue: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: ['music', 'tech', 'art', 'sports', 'food', 'networking', 'wellness', 'education', 'entertainment', 'other'],
    default: 'other'
  },
  // Price structure: array of seat types
  price: {
    type: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      price: {
        type: Number,
        required: true,
        min: 0
      }
    }],
    default: []
  },
  capacity: {
    type: Number,
    default: 0
  },
  imageUrl: {
    type: String,
    default: null
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(v) {
        return v.length <= 5;
      },
      message: 'Maximum 5 tags allowed'
    }
  },
  visibility: {
    type: String,
    required: [true, 'Please specify visibility'],
    enum: ['public', 'private'],
    default: 'public'
  },
  invitedEmails: {
    type: [String],
    default: []
  },
  licenseFile: {
    type: String,
    default: null
  },
  iban: {
    type: String,
    default: null,
    trim: true
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'published'
  }
}, {
  timestamps: true
});

// Index for faster queries
eventSchema.index({ category: 1 });
eventSchema.index({ visibility: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ date: 1 });

module.exports = mongoose.model('Event', eventSchema);

