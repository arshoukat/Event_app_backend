const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../utils/encryption');

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
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters']
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
  emailVerified: {
    type: Boolean,
    default: false
  },
  iban: {
    type: String,
    default: null,
    trim: true,
    validate: {
      validator: function(v) {
        // Allow empty (optional field)
        if (!v || v === '') return true;
        
        // Check if IBAN is already encrypted (encrypted format: iv:tag:encryptedData)
        // If it's encrypted, skip validation (it was validated before encryption)
        if (v.includes(':') && v.split(':').length === 3) {
          return true; // Already encrypted, skip validation
        }
        
        // Validate plain text IBAN
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
      // Note: This setter runs before encryption, so we normalize the plain text
      if (!v || v === '') return null;
      // If already encrypted (contains colons), return as is
      if (v.includes(':')) return v;
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

// Encrypt IBAN before saving
userSchema.pre('save', async function(next) {
  // Only encrypt IBAN if it's being modified and exists
  if (!this.isModified('iban') || !this.iban) {
    return next();
  }
  
  // Check if IBAN is already encrypted (encrypted format: iv:tag:encryptedData)
  // If it contains colons and looks like encrypted format, skip encryption
  if (this.iban.includes(':') && this.iban.split(':').length === 3) {
    return next();
  }
  
  try {
    // Encrypt the IBAN
    this.iban = encrypt(this.iban);
  } catch (error) {
    return next(new Error(`Failed to encrypt IBAN: ${error.message}`));
  }
  
  next();
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to decrypt IBAN
userSchema.methods.getDecryptedIBAN = function() {
  if (!this.iban) {
    return null;
  }
  
  try {
    // Check if IBAN is encrypted (format: iv:tag:encryptedData)
    if (this.iban.includes(':') && this.iban.split(':').length === 3) {
      try {
        return decrypt(this.iban);
      } catch (decryptError) {
        // Decryption failed - could be due to:
        // 1. Wrong encryption key
        // 2. Corrupted data
        // 3. Data encrypted with different key
        console.error('Error decrypting IBAN:', decryptError.message);
        console.error('This usually means ENCRYPTION_KEY has changed or the data was encrypted with a different key.');
        console.error('IBAN format check:', this.iban.substring(0, 50) + '...');
        // Return null instead of throwing to prevent breaking the API
        return null;
      }
    }
    // If not encrypted (legacy data or plain text), return as-is
    return this.iban;
  } catch (error) {
    console.error('Unexpected error in getDecryptedIBAN:', error);
    return null;
  }
};

// Transform to automatically decrypt IBAN when converting to JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  
  // Decrypt IBAN if it exists
  if (obj.iban) {
    try {
      // Check if IBAN is encrypted (format: iv:tag:encryptedData)
      if (obj.iban.includes(':') && obj.iban.split(':').length === 3) {
        try {
          obj.iban = decrypt(obj.iban);
        } catch (decryptError) {
          // Decryption failed - set to null to prevent exposing corrupted data
          console.error('Error decrypting IBAN in toJSON:', decryptError.message);
          obj.iban = null;
        }
      }
      // If not encrypted (legacy data), keep as-is
    } catch (error) {
      console.error('Unexpected error decrypting IBAN in toJSON:', error);
      obj.iban = null;
    }
  }
  
  return obj;
};

module.exports = mongoose.model('User', userSchema);

