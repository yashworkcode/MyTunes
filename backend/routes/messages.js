const express = require('express');
const router  = express.Router();
const { getContacts, getThread, sendMessage, deleteMessage } = require('../controllers/messageController');
const { protect }  = require('../middleware/auth');
const { messageRules, validate } = require('../middleware/validate');

router.get   ('/contacts',        protect, getContacts);
router.get   ('/:userId',         protect, getThread);
router.post  ('/:userId',         protect, messageRules, validate, sendMessage);
router.delete('/:messageId',      protect, deleteMessage);

module.exports = router;
