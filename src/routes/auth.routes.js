const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  signupInitiate, 
  signupVerify, 
  signupComplete,
  forgotPassword,
  verifyForgotPasswordOTP,
  updatePassword
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// OTP-based signup flow
router.post('/signup/initiate', signupInitiate);
router.post('/signup/verify', signupVerify);
router.post('/signup/complete', signupComplete);

// Forgot password flow
router.post('/forgot-password', forgotPassword);
router.post('/forgot-password/verify', verifyForgotPasswordOTP);

// Update password
router.put('/update-password', protect, updatePassword);

module.exports = router;

