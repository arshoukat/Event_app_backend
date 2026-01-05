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

    // Check for user (include password and iban fields)
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

    // Decrypt IBAN before returning
    const decryptedIban = user.getDecryptedIBAN();

    // Return user data with JWT token
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        iban: decryptedIban,
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

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Decrypt IBAN before returning
    const decryptedIban = user.getDecryptedIban();

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        iban: decryptedIban,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
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

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find user with OTP
    const user = await User.findOne({ email: normalizedEmail }).select('+otp +otpExpiry');
    
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

    // OTP is valid - mark email as verified in User collection
    user.emailVerified = true;
    // Keep OTP until signup is completed (will be removed in signupComplete)
    await user.save();

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
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

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find user with verified email
    const existingUser = await User.findOne({ email: normalizedEmail }).select('+password +otp +otpExpiry');
    
    if (!existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email not found. Please complete the signup process.' 
      });
    }

    // Check if email is verified
    if (!existingUser.emailVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email not verified. Please verify your email first.' 
      });
    }

    // Check if user already has a password (already registered)
    if (existingUser.password) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already registered. Please login instead.' 
      });
    }

    // Update user with name, password, and phone
    existingUser.name = name;
    existingUser.password = password; // Pass plain password - User model's pre-save hook will hash it
    if (phone) existingUser.phone = phone;
    
    // Clear OTP fields
    existingUser.otp = undefined;
    existingUser.otpExpiry = undefined;
    
    const user = await existingUser.save();

    // Decrypt IBAN before returning
    const decryptedIban = user.getDecryptedIban();

    // Return auth token
    res.status(201).json({
      success: true,
      message: 'Signup completed successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        iban: decryptedIban,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password - Generate and send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
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

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists and has a password (must be registered)
    const user = await User.findOne({ email: normalizedEmail }).select('+password +otp +otpExpiry');
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If the email exists in our system, an OTP has been sent to your email address'
      });
    }

    // Check if user has a password (must be fully registered)
    if (!user.password) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If the email exists in our system, an OTP has been sent to your email address'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Update user with new OTP
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP via email
    try {
      await sendOTPEmail(normalizedEmail, otp);
    } catch (emailError) {
      console.error('Error sending OTP email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }

    // Return success (don't reveal if email exists for security)
    res.status(200).json({
      success: true,
      message: 'If the email exists in our system, an OTP has been sent to your email address'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify forgot password OTP
// @route   POST /api/auth/forgot-password/verify
// @access  Public
exports.verifyForgotPasswordOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP'
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find user with OTP
    const user = await User.findOne({ email: normalizedEmail }).select('+otp +otpExpiry');
    
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

    // OTP is valid - return success with authentication token
    // Note: We don't remove OTP here yet - it will be removed when user resets password
    // But we can generate a token for password reset flow
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        token: token,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    // Validate input
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new password'
      });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Validate confirm password
    if (!confirmPassword || newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match'
      });
    }

    // Get user with password field
    const user = await User.findById(req.user.id).select('+password +otp +otpExpiry');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If user has an existing password, check if new password is different
    if (user.password) {
      const isSamePassword = await user.matchPassword(newPassword);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: 'New password must be different from current password'
        });
      }
    }

    // If OTP exists (from forgot password flow), verify it's not expired
    if (user.otp) {
      if (user.otpExpiry && user.otpExpiry < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new OTP.'
        });
      }
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    
    // Clear OTP fields if they exist (from forgot password flow)
    if (user.otp) {
      user.otp = undefined;
      user.otpExpiry = undefined;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

