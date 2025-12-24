const Payment = require('../models/Payment.model');
const Event = require('../models/Event.model');
const { encrypt, getLast4Digits, detectCardBrand } = require('../utils/encryption');
const { processPayment, getPaymentStatus } = require('../services/hyperpay.service');

// @desc    Create event with payment (for paid events)
// @route   POST /api/events/create-with-payment
// @access  Private
exports.createEventWithPayment = async (req, res, next) => {
  try {
    const {
      // Event data
      title,
      description,
      date,
      location,
      category,
      image,
      price,
      capacity,
      status = 'draft',
      // Payment data
      cardNumber,
      cardHolder,
      expiryMonth,
      expiryYear,
      cvv,
      billingAddress
    } = req.body;

    // Validate event data
    if (!title || !description || !date || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required event fields (title, description, date, location)'
      });
    }

    // If event is paid, validate payment data
    if (price > 0) {
      if (!cardNumber || !cardHolder || !expiryMonth || !expiryYear || !cvv) {
        return res.status(400).json({
          success: false,
          message: 'Payment information required for paid events'
        });
      }
    }

    // Create event first
    const eventData = {
      title,
      description,
      date,
      location,
      category,
      image,
      price: price || 0,
      capacity: capacity || 0,
      status,
      createdBy: req.user.id
    };

    const event = await Event.create(eventData);

    // If event is free, return success
    if (price === 0 || !price) {
      return res.status(201).json({
        success: true,
        message: 'Free event created successfully',
        data: {
          event,
          payment: null
        }
      });
    }

    // Process payment for paid events
    try {
      // Generate unique transaction ID
      const merchantTransactionId = `EVT-${event._id}-${Date.now()}`;

      // Process payment with HyperPay
      const paymentResult = await processPayment({
        amount: price,
        currency: 'SAR',
        cardNumber,
        cardHolder,
        expiryMonth,
        expiryYear,
        cvv,
        merchantTransactionId,
        customerEmail: req.user.email,
        billingAddress: billingAddress || {
          givenName: req.user.name?.split(' ')[0] || '',
          surname: req.user.name?.split(' ').slice(1).join(' ') || '',
          country: 'SA'
        }
      });

      // Encrypt card information
      const encryptedCardNumber = encrypt(cardNumber);
      const encryptedCardHolder = encrypt(cardHolder);
      const encryptedExpiryMonth = encrypt(expiryMonth);
      const encryptedExpiryYear = encrypt(expiryYear);

      // Determine payment status
      let paymentStatus = 'pending';
      if (paymentResult.success) {
        paymentStatus = 'completed';
      } else {
        paymentStatus = 'failed';
      }

      // Create payment record with encrypted card data
      const payment = await Payment.create({
        event: event._id,
        user: req.user.id,
        amount: price,
        currency: 'SAR',
        status: paymentStatus,
        hyperpayTransactionId: paymentResult.transactionId,
        encryptedCardNumber,
        encryptedCardHolder,
        encryptedExpiryMonth,
        encryptedExpiryYear,
        last4Digits: getLast4Digits(cardNumber),
        cardBrand: detectCardBrand(cardNumber),
        paymentMethod: 'card',
        failureReason: paymentResult.success ? null : paymentResult.resultDescription
      });

      // If payment failed, update event status
      if (!paymentResult.success) {
        await Event.findByIdAndUpdate(event._id, { status: 'draft' });
        
        return res.status(400).json({
          success: false,
          message: 'Payment failed',
          error: paymentResult.resultDescription,
          data: {
            event,
            payment: {
              id: payment._id,
              status: payment.status,
              amount: payment.amount
            }
          }
        });
      }

      // Payment successful - event is ready
      res.status(201).json({
        success: true,
        message: 'Event created and payment processed successfully',
        data: {
          event,
          payment: {
            id: payment._id,
            status: payment.status,
            amount: payment.amount,
            transactionId: payment.hyperpayTransactionId,
            last4Digits: payment.last4Digits,
            cardBrand: payment.cardBrand
          }
        }
      });

    } catch (paymentError) {
      // If payment fails, delete the event or mark it as draft
      await Event.findByIdAndUpdate(event._id, { status: 'draft' });
      
      return res.status(400).json({
        success: false,
        message: 'Event created but payment processing failed',
        error: paymentError.message,
        data: {
          event
        }
      });
    }

  } catch (error) {
    next(error);
  }
};

