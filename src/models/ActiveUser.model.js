const mongoose = require('mongoose');

const ActiveUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// verificationToken is a short-lived, single-use token issued after OTP verification
ActiveUserSchema.add({
  verificationToken: {
    type: String,
    default: null
  }
});

// Store a snapshot of the user profile created at verification time. This allows
// completing signup by merging/updating the existing placeholder user document.
ActiveUserSchema.add({
  tempUserId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  profile: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

module.exports = mongoose.model('ActiveUser', ActiveUserSchema);
