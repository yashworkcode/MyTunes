const express = require('express');
const router  = express.Router();
const { initiateCall, endCall, getCallHistory } = require('../controllers/callController');
const { protect } = require('../middleware/auth');

router.post('/initiate',   protect, initiateCall);
router.put ('/:id/end',    protect, endCall);
router.get ('/history',    protect, getCallHistory);

module.exports = router;
