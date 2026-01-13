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
  // New date fields (primary)
  startDate: {
    type: Date,
    required: [true, 'Please add a start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Please add an end date']
  },
  // Legacy fields (kept for backward compatibility)
  date: {
    type: Date,
    required: false // Deprecated, use startDate instead
  },
  startTime: {
    type: Date,
    required: false // Deprecated, use startDate instead
  },
  // endTime field removed - use endDate instead
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
  maxAttendees: {
    type: Number,
    default: null,
    min: 1
  },
  shareToken: {
    type: String,
    default: null
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

// Validate that endDate is greater than or equal to startDate
eventSchema.pre('validate', function(next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date must be greater than or equal to start date');
  }
  next();
});

// Generate shareToken before saving if private and token doesn't exist
eventSchema.pre('save', async function(next) {
  if (this.visibility === 'private' && !this.shareToken) {
    const crypto = require('crypto');
    // Generate unique token
    let token;
    let isUnique = false;
    
    while (!isUnique) {
      token = crypto.randomBytes(32).toString('hex');
      const existing = await mongoose.model('Event').findOne({ shareToken: token });
      if (!existing) {
        isUnique = true;
      }
    }
    
    this.shareToken = token;
  }
  
  // Clear shareToken if event is changed to public
  if (this.visibility === 'public' && this.shareToken) {
    this.shareToken = null;
  }
  
  next();
});

// Index for faster queries
eventSchema.index({ category: 1 });
eventSchema.index({ visibility: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ date: 1 }); // Keep for backward compatibility
eventSchema.index({ startDate: 1 });
eventSchema.index({ endDate: 1 });
// Unique sparse index on shareToken (for fast lookups)
eventSchema.index({ shareToken: 1 }, { unique: true, sparse: true });
// Compound index for querying private events by visibility and shareToken
// Note: This doesn't conflict with the single-field index above as they serve different purposes

module.exports = mongoose.model('Event', eventSchema);