// @desc    Process payment for existing event registration
// @route   POST /api/payments/process
// @access  Private
exports.processEventPayment = async (req, res, next) => {
  try {
    const {
      eventId,
      cardNumber,
      cardHolder,
      expiryMonth,
      expiryYear,
      cvv,
      billingAddress
    } = req.body;

    // Validate input
    if (!eventId || !cardNumber || !cardHolder || !expiryMonth || !expiryYear || !cvv) {
      return res.status(400).json({
        success: false,
        message: 'Please provide event ID and all payment information'
      });
    }

    // Get event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if event is paid
    if (event.price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This is a free event, no payment required'
      });
    }

    // Check if user already paid for this event
    const existingPayment = await Payment.findOne({
      event: eventId,
      user: req.user.id,
      status: 'completed'
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment already processed for this event'
      });
    }

    // Generate unique transaction ID
    const merchantTransactionId = `EVT-${eventId}-${Date.now()}`;

    // Process payment with HyperPay
    const paymentResult = await processPayment({
      amount: event.price,
      currency: 'SAR',
      cardNumber,
      cardHolder,
      expiryMonth,
      expiryYear,
      cvv,
      merchantTransactionId,
      customerEmail: req.user.email,
      billingAddress: billingAddress || {
        givenName: req.user.name?.split(' ')[0] || '',
        surname: req.user.name?.split(' ').slice(1).join(' ') || '',
        country: 'SA'
      }
    });

    // Encrypt card information
    const encryptedCardNumber = encrypt(cardNumber);
    const encryptedCardHolder = encrypt(cardHolder);
    const encryptedExpiryMonth = encrypt(expiryMonth);
    const encryptedExpiryYear = encrypt(expiryYear);

    // Determine payment status
    let paymentStatus = 'pending';
    if (paymentResult.success) {
      paymentStatus = 'completed';
      // Add user to event attendees
      if (!event.attendees.includes(req.user.id)) {
        event.attendees.push(req.user.id);
        await event.save();
      }
    } else {
      paymentStatus = 'failed';
    }

    // Create payment record
    const payment = await Payment.create({
      event: eventId,
      user: req.user.id,
      amount: event.price,
      currency: 'SAR',
      status: paymentStatus,
      hyperpayTransactionId: paymentResult.transactionId,
      encryptedCardNumber,
      encryptedCardHolder,
      encryptedExpiryMonth,
      encryptedExpiryYear,
      last4Digits: getLast4Digits(cardNumber),
      cardBrand: detectCardBrand(cardNumber),
      paymentMethod: 'card',
      failureReason: paymentResult.success ? null : paymentResult.resultDescription
    });

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Payment processing failed',
        error: paymentResult.resultDescription,
        data: {
          payment: {
            id: payment._id,
            status: payment.status,
            amount: payment.amount
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        payment: {
          id: payment._id,
          status: payment.status,
          amount: payment.amount,
          transactionId: payment.hyperpayTransactionId,
          last4Digits: payment.last4Digits,
          cardBrand: payment.cardBrand
        },
        event: {
          id: event._id,
          title: event.title,
          registered: true
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get payment status
// @route   GET /api/payments/:paymentId/status
// @access  Private
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.paymentId)
      .populate('event', 'title price')
      .populate('user', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if user owns this payment or is admin
    if (payment.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        last4Digits: payment.last4Digits,
        cardBrand: payment.cardBrand,
        transactionId: payment.hyperpayTransactionId,
        event: payment.event,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get user's payments
// @route   GET /api/payments
// @access  Private
exports.getUserPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .populate('event', 'title date location price')
      .select('-encryptedCardNumber -encryptedCardHolder -encryptedExpiryMonth -encryptedExpiryYear')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });

  } catch (error) {
    next(error);
  }
};

