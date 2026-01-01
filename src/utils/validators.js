/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate array of emails
 * @param {Array<string>} emails - Array of email addresses
 * @returns {Object} - { valid: boolean, invalidEmails: Array<string> }
 */
function validateEmails(emails) {
  if (!Array.isArray(emails)) {
    return { valid: false, invalidEmails: [], message: 'Emails must be an array' };
  }

  const invalidEmails = emails.filter(email => !isValidEmail(email));
  
  return {
    valid: invalidEmails.length === 0,
    invalidEmails,
    message: invalidEmails.length > 0 
      ? `Invalid email addresses: ${invalidEmails.join(', ')}`
      : 'All emails are valid'
  };
}

/**
 * Validate ISO 8601 date string
 * @param {string} dateString - Date string to validate
 * @returns {boolean} - True if valid ISO 8601 date
 */
function isValidISODate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && dateString.includes('T');
}

/**
 * Validate that endTime is after startTime
 * @param {string} startTime - Start time ISO string
 * @param {string} endTime - End time ISO string
 * @returns {boolean} - True if endTime is after startTime
 */
function isEndTimeAfterStartTime(startTime, endTime) {
  if (!startTime || !endTime) return false;
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  return end > start;
}

/**
 * Validate price array structure
 * @param {Array} priceArray - Price array to validate
 * @returns {Object} - { valid: boolean, message: string }
 */
function validatePriceArray(priceArray) {
  if (!Array.isArray(priceArray)) {
    return { valid: false, message: 'Price must be an array' };
  }

  if (priceArray.length === 0) {
    return { valid: true, message: 'Free event (empty price array)' };
  }

  for (let i = 0; i < priceArray.length; i++) {
    const seatType = priceArray[i];
    
    if (!seatType || typeof seatType !== 'object') {
      return { valid: false, message: `Price[${i}] must be an object` };
    }
    
    if (!seatType.name || typeof seatType.name !== 'string' || seatType.name.trim() === '') {
      return { valid: false, message: `Price[${i}].name is required and must be a non-empty string` };
    }
    
    if (typeof seatType.price !== 'number' || seatType.price < 0) {
      return { valid: false, message: `Price[${i}].price must be a number >= 0` };
    }
  }

  return { valid: true, message: 'Price array is valid' };
}

/**
 * Validate tags array
 * @param {Array} tags - Tags array to validate
 * @returns {Object} - { valid: boolean, message: string }
 */
function validateTags(tags) {
  if (!tags) {
    return { valid: true, message: 'No tags provided' };
  }

  if (!Array.isArray(tags)) {
    return { valid: false, message: 'Tags must be an array' };
  }

  if (tags.length > 5) {
    return { valid: false, message: 'Maximum 5 tags allowed' };
  }

  for (let i = 0; i < tags.length; i++) {
    if (typeof tags[i] !== 'string' || tags[i].trim() === '') {
      return { valid: false, message: `Tag[${i}] must be a non-empty string` };
    }
  }

  return { valid: true, message: 'Tags are valid' };
}

module.exports = {
  isValidEmail,
  validateEmails,
  isValidISODate,
  isEndTimeAfterStartTime,
  validatePriceArray,
  validateTags
};

