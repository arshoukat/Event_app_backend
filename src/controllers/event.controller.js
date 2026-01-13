const mongoose = require('mongoose');
const Event = require('../models/Event.model');
const User = require('../models/User.model');
const { processBase64Image, deleteImage } = require('../utils/imageProcessor');
const { 
  isValidISODate, 
  isEndTimeAfterStartTime,
  isEndDateAfterStartDate, 
  validatePriceArray, 
  validateTags,
  validateEmails 
} = require('../utils/validators');

// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res, next) => {
  try {
    const { category, status, search, visibility } = req.query;
    let query = {};

    // Only show published events by default
    if (status) {
      query.status = status;
    } else {
      query.status = 'published';
    }

    // Handle visibility - return events based on visibility parameter
    if (visibility) {
      // If visibility is specified, return all events with that visibility
      query.visibility = visibility;
    } else {
      // Default: show both public and private events
      // If you want to restrict private events, you can add authentication check here
      query.visibility = { $in: ['public', 'private'] };
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      const searchConditions = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
          { venue: { $regex: search, $options: 'i' } }
        ]
      };
      
      // If we have visibility $or, combine with $and
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          searchConditions
        ];
        delete query.$or;
      } else {
        Object.assign(query, searchConditions);
      }
    }

    const events = await Event.find(query)
      .populate('createdBy', 'name email')
      .populate('attendees', 'name email')
      .sort({ startDate: 1, date: 1 }); // Use startDate primarily, fall back to date for backward compatibility

    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format. Event ID must be a valid MongoDB ObjectId.'
      });
    }

    const event = await Event.findById(id)
      .populate('createdBy', 'name email')
      .populate('attendees', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private
exports.createEvent = async (req, res, next) => {
  try {
    // Handle multipart/form-data (with file upload) or JSON (with base64)
    let eventDataFromBody;
    
    // Check if request is multipart/form-data (has file or eventData string)
    if (req.body.eventData) {
      // Parse eventData JSON string from multipart form
      try {
        eventDataFromBody = typeof req.body.eventData === 'string' 
          ? JSON.parse(req.body.eventData) 
          : req.body.eventData;
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid eventData JSON',
          details: {
            eventData: 'Failed to parse eventData JSON string'
          }
        });
      }
    } else {
      // Regular JSON request (backward compatibility)
      eventDataFromBody = req.body;
    }

    const {
      title,
      description,
      startDate,  // NEW: Primary field
      endDate,    // NEW: Primary field
      date,       // Legacy: backward compatibility
      startTime,  // Legacy: backward compatibility
      endTime,    // Legacy: backward compatibility (deprecated)
      location,
      venue,
      category,
      price,
      capacity,
      maxAttendees,
      status,
      imageUrl, // For base64 images (backward compatibility)
      tags,
      visibility,
      invitedEmails,
      licenseFile,
      iban
    } = eventDataFromBody;

    // Validation errors object
    const errors = {};

    // Required field validations
    if (!title || typeof title !== 'string' || title.trim() === '') {
      errors.title = 'Title is required and must be a non-empty string';
    }

    if (!description || typeof description !== 'string' || description.trim() === '') {
      errors.description = 'Description is required and must be a non-empty string';
    }

    // Determine which format is being used (new or legacy)
    let finalStartDate, finalEndDate, finalDate, finalStartTime;
    
    if (startDate && endDate) {
      // NEW FORMAT: Using startDate and endDate
      if (!isValidISODate(startDate)) {
        errors.startDate = 'Start date is required and must be a valid ISO 8601 date string';
      }
      
      if (!isValidISODate(endDate)) {
        errors.endDate = 'End date is required and must be a valid ISO 8601 date string';
      }
      
      // Validate endDate is greater than or equal to startDate
      if (startDate && endDate && isValidISODate(startDate) && isValidISODate(endDate)) {
        if (!isEndDateAfterStartDate(startDate, endDate)) {
          errors.endDate = 'End date must be greater than or equal to start date';
        }
      }
      
      finalStartDate = startDate;
      finalEndDate = endDate;
      // For backward compatibility, set date and startTime from startDate
      finalDate = startDate;
      finalStartTime = startDate;
      
    } else if (date && startTime && endTime) {
      // LEGACY FORMAT: Using date, startTime, and endTime (backward compatibility)
      if (!isValidISODate(date)) {
        errors.date = 'Date is required and must be a valid ISO 8601 date string';
      }
      
      if (!isValidISODate(startTime)) {
        errors.startTime = 'Start time is required and must be a valid ISO 8601 date string';
      }
      
      if (!isValidISODate(endTime)) {
        errors.endTime = 'End time is required and must be a valid ISO 8601 date string';
      }
      
      // Validate endTime is after startTime
      if (startTime && endTime && isValidISODate(startTime) && isValidISODate(endTime)) {
        if (!isEndTimeAfterStartTime(startTime, endTime)) {
          errors.endTime = 'End time must be after start time';
        }
      }
      
      finalStartDate = startTime;
      finalEndDate = endTime;
      finalDate = date;
      finalStartTime = startTime;
      
    } else {
      // Neither format is complete
      if (!startDate && !date) {
        errors.startDate = 'Start date is required (or use legacy date field)';
      }
      if (!endDate && !endTime) {
        errors.endDate = 'End date is required (or use legacy endTime field)';
      }
    }

    // Location validation (required for in-person events)
    // For now, we'll make it optional but you can add eventType check if needed
    if (location && typeof location !== 'string') {
      errors.location = 'Location must be a string';
    }

    // Category validation
    const validCategories = ['music', 'tech', 'art', 'sports', 'food', 'networking', 'wellness', 'education', 'entertainment', 'other'];
    if (!category || !validCategories.includes(category)) {
      errors.category = `Category is required and must be one of: ${validCategories.join(', ')}`;
    }

    // Visibility validation
    if (!visibility || !['public', 'private'].includes(visibility)) {
      errors.visibility = "Visibility is required and must be either 'public' or 'private'";
    }

    // Price validation
    const priceValidation = validatePriceArray(price);
    if (!priceValidation.valid) {
      errors.price = priceValidation.message;
    } else if (price && price.length > 0) {
      // Check if at least one seat type has price > 0 for paid events
      const hasPaidSeat = price.some(seat => seat.price > 0);
      if (!hasPaidSeat) {
        errors.price = 'At least one seat type must have a price greater than 0 for paid events';
      }
    }

    // Tags validation
    const tagsValidation = validateTags(tags);
    if (!tagsValidation.valid) {
      errors.tags = tagsValidation.message;
    }

    // Private event validation - validate email format if emails are provided (but not required)
    if (visibility === 'private' && invitedEmails && Array.isArray(invitedEmails) && invitedEmails.length > 0) {
      const emailValidation = validateEmails(invitedEmails);
      if (!emailValidation.valid) {
        errors.invitedEmails = emailValidation.message;
      }
    }

    // License file validation (if requiresLicense is true, but we'll make it optional for now)
    if (licenseFile && typeof licenseFile !== 'string') {
      errors.licenseFile = 'License file must be a string';
    }

    // Capacity validation
    if (capacity !== undefined && (typeof capacity !== 'number' || capacity < 0)) {
      errors.capacity = 'Capacity must be a non-negative number';
    }

    // Status validation
    if (status && !['draft', 'published'].includes(status)) {
      errors.status = "Status must be either 'draft' or 'published'";
    }

    // If there are validation errors, return them
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    // Process image if provided
    let processedImageUrl = null;
    
    // Priority: 1. File upload (multipart), 2. Base64 (JSON - backward compatibility)
    if (req.file) {
      // File uploaded via multipart/form-data
      processedImageUrl = `/uploads/events/${req.file.filename}`;
    } else if (imageUrl && imageUrl !== 'null') {
      // Base64 image (backward compatibility)
      try {
        processedImageUrl = await processBase64Image(imageUrl);
      } catch (imageError) {
        return res.status(400).json({
          success: false,
          error: 'Image processing failed',
          details: {
            imageUrl: imageError.message
          }
        });
      }
    }

    // Update user with IBAN if provided (store in user collection for reuse)
    if (iban && iban.trim() !== '') {
      const user = await User.findById(req.user.id);
      if (user) {
        // IBAN will be cleaned by setter and encrypted by pre-save hook
        user.iban = iban.trim();
        await user.save();
      }
    }

    // Prepare event data (IBAN is not stored in event, it's stored in user collection)
    const eventData = {
      title: title.trim(),
      description: description.trim(),
      startDate: new Date(finalStartDate),
      endDate: new Date(finalEndDate),
      // Legacy fields for backward compatibility
      date: finalDate ? new Date(finalDate) : new Date(finalStartDate),
      startTime: finalStartTime ? new Date(finalStartTime) : new Date(finalStartDate),
      location: location ? location.trim() : null,
      venue: venue ? venue.trim() : null,
      category,
      price: price || [],
      capacity: capacity || 0,
      maxAttendees: maxAttendees || null,
      status: status || 'published',
      imageUrl: processedImageUrl,
      tags: tags || [],
      visibility,
      invitedEmails: visibility === 'private' ? (invitedEmails || []) : [],
      licenseFile: licenseFile || null,
      createdBy: req.user.id
    };

    // Create event
    const event = await Event.create(eventData);

    // Populate createdBy field
    await event.populate('createdBy', 'name email');

    // Prepare response data
    const responseData = event.toObject();

    // If private event, include shareToken and shareUrl
    if (event.visibility === 'private' && event.shareToken) {
      const baseUrl = process.env.APP_URL || process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      responseData.shareToken = event.shareToken;
      responseData.shareUrl = `${baseUrl}/share/${event.shareToken}`;
    }

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: responseData
    });
  } catch (error) {
    // If event creation fails and image was uploaded, delete the image
    if (req.file) {
      try {
        const fs = require('fs');
        const path = require('path');
        const imagePath = path.join(__dirname, '../../uploads/events', req.file.filename);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (e) {
        // Ignore image deletion errors
        console.error('Error deleting uploaded image:', e);
      }
    } else if (req.body.imageUrl && req.body.imageUrl !== 'null') {
      // Base64 image cleanup (backward compatibility)
      try {
        const processedImageUrl = await processBase64Image(req.body.imageUrl).catch(() => null);
        if (processedImageUrl) {
          deleteImage(processedImageUrl);
        }
      } catch (e) {
        // Ignore image deletion errors
      }
    }
    next(error);
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private
exports.updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format. Event ID must be a valid MongoDB ObjectId.'
      });
    }

    let event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Make sure user is event owner or admin
    if (event.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });
    }

    // Process date fields if provided (handle both new and legacy formats)
    const updateData = { ...req.body };
    const { startDate, endDate, date, startTime, endTime } = req.body;
    
    if (startDate || endDate || date || startTime || endTime) {
      let finalStartDate, finalEndDate, finalDate, finalStartTime;
      
      if (startDate && endDate) {
        // NEW FORMAT: Using startDate and endDate
        if (!isValidISODate(startDate)) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: { startDate: 'Start date must be a valid ISO 8601 date string' }
          });
        }
        
        if (!isValidISODate(endDate)) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: { endDate: 'End date must be a valid ISO 8601 date string' }
          });
        }
        
        // Validate endDate is greater than or equal to startDate
        if (!isEndDateAfterStartDate(startDate, endDate)) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: { endDate: 'End date must be greater than or equal to start date' }
          });
        }
        
        finalStartDate = new Date(startDate);
        finalEndDate = new Date(endDate);
        finalDate = finalStartDate;
        finalStartTime = finalStartDate;
        
      } else if (date && startTime && endTime) {
        // LEGACY FORMAT: Using date, startTime, and endTime (backward compatibility)
        if (!isValidISODate(date) || !isValidISODate(startTime) || !isValidISODate(endTime)) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: { date: 'Date fields must be valid ISO 8601 date strings' }
          });
        }
        
        if (!isEndTimeAfterStartTime(startTime, endTime)) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: { endTime: 'End time must be after start time' }
          });
        }
        
        finalStartDate = new Date(startTime);
        finalEndDate = new Date(endTime);
        finalDate = new Date(date);
        finalStartTime = new Date(startTime);
        
      } else {
        // Partial update - use existing values for missing fields
        finalStartDate = startDate ? new Date(startDate) : event.startDate;
        finalEndDate = endDate ? new Date(endDate) : event.endDate;
        finalDate = date ? new Date(date) : (event.date || event.startDate);
        finalStartTime = startTime ? new Date(startTime) : (event.startTime || event.startDate);
        
        // Validate if both dates are provided
        if (startDate && endDate && !isEndDateAfterStartDate(startDate, endDate)) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: { endDate: 'End date must be greater than or equal to start date' }
          });
        }
      }
      
      updateData.startDate = finalStartDate;
      updateData.endDate = finalEndDate;
      updateData.date = finalDate;
      updateData.startTime = finalStartTime;
    }

    event = await Event.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
