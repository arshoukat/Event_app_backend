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
        // IBAN validation: 2 letters + 2 digits + up to 30 alphanumeric
        // Allow empty (optional field)
        if (!v || v === '') return true;
        
        // If already encrypted (contains colons), skip validation
        if (v.includes(':')) return true;
        
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
  // Only encrypt IBAN if it's being modified, exists, and is not already encrypted
  if (!this.isModified('iban') || !this.iban) {
    return next();
  }
  
  // Check if already encrypted (encrypted format contains colons: iv:tag:encryptedData)
  if (this.iban.includes(':')) {
    return next();
  }
  
  try {
    // Encrypt the IBAN
    this.iban = encrypt(this.iban);
    next();
  } catch (error) {
    return next(error);
  }
});

// Method to decrypt IBAN
userSchema.methods.getDecryptedIban = function() {
  if (!this.iban) {
    return null;
  }
  
  // Check if IBAN is encrypted (encrypted format contains colons: iv:tag:encryptedData)
  // Encrypted format: "hexiv:hextag:hexencrypteddata" (3 parts separated by colons)
  const parts = this.iban.split(':');
  const isEncrypted = parts.length === 3 && parts[0].length > 0 && parts[1].length > 0 && parts[2].length > 0;
  
  if (!isEncrypted) {
    // Not encrypted (legacy data or already decrypted), return as is
    console.log('IBAN is not encrypted, returning as is:', this.iban);
    return this.iban;
  }
  
  try {
    console.log('Attempting to decrypt IBAN...');
    const decrypted = decrypt(this.iban);
    console.log('IBAN decrypted successfully');
    return decrypted;
  } catch (error) {
    console.error('Error decrypting IBAN:', error.message);
    console.error('IBAN value (first 50 chars):', this.iban.substring(0, 50));
    // If decryption fails, return the original value (might be unencrypted data that looks encrypted)
    console.warn('IBAN decryption failed, returning original value');
    return this.iban;
  }
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Transform to automatically decrypt IBAN when converting to JSON
userSchema.set('toJSON', {
  transform: function(doc, ret) {
    // Decrypt IBAN if it exists and is encrypted
    if (ret.iban) {
      try {
        const parts = ret.iban.split(':');
        const isEncrypted = parts.length === 3 && parts[0].length > 0 && parts[1].length > 0 && parts[2].length > 0;
        
        if (isEncrypted) {
          ret.iban = decrypt(ret.iban);
        }
        // If not encrypted, keep as is
      } catch (error) {
        console.error('Error decrypting IBAN in toJSON transform:', error.message);
        // Keep encrypted value if decryption fails
      }
    }
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);

