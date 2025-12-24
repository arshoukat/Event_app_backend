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
    console.error('HyperPay payment processing error:', error.response?.data || error.message);
    throw new Error(`Payment processing failed: ${error.response?.data?.result?.description || error.message}`);
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

module.exports = {
  createCheckoutSession,
  processPayment,
  getPaymentStatus
};