exports.deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format. Event ID must be a valid MongoDB ObjectId.'
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Make sure user is event owner or admin
    if (event.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event'
      });
    }

    await event.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register for event
// @route   POST /api/events/:id/register
// @access  Private
exports.registerForEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format. Event ID must be a valid MongoDB ObjectId.'
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if already registered
    if (event.attendees.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this event'
      });
    }

    // Check capacity
    if (event.capacity > 0 && event.attendees.length >= event.capacity) {
      return res.status(400).json({
        success: false,
        message: 'Event is at full capacity'
      });
    }

    event.attendees.push(req.user.id);
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Successfully registered for event',
      data: event
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my upcoming events
// @route   GET /api/events/my/upcoming
// @access  Private
exports.getMyUpcomingEvents = async (req, res, next) => {
  try {
    const now = new Date();
    
    const events = await Event.find({
      createdBy: req.user.id,
      startDate: { $gt: now }
    })
      .populate('createdBy', 'name email')
      .populate('attendees', 'name email')
      .sort({ startDate: 1 });

    res.status(200).json({
      success: true,
      data: events,
      count: events.length,
      message: 'Upcoming events retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my ongoing events
// @route   GET /api/events/my/ongoing
// @access  Private
exports.getMyOngoingEvents = async (req, res, next) => {
  try {
    const now = new Date();
    
    const events = await Event.find({
      createdBy: req.user.id,
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
      .populate('createdBy', 'name email')
      .populate('attendees', 'name email')
      .sort({ startDate: 1 });

    res.status(200).json({
      success: true,
      data: events,
      count: events.length,
      message: 'Ongoing events retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my past events
// @route   GET /api/events/my/past
// @access  Private
exports.getMyPastEvents = async (req, res, next) => {
  try {
    const now = new Date();
    
    const events = await Event.find({
      createdBy: req.user.id,
      endDate: { $lt: now }
    })
      .populate('createdBy', 'name email')
      .populate('attendees', 'name email')
      .sort({ endDate: -1 });

    res.status(200).json({
      success: true,
      data: events,
      count: events.length,
      message: 'Past events retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get private event by share token
// @route   GET /api/events/share/:shareToken
// @access  Public
exports.getEventByShareToken = async (req, res, next) => {
  try {
    const { shareToken } = req.params;

    if (!shareToken) {
      return res.status(400).json({
        success: false,
        message: 'Share token is required'
      });
    }

    // Find event by share token (must be private)
    const event = await Event.findOne({ shareToken, visibility: 'private' })
      .populate('createdBy', '_id name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or share token invalid'
      });
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Share token lookup error:', error);
    next(error);
  }
};

// @desc    Get shareable link for private event
// @route   GET /api/events/:id/share-link
// @access  Private (Event creator only)
exports.getShareLink = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is creator
    if (event.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only get share links for your own events'
      });
    }

    // Check if event is private
    if (event.visibility !== 'private') {
      return res.status(400).json({
        success: false,
        message: 'Share links are only available for private events'
      });
    }

    // Ensure shareToken exists (should be auto-generated, but check anyway)
    if (!event.shareToken) {
      const crypto = require('crypto');
      let token;
      let isUnique = false;
      
      while (!isUnique) {
        token = crypto.randomBytes(32).toString('hex');
        const existing = await Event.findOne({ shareToken: token });
        if (!existing) {
          isUnique = true;
        }
      }
      
      event.shareToken = token;
      await event.save();
    }

    // Generate share URL
    const baseUrl = process.env.APP_URL || process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const shareUrl = `${baseUrl}/share/${event.shareToken}`;

    res.status(200).json({
      success: true,
      data: {
        shareToken: event.shareToken,
        shareUrl: shareUrl
      }
    });
  } catch (error) {
    console.error('Share link generation error:', error);
    next(error);
  }
};

// @desc    Get event management data
// @route   GET /api/events/:id/manage
// @access  Private (Event creator only)
exports.getEventManagement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const Booking = require('../models/Booking.model');

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is creator
    if (event.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only manage your own events'
      });
    }

    // Get accepted users (bookings with status confirmed or attended)
    const acceptedBookings = await Booking.find({
      eventId: event._id,
      status: { $in: ['confirmed', 'attended'] }
    })
    .populate('userId', '_id name email')
    .sort({ createdAt: -1 });

    // Get pending users (if you have an invitation system, otherwise empty array)
    // For now, we'll return empty array for pendingUsers
    const pendingUsers = [];

    // Calculate stats
    const totalAccepted = acceptedBookings.length;
    const totalPending = pendingUsers.length;
    const availableSpots = event.maxAttendees 
      ? Math.max(0, event.maxAttendees - totalAccepted)
      : null;

    res.status(200).json({
      success: true,
      data: {
        event: {
          _id: event._id,
          title: event.title,
          shareToken: event.shareToken,
          maxAttendees: event.maxAttendees,
          visibility: event.visibility
        },
        acceptedUsers: acceptedBookings,
        pendingUsers: pendingUsers,
        stats: {
          totalAccepted: totalAccepted,
          totalPending: totalPending,
          maxAttendees: event.maxAttendees,
          availableSpots: availableSpots
        }
      }
    });
  } catch (error) {
    console.error('Management data fetch error:', error);
    next(error);
  }
};

// @desc    Check event capacity
// @route   POST /api/events/:id/check-capacity
// @access  Private
exports.checkCapacity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity = 1 } = req.body;
    const Booking = require('../models/Booking.model');

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // If no maxAttendees, always available
    if (!event.maxAttendees) {
      return res.status(200).json({
        available: true,
        currentCount: 0,
        maxAttendees: null,
        remainingSpots: null
      });
    }

    // Count current confirmed bookings (exclude cancelled)
    const currentBookings = await Booking.countDocuments({
      eventId: event._id,
      status: { $in: ['confirmed', 'attended'] }
    });

    const available = (currentBookings + quantity) <= event.maxAttendees;
    const remainingSpots = Math.max(0, event.maxAttendees - currentBookings);

    res.status(200).json({
      available: available,
      currentCount: currentBookings,
      maxAttendees: event.maxAttendees,
      remainingSpots: remainingSpots,
      message: available ? null : 'Event is full'
    });
  } catch (error) {
    console.error('Capacity check error:', error);
    next(error);
  }
};

