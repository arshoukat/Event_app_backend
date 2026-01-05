const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getUserById } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth');

// Profile routes (specific route should come before parameterized route)
router.route('/profile')
  .get(protect, getProfile)
  .put(protect, updateProfile);

// Get user by ID (parameterized route comes after specific routes)
router.get('/:id', protect, getUserById);

module.exports = router;

