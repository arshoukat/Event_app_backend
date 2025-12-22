const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    select: false
  },
  confirmPassword: {
    type: String,
    select: false
  },
  phone: {
    type: String,
    trim: true
  },
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Profile', ProfileSchema);

