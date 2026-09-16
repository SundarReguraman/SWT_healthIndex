const express = require('express');
const router = express.Router();
const { postReading, getLatestReading, getReadingHistory } = require('../controllers/readingsController');

router.post('/readings', postReading);
router.get('/score/latest', getLatestReading);
router.get('/readings/history', getReadingHistory);

module.exports = router;
