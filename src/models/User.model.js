const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  otp: {
    type: String,
    select: false
  },
  otpExpiry: {
    type: Date,
    select: false
  },
  iban: {
    type: String,
    default: null,
    trim: true,
    validate: {
      validator: function(v) {
        // IBAN validation: 2 letters + 2 digits + up to 30 alphanumeric
        // Allow empty (optional field)
        if (!v || v === '') return true;
        // Remove spaces and convert to uppercase for validation
        const cleaned = v.replace(/\s/g, '').toUpperCase();
        // IBAN format: 2 letters (country code) + 2 digits (check digits) + up to 30 alphanumeric
        const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/;
        return ibanRegex.test(cleaned);
      },
      message: 'Invalid IBAN format. IBAN must be 2 letters followed by 2 digits and up to 30 alphanumeric characters.'
    },
    set: function(v) {
      // Clean and normalize IBAN before storing (remove spaces, uppercase)
      if (!v || v === '') return null;
      return v.replace(/\s/g, '').toUpperCase();
    }
  }
}, {
  timestamps: true
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  // Only hash password if it's being modified and exists
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

