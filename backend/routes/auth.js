const express = require('express');
const router  = express.Router();
const { register, login, getMe, logout } = require('../controllers/authController');
const { protect }  = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerRules, loginRules, validate } = require('../middleware/validate');

router.post('/register', authLimiter, registerRules, validate, register);
router.post('/login',    authLimiter, loginRules,    validate, login);
router.get ('/me',       protect, getMe);
router.post('/logout',   protect, logout);

module.exports = router;
