const mongoose = require('mongoose');
const Booking = require('../models/Booking.model');
const Event = require('../models/Event.model');

// @desc    Create a new booking for a free event
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res, next) => {
  try {
    const { eventId, userId } = req.body;

    // Validate required fields
    if (!eventId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID and User ID are required'
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Event ID format'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid User ID format'
      });
    }

    // Verify user is booking for themselves (security check)
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only book tickets for yourself'
      });
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if event is published and active
    if (event.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Event is not available for booking'
      });
    }

    // Check if event is free (for free events, price array should be empty or all prices should be 0)
    const isFreeEvent = !event.price || event.price.length === 0 || 
                       event.price.every(ticket => ticket.price === 0);
    
    if (!isFreeEvent) {
      return res.status(400).json({
        success: false,
        message: 'This endpoint is only for free events. Please use the payment flow for paid events.'
      });
    }

    // Check capacity if maxAttendees is set (for private events)
    if (event.maxAttendees && event.maxAttendees > 0) {
      // Count existing active bookings (exclude cancelled)
      const bookingCount = await Booking.countDocuments({ 
        eventId: eventId,
        status: { $in: ['confirmed', 'attended'] }
      });

      const quantity = 1; // Default quantity for free events
      if ((bookingCount + quantity) > event.maxAttendees) {
        return res.status(409).json({
          success: false,
          message: 'Event is full. No more seats available.',
          currentCount: bookingCount,
          maxAttendees: event.maxAttendees
        });
      }
    }

    // Also check legacy capacity field for backward compatibility
    if (event.capacity > 0 && !event.maxAttendees) {
      // Count existing bookings for this event
      const bookingCount = await Booking.countDocuments({ 
        eventId: eventId,
        status: { $in: ['confirmed', 'attended'] }
      });

      if (bookingCount >= event.capacity) {
        return res.status(409).json({
          success: false,
          message: 'Event is fully booked'
        });
      }
    }

    // Check if user has already booked this event
    const existingBooking = await Booking.findOne({ eventId, userId });
    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: 'You have already booked this event'
      });
    }

    // Create booking
    const booking = await Booking.create({
      eventId,
      userId,
      status: 'confirmed',
      ticketType: 'free',
      quantity: 1,
      price: 0,
      totalAmount: 0
    });

    // Optionally update event attendees count (if using attendees array)
    // Note: The Event model has an attendees array, but we're using Booking model for tracking
    // Uncomment if you want to also update the attendees array:
    // await Event.findByIdAndUpdate(eventId, {
    //   $addToSet: { attendees: userId }
    // });

    res.status(201).json({
      success: true,
      message: 'Ticket booked successfully',
      data: {
        _id: booking._id,
        eventId: booking.eventId,
        userId: booking.userId,
        status: booking.status,
        ticketType: booking.ticketType,
        quantity: booking.quantity,
        price: booking.price,
        totalAmount: booking.totalAmount,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt
      }
    });
  } catch (error) {
    // Handle duplicate key error (MongoDB unique index violation)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You have already booked this event'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(err => err.message).join(', ')
      });
    }

    console.error('Booking error:', error);
    next(error);
  }
};

// @desc    Get all bookings for a user by userId query parameter
// @route   GET /api/bookings?userId=...
// @access  Private
exports.getMyBookings = async (req, res, next) => {
  try {
    const { userId } = req.query;

    // Validate userId is provided
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required as query parameter'
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid User ID format'
      });
    }

    // Security check: Verify user can only access their own bookings
    // (Optional: Remove this if you want to allow admins to view any user's bookings)
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own bookings'
      });
    }

    // Find all bookings for user, excluding cancelled ones
    // Populate event details from events collection
    const bookings = await Booking.find({
      userId: userId,
      status: { $ne: 'cancelled' }
    })
    .populate({
      path: 'eventId',
      select: '_id title startDate endDate date startTime location venue imageUrl price category status',
      // If event is deleted, this will be null - we'll filter it out
    })
    .sort({ createdAt: -1 }) // Most recent first
    .lean(); // Convert to plain JavaScript object

    // Filter out bookings where event was deleted (eventId is null)
    const validBookings = bookings.filter(booking => booking.eventId !== null);

    // Transform bookings to match frontend expectations
    // Map startDate/endDate to startTime/endTime for backward compatibility
    const transformedBookings = validBookings.map(booking => {
      const event = booking.eventId;
      
      // Create transformed event object with both new and legacy field names
      const transformedEvent = {
        _id: event._id,
        title: event.title,
        // Use startDate as startTime (for frontend compatibility)
        startTime: event.startDate || event.startTime || event.date,
        // Use endDate as endTime (for frontend compatibility)
        endTime: event.endDate,
        // Use startDate as date, or fallback to legacy date field
        date: event.startDate || event.date,
        location: event.location || null,
        venue: event.venue || null,
        imageUrl: event.imageUrl || null,
        price: event.price || 0,
        // Include additional fields that might be useful
        category: event.category,
        status: event.status
      };

      return {
        _id: booking._id,
        eventId: transformedEvent,
        userId: booking.userId,
        status: booking.status,
        ticketType: booking.ticketType,
        quantity: booking.quantity,
        price: booking.price,
        totalAmount: booking.totalAmount,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt
      };
    });

    res.status(200).json({
      success: true,
      data: transformedBookings
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    next(error);
  }
};

