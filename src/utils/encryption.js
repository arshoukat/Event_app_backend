const crypto = require('crypto');

// Encryption key from environment variable (32 bytes for AES-256)
// WARNING: If ENCRYPTION_KEY is not set, a random key is generated which will be different on each server restart
// This means encrypted data cannot be decrypted after restart. Always set ENCRYPTION_KEY in production!
let ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.warn('⚠️  WARNING: ENCRYPTION_KEY not set in environment variables!');
  console.warn('⚠️  A random key will be generated, but encrypted data will not be decryptable after server restart.');
  console.warn('⚠️  Set ENCRYPTION_KEY in your .env file (64 hex characters = 32 bytes).');
  ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
}

// Validate that ENCRYPTION_KEY is a valid hex string of at least 64 characters
if (!/^[0-9a-fA-F]{64,}$/.test(ENCRYPTION_KEY)) {
  console.warn('⚠️  WARNING: ENCRYPTION_KEY should be at least 64 hex characters (32 bytes).');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, this is 96 bits (12 bytes) but we'll use 16 for compatibility
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Encrypt sensitive data (card number, etc.)
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text in format: iv:tag:encryptedData
 */
function encrypt(text) {
  if (!text) {
    throw new Error('Text to encrypt cannot be empty');
  }

  // Ensure encryption key is 32 bytes
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'); // Take first 64 hex chars = 32 bytes
  
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get authentication tag
  const tag = cipher.getAuthTag();
  
  // Return: iv:tag:encryptedData
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted text in format: iv:tag:encryptedData
 * @returns {string} - Decrypted text
 */
function decrypt(encryptedText) {
  if (!encryptedText) {
    throw new Error('Encrypted text cannot be empty');
  }

  try {
    // Ensure encryption key is 32 bytes
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
    
    // Split encrypted text
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Hash card number for comparison (one-way hash)
 * @param {string} cardNumber - Card number to hash
 * @returns {string} - Hashed card number
 */
function hashCardNumber(cardNumber) {
  return crypto.createHash('sha256').update(cardNumber).digest('hex');
}

/**
 * Mask card number (show only last 4 digits)
 * @param {string} cardNumber - Full card number
 * @returns {string} - Masked card number (e.g., **** **** **** 1234)
 */
function maskCardNumber(cardNumber) {
  if (!cardNumber || cardNumber.length < 4) {
    return '****';
  }
  const last4 = cardNumber.slice(-4);
  return `**** **** **** ${last4}`;
}

/**
 * Extract last 4 digits from card number
 * @param {string} cardNumber - Full card number
 * @returns {string} - Last 4 digits
 */
function getLast4Digits(cardNumber) {
  if (!cardNumber || cardNumber.length < 4) {
    return '';
  }
  return cardNumber.slice(-4);
}

/**
 * Detect card brand from card number
 * @param {string} cardNumber - Card number
 * @returns {string} - Card brand (VISA, MASTER, AMEX, MADA, etc.)
 */
function detectCardBrand(cardNumber) {
  if (!cardNumber) return 'UNKNOWN';
  
  const cleaned = cardNumber.replace(/\s/g, '');
  
  // Visa: starts with 4
  if (/^4/.test(cleaned)) return 'VISA';
  
  // Mastercard: starts with 5 or 2
  if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'MASTER';
  
  // American Express: starts with 34 or 37
  if (/^3[47]/.test(cleaned)) return 'AMEX';
  
  // MADA (Saudi): starts with specific ranges
  if (/^(508160|508161|508162|508163|508164|508165|508166|508167|508168|508169|508170|508171|508172|508173|508174|508175|508176|508177|508178|508179|508180|508181|508182|508183|508184|508185|508186|508187|508188|508189|508190|508191|508192|508193|508194|508195|508196|508197|508198|508199|508200|508201|508202|508203|508204|508205|508206|508207|508208|508209|508210|508211|508212|508213|508214|508215|508216|508217|508218|508219|508220|508221|508222|508223|508224|508225|508226|508227|508228|508229|508230|508231|508232|508233|508234|508235|508236|508237|508238|508239|508240|508241|508242|508243|508244|508245|508246|508247|508248|508249|508250|508251|508252|508253|508254|508255|508256|508257|508258|508259|508260|508261|508262|508263|508264|508265|508266|508267|508268|508269|508270|508271|508272|508273|508274|508275|508276|508277|508278|508279|508280|508281|508282|508283|508284|508285|508286|508287|508288|508289|508290|508291|508292|508293|508294|508295|508296|508297|508298|508299)/.test(cleaned)) return 'MADA';
  
  // Discover: starts with 6
  if (/^6/.test(cleaned)) return 'DISCOVER';
  
  return 'UNKNOWN';
}

module.exports = {
  encrypt,
  decrypt,
  hashCardNumber,
  maskCardNumber,
  getLast4Digits,
  detectCardBrand
};

