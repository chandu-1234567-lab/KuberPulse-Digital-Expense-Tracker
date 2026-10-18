const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  changePassword,
} = require('../controllers/authController');
const {
  validateRegisterInput,
  validateLoginInput,
} = require('../validators/authValidator');
const { protect } = require('../middleware/auth');

// Rate limiter for authentication routes: max 30 requests per 15 mins per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 100, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login or registration attempts from this IP. Please try again after 15 minutes.',
  },
});

router.post('/register', authLimiter, validateRegisterInput, registerUser);
router.post('/login', authLimiter, validateLoginInput, loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
