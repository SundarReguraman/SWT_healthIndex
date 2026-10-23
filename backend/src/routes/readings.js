const express = require('express');
const router = express.Router();
const {
  postReading,
  getLatestReading,
  getReadingHistory,
  getStatus,
  getDashboard,
} = require('../controllers/readingsController');

router.post('/readings', postReading);
router.get('/score/latest', getLatestReading);
router.get('/readings/history', getReadingHistory);
router.get('/status', getStatus);
router.get('/dashboard', getDashboard);

module.exports = router;
