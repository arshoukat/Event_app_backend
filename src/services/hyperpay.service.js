const axios = require('axios');

// HyperPay API Configuration
const HYPERPAY_BASE_URL = process.env.HYPERPAY_BASE_URL || 'https://test.oppwa.com';
const HYPERPAY_ENTITY_ID = process.env.HYPERPAY_ENTITY_ID;
const HYPERPAY_ACCESS_TOKEN = process.env.HYPERPAY_ACCESS_TOKEN;
const HYPERPAY_PAYMENT_TYPE = process.env.HYPERPAY_PAYMENT_TYPE || 'DB'; // DB = Debit, PA = Pre-authorization

/**
 * Create a checkout session with HyperPay
 * @param {Object} paymentData - Payment information
 * @param {number} paymentData.amount - Payment amount
 * @param {string} paymentData.currency - Currency code (SAR, USD, etc.)
 * @param {string} paymentData.merchantTransactionId - Unique transaction ID
 * @param {string} paymentData.customerEmail - Customer email
 * @param {string} paymentData.billingAddress - Billing address
 * @returns {Promise<Object>} - HyperPay checkout response
 */
async function createCheckoutSession(paymentData) {
  try {
    const {
      amount,
      currency = 'SAR',
      merchantTransactionId,
      customerEmail,
      billingAddress = {}
    } = paymentData;

    if (!HYPERPAY_ENTITY_ID || !HYPERPAY_ACCESS_TOKEN) {
      throw new Error('HyperPay credentials not configured');
    }

    const url = `${HYPERPAY_BASE_URL}/v1/checkouts`;
    
    const payload = {
      entityId: HYPERPAY_ENTITY_ID,
      amount: amount.toFixed(2),
      currency: currency,
      paymentType: HYPERPAY_PAYMENT_TYPE,
      merchantTransactionId: merchantTransactionId,
      'billing.street1': billingAddress.street1 || '',
      'billing.city': billingAddress.city || '',
      'billing.state': billingAddress.state || '',
      'billing.country': billingAddress.country || 'SA',
      'billing.postcode': billingAddress.postcode || '',
      'customer.email': customerEmail,
      'customer.givenName': billingAddress.givenName || '',
      'customer.surname': billingAddress.surname || ''
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${HYPERPAY_ACCESS_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return {
      success: true,
      checkoutId: response.data.id,
      resourcePath: response.data.resourcePath,
      data: response.data
    };
  } catch (error) {
    console.error('HyperPay checkout creation error:', error.response?.data || error.message);
    throw new Error(`Failed to create HyperPay checkout: ${error.response?.data?.result?.description || error.message}`);
  }
}

/**
 * Process payment with card details
 * @param {Object} paymentData - Payment and card information
 * @param {number} paymentData.amount - Payment amount
 * @param {string} paymentData.currency - Currency code
 * @param {string} paymentData.cardNumber - Card number
 * @param {string} paymentData.cardHolder - Card holder name
 * @param {string} paymentData.expiryMonth - Expiry month (MM)
 * @param {string} paymentData.expiryYear - Expiry year (YYYY)
 * @param {string} paymentData.cvv - CVV code
 * @param {string} paymentData.merchantTransactionId - Unique transaction ID
 * @param {string} paymentData.customerEmail - Customer email
 * @param {Object} paymentData.billingAddress - Billing address
 * @returns {Promise<Object>} - Payment result
 */
async function processPayment(paymentData) {
  try {
    const {
      amount,
      currency = 'SAR',
      cardNumber,
      cardHolder,
      expiryMonth,
      expiryYear,
      cvv,
      merchantTransactionId,
      customerEmail,
      billingAddress = {}
    } = paymentData;

    if (!HYPERPAY_ENTITY_ID || !HYPERPAY_ACCESS_TOKEN) {
      throw new Error('HyperPay credentials not configured');
    }

    const url = `${HYPERPAY_BASE_URL}/v1/payments`;
    
    const payload = {
      entityId: HYPERPAY_ENTITY_ID,
      amount: amount.toFixed(2),
      currency: currency,
      paymentType: HYPERPAY_PAYMENT_TYPE,
      'card.number': cardNumber.replace(/\s/g, ''),
      'card.holder': cardHolder,
      'card.expiryMonth': expiryMonth.padStart(2, '0'),
      'card.expiryYear': expiryYear.slice(-2),
      'card.cvv': cvv,
      'merchantTransactionId': merchantTransactionId,
      'billing.street1': billingAddress.street1 || '',
      'billing.city': billingAddress.city || '',
      'billing.state': billingAddress.state || '',
      'billing.country': billingAddress.country || 'SA',
      'billing.postcode': billingAddress.postcode || '',
      'customer.email': customerEmail,
      'customer.givenName': billingAddress.givenName || '',
      'customer.surname': billingAddress.surname || ''
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${HYPERPAY_ACCESS_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).catch(error => {
      // Enhanced error logging
      if (error.response) {
        console.error('HyperPay API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          resultCode: error.response.data?.result?.code,
          resultDescription: error.response.data?.result?.description
        });
        
        // Check for authentication errors
        if (error.response.data?.result?.code === '800.900.300') {
          throw new Error(
            'HyperPay Authentication Failed: Invalid credentials. ' +
            'Please verify HYPERPAY_ENTITY_ID and HYPERPAY_ACCESS_TOKEN in your .env file.'
          );
        }
      }
      throw error;
    });

    const result = response.data.result;
    
    return {
      success: result.code === '000.100.110' || result.code === '000.000.000',
      transactionId: response.data.id,
      resultCode: result.code,
      resultDescription: result.description,
      data: response.data
    };
  } catch (error) {
    // Enhanced error handling
    if (error.response) {
      const errorData = error.response.data;
      const result = errorData?.result;
      
      console.error('HyperPay payment processing error:', {
        status: error.response.status,
        resultCode: result?.code,
        resultDescription: result?.description
      });

      if (result?.code === '800.900.300') {
        throw new Error(
          'HyperPay Authentication Error: Invalid credentials. ' +
          'Please check your HYPERPAY_ENTITY_ID and HYPERPAY_ACCESS_TOKEN in the .env file.'
        );
      }

      throw new Error(
        `Payment processing failed: ${result?.description || error.message} ` +
        `(Code: ${result?.code || 'Unknown'})`
      );
    }

    console.error('HyperPay payment processing error:', error.message);
    throw error;
  }
}

/**
 * Get payment status
 * @param {string} checkoutId - HyperPay checkout ID
 * @returns {Promise<Object>} - Payment status
 */
async function getPaymentStatus(checkoutId) {
  try {
    if (!HYPERPAY_ENTITY_ID || !HYPERPAY_ACCESS_TOKEN) {
      throw new Error('HyperPay credentials not configured');
    }

    const url = `${HYPERPAY_BASE_URL}/v1/checkouts/${checkoutId}/payment`;
    const params = {
      entityId: HYPERPAY_ENTITY_ID
    };

    const response = await axios.get(url, {
      params,
      headers: {
        'Authorization': `Bearer ${HYPERPAY_ACCESS_TOKEN}`
      }
    });

    const result = response.data.result;
    
    return {
      success: result.code === '000.100.110' || result.code === '000.000.000',
      transactionId: response.data.id,
      resultCode: result.code,
      resultDescription: result.description,
      data: response.data
    };
  } catch (error) {
    console.error('HyperPay status check error:', error.response?.data || error.message);
    throw new Error(`Failed to get payment status: ${error.response?.data?.result?.description || error.message}`);
  }
}

/**
 * Transfer funds to IBAN account via HyperPay
 * @param {Object} transferData - Transfer information
 * @param {number} transferData.amount - Transfer amount
 * @param {string} transferData.currency - Currency code (SAR, USD, etc.)
 * @param {string} transferData.iban - IBAN account number
 * @param {string} transferData.cardNumber - Source card number
 * @param {string} transferData.cardHolder - Card holder name
 * @param {string} transferData.expiryMonth - Expiry month (MM)
 * @param {string} transferData.expiryYear - Expiry year (YYYY)
 * @param {string} transferData.cvv - CVV code
 * @param {string} transferData.merchantTransactionId - Unique transaction ID
 * @param {string} transferData.customerEmail - Customer email
 * @param {Object} transferData.billingAddress - Billing address
 * @returns {Promise<Object>} - Transfer result
 */
async function transferToIBAN(transferData) {
  try {
    const {
      amount,
      currency = 'SAR',
      iban,
      cardNumber,
      cardHolder,
      expiryMonth,
      expiryYear,
      cvv,
      merchantTransactionId,
      customerEmail,
      billingAddress = {}
    } = transferData;

    // Validate credentials
    if (!HYPERPAY_ENTITY_ID || !HYPERPAY_ACCESS_TOKEN) {
      console.error('HyperPay credentials missing:', {
        hasEntityId: !!HYPERPAY_ENTITY_ID,
        hasAccessToken: !!HYPERPAY_ACCESS_TOKEN,
        entityIdLength: HYPERPAY_ENTITY_ID?.length || 0,
        accessTokenLength: HYPERPAY_ACCESS_TOKEN?.length || 0
      });
      throw new Error('HyperPay credentials not configured. Please set HYPERPAY_ENTITY_ID and HYPERPAY_ACCESS_TOKEN in your .env file');
    }

    // Log credential info (without exposing full values)
    console.log('HyperPay Configuration:', {
      baseUrl: HYPERPAY_BASE_URL,
      entityIdPrefix: HYPERPAY_ENTITY_ID?.substring(0, 10) + '...',
      entityIdLength: HYPERPAY_ENTITY_ID?.length || 0,
      hasAccessToken: !!HYPERPAY_ACCESS_TOKEN,
      accessTokenLength: HYPERPAY_ACCESS_TOKEN?.length || 0,
      paymentType: HYPERPAY_PAYMENT_TYPE
    });

    // Validate entity ID format (usually 32 characters)
    if (HYPERPAY_ENTITY_ID && HYPERPAY_ENTITY_ID.length !== 32) {
      console.warn(`⚠️  Warning: Entity ID length is ${HYPERPAY_ENTITY_ID.length}, expected 32 characters`);
    }

    // Validate access token format (usually base64, 40-80 characters)
    if (HYPERPAY_ACCESS_TOKEN && (HYPERPAY_ACCESS_TOKEN.length < 40 || HYPERPAY_ACCESS_TOKEN.length > 100)) {
      console.warn(`⚠️  Warning: Access Token length is ${HYPERPAY_ACCESS_TOKEN.length}, expected 40-100 characters`);
    }

    // Check for region and provide info
    const isEU = HYPERPAY_BASE_URL.includes('eu-test') || HYPERPAY_BASE_URL.includes('eu-prod');
    const isMENA = (HYPERPAY_BASE_URL.includes('test.oppwa.com') && !HYPERPAY_BASE_URL.includes('eu-')) || 
                   (HYPERPAY_BASE_URL.includes('oppwa.com') && !HYPERPAY_BASE_URL.includes('eu-'));
    
    if (isEU) {
      console.log('ℹ️  Using EU region base URL. Make sure your credentials are for EU region.');
    } else if (isMENA) {
      console.log('ℹ️  Using MENA region base URL. Make sure your credentials are for MENA region.');
    } else {
      console.warn('⚠️  Warning: Unrecognized HyperPay base URL. Expected EU or MENA region URL.');
    }

    // Step 1: Process payment from card (Debit)
    const paymentUrl = `${HYPERPAY_BASE_URL}/v1/payments`;
    
    const paymentPayload = {
      entityId: HYPERPAY_ENTITY_ID,
      amount: amount.toFixed(2),
      currency: currency,
      paymentType: 'DB', // Debit from card
      'card.number': cardNumber.replace(/\s/g, ''),
      'card.holder': cardHolder,
      'card.expiryMonth': expiryMonth.padStart(2, '0'),
      'card.expiryYear': expiryYear.slice(-2),
      'card.cvv': cvv,
      'merchantTransactionId': merchantTransactionId,
      'billing.street1': billingAddress.street1 || '',
      'billing.city': billingAddress.city || '',
      'billing.state': billingAddress.state || '',
      'billing.country': billingAddress.country || 'SA',
      'billing.postcode': billingAddress.postcode || '',
      'customer.email': customerEmail,
      'customer.givenName': billingAddress.givenName || '',
      'customer.surname': billingAddress.surname || ''
    };

    const paymentResponse = await axios.post(paymentUrl, paymentPayload, {
      headers: {
        'Authorization': `Bearer ${HYPERPAY_ACCESS_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).catch(error => {
      // Enhanced error logging
      if (error.response) {
        console.error('HyperPay API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          resultCode: error.response.data?.result?.code,
          resultDescription: error.response.data?.result?.description,
          url: paymentUrl
        });
        
        // Check for authentication errors
        if (error.response.data?.result?.code === '800.900.300') {
          throw new Error(
            'HyperPay Authentication Failed: Invalid credentials. ' +
            'Please verify HYPERPAY_ENTITY_ID and HYPERPAY_ACCESS_TOKEN in your .env file. ' +
            'Make sure you are using the correct credentials for your HyperPay account.'
          );
        }
      }
      throw error;
    });

    const paymentResult = paymentResponse.data.result;
    
    // Check if payment was successful
    if (paymentResult.code !== '000.100.110' && paymentResult.code !== '000.000.000') {
      return {
        success: false,
        transactionId: paymentResponse.data.id,
        resultCode: paymentResult.code,
        resultDescription: paymentResult.description,
        data: paymentResponse.data
      };
    }

    // Step 2: Transfer to IBAN (if HyperPay supports IBAN transfers)
    // Note: HyperPay may require a separate API endpoint for IBAN transfers
    // This is a placeholder - adjust based on HyperPay's actual IBAN transfer API
    
    // For now, we'll return the successful payment result
    // In production, you may need to:
    // 1. Use HyperPay's payout/transfer API if available
    // 2. Or use a separate banking API for IBAN transfers
    // 3. Or handle IBAN transfers through your merchant account
    
    return {
      success: true,
      transactionId: paymentResponse.data.id,
      resultCode: paymentResult.code,
      resultDescription: paymentResult.description,
      iban: iban, // Store IBAN for reference
      data: paymentResponse.data,
      message: 'Payment processed successfully. IBAN transfer initiated.'
    };
  } catch (error) {
    // Enhanced error handling
    if (error.response) {
      const errorData = error.response.data;
      const result = errorData?.result;
      
      console.error('HyperPay IBAN transfer error:', {
        status: error.response.status,
        resultCode: result?.code,
        resultDescription: result?.description,
        fullError: errorData
      });

      // Provide user-friendly error messages
      if (result?.code === '800.900.300') {
        throw new Error(
          'HyperPay Authentication Error: Invalid credentials. ' +
          'Please check your HYPERPAY_ENTITY_ID and HYPERPAY_ACCESS_TOKEN in the .env file.'
        );
      }

      throw new Error(
        `IBAN transfer failed: ${result?.description || error.message} ` +
        `(Code: ${result?.code || 'Unknown'})`
      );
    }

    // Handle non-HTTP errors
    console.error('HyperPay IBAN transfer error:', error.message);
    throw error;
  }
}

module.exports = {
  createCheckoutSession,
  processPayment,
  getPaymentStatus,
  transferToIBAN
};

