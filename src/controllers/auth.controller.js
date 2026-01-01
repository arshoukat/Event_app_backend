const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const { sendOTPEmail } = require('../services/email.service');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Check for user
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user has a password set
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'Account not fully set up. Please complete your registration.'
      });
    }

    // Verify password
    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Credentials are valid - create JWT token
    const token = generateToken(user._id);

    // Return user data with JWT token
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token: token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate signup - Generate and send OTP
// @route   POST /api/auth/signup/initiate
// @access  Public
exports.signupInitiate = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check if user already exists with complete profile
    const existingUser = await User.findOne({ email }).select('+password');
    if (existingUser && existingUser.password) {
      return res.status(400).json({
        success: false,
        message: 'User already exists. Please login instead.'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Find or create user with email
    let user = await User.findOne({ email }).select('+otp +otpExpiry');
    
    if (user) {
      // Update existing user with new OTP
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await user.save();
    } else {
      // Create new user with email and OTP
      user = await User.create({
        email,
        otp,
        otpExpiry
      });
    }

    // Send OTP via email
    try {
      await sendOTPEmail(email, otp);
    } catch (emailError) {
      console.error('Error sending OTP email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email address'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/signup/verify
// @access  Public
const Profile = require('../models/Profile.model');

exports.signupVerify = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP'
      });
    }

    // Find user with OTP
    const user = await User.findOne({ email }).select('+otp +otpExpiry');
    
    if (!user || !user.otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or OTP not found. Please request a new OTP.'
      });
    }

    // Check if OTP is expired
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // OTP is valid - create/update profile in Profile collection and remove OTP from user record
    try {
      // Create or update profile with verified status
      const profile = await Profile.findOneAndUpdate(
        { email: user.email },
        { 
          $set: { 
            email: user.email,
            verified: true
          }
        },
        { upsert: true, new: true }
      );

      // Remove OTP and expiry from user document
      await User.findByIdAndUpdate(user._id, { $unset: { otp: 1, otpExpiry: 1 } });

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (dbErr) {
      console.error('Error creating profile or removing OTP:', dbErr);
      return res.status(500).json({ success: false, message: 'Server error during verification' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Complete signup - Store name and password in profile, create user
// @route   POST /api/auth/signup/complete
// @access  Public
exports.signupComplete = async (req, res, next) => {
  try {
    const { email, name, password, confirmPassword, phone } = req.body;

    // Validate input
    if (!email || !name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, name, and password'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Validate confirm password
    if (!confirmPassword || password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password and confirm password do not match' 
      });
    }

    // Find verified profile - use email from request to identify profile
    const profile = await Profile.findOne({ email, verified: true });
    if (!profile) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email not verified. Please verify your email first.' 
      });
    }

    // Use verified email from profile (not from request body) for security
    const verifiedEmail = profile.email;

    // Check if user already exists using verified email
    const existingUser = await User.findOne({ email: verifiedEmail }).select('+password');
    if (existingUser && existingUser.password) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already registered. Please login instead.' 
      });
    }

    // Update profile with name, password, and confirmPassword
    profile.name = name;
    profile.password = password; // Store plain password temporarily for validation
    profile.confirmPassword = confirmPassword;
    if (phone) profile.phone = phone;
    await profile.save();

    // Create or update user using verified email from profile
    // Note: Pass plain password to User.create() - the User model's pre-save hook will hash it automatically
    let user;
    if (existingUser) {
      // Update existing placeholder user - set plain password, pre-save hook will hash it
      existingUser.name = name;
      existingUser.password = password;
      if (phone) existingUser.phone = phone;
      user = await existingUser.save();
    } else {
      // Create a new user record - pass plain password, pre-save hook will hash it
      user = await User.create({
        name,
        email: verifiedEmail,
        password: password, // Pass plain password - User model will hash it
        phone: phone || ''
      });
    }

    // Clear OTP fields from user if they exist
    await User.findByIdAndUpdate(user._id, { $unset: { otp: 1, otpExpiry: 1 } });

    // Return auth token
    res.status(201).json({
      success: true,
      message: 'Signup completed successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    next(error);
  }
};

