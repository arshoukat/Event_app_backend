const mongoose = require('mongoose');
const SavedEvent = require('../models/SavedEvent.model');
const Event = require('../models/Event.model');

// @desc    Save an event for a user
// @route   POST /api/saved-events
// @access  Private
exports.saveEvent = async (req, res, next) => {
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

    // Verify user is saving for themselves (security check)
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only save events for yourself'
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

    // Check if already saved
    const existingSave = await SavedEvent.findOne({ eventId, userId });
    if (existingSave) {
      return res.status(409).json({
        success: false,
        message: 'Event is already saved'
      });
    }

    // Create saved event
    const savedEvent = await SavedEvent.create({
      eventId,
      userId
    });

    res.status(201).json({
      success: true,
      message: 'Event saved successfully',
      data: {
        _id: savedEvent._id,
        eventId: savedEvent.eventId,
        userId: savedEvent.userId,
        createdAt: savedEvent.createdAt,
        updatedAt: savedEvent.updatedAt
      }
    });
  } catch (error) {
    // Handle duplicate key error (MongoDB unique index violation)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Event is already saved'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(err => err.message).join(', ')
      });
    }

    console.error('Save event error:', error);
    next(error);
  }
};

// @desc    Get all saved events for a user
// @route   GET /api/saved-events?userId=...
// @access  Private
exports.getSavedEvents = async (req, res, next) => {
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

    // Security check: Verify user can only view their own saved events
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own saved events'
      });
    }

    // Find all saved events for user, populate event details
    const savedEvents = await SavedEvent.find({ userId })
      .populate({
        path: 'eventId',
        select: '_id title startDate endDate date startTime location venue imageUrl price category visibility status',
        // If event is deleted, this will be null - we'll filter it out
      })
      .sort({ createdAt: -1 }) // Newest first
      .lean(); // Convert to plain JavaScript object

    // Filter out saved events where event was deleted (eventId is null)
    const validSavedEvents = savedEvents.filter(se => se.eventId !== null);

    // Transform saved events to match frontend expectations
    // Map startDate/endDate to startTime/endTime for backward compatibility
    const transformedSavedEvents = validSavedEvents.map(savedEvent => {
      const event = savedEvent.eventId;
      
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
        category: event.category,
        visibility: event.visibility,
        status: event.status
      };

      return {
        _id: savedEvent._id,
        eventId: transformedEvent,
        userId: savedEvent.userId,
        createdAt: savedEvent.createdAt,
        updatedAt: savedEvent.updatedAt
      };
    });

    res.status(200).json({
      success: true,
      data: transformedSavedEvents
    });
  } catch (error) {
    console.error('Get saved events error:', error);
    next(error);
  }
};

// @desc    Unsave/Delete a saved event
// @route   DELETE /api/saved-events/:id
// @access  Private
exports.unsaveEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid saved event ID format'
      });
    }

    // Find the saved event
    const savedEvent = await SavedEvent.findById(id);
    
    if (!savedEvent) {
      return res.status(404).json({
        success: false,
        message: 'Saved event not found'
      });
    }

    // Verify user owns this saved event
    if (savedEvent.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only unsave your own events'
      });
    }

    // Delete the saved event
    await SavedEvent.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Event unsaved successfully'
    });
  } catch (error) {
    console.error('Unsave event error:', error);
    next(error);
  }
};

