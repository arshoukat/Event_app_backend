const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  signupInitiate, 
  signupVerify, 
  signupComplete 
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// OTP-based signup flow
router.post('/signup/initiate', signupInitiate);
router.post('/signup/verify', signupVerify);
router.post('/signup/complete', signupComplete);

module.exports = router;

