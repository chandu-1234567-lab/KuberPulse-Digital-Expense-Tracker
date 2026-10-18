const express = require('express');
const router = express.Router();
const {
  getDashboardSummary,
  getDashboardAnalytics,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/summary', getDashboardSummary);
router.get('/analytics', getDashboardAnalytics);

module.exports = router;
