const { body, param, query, validationResult } = require('express-validator');

// Run validation and return errors if any
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: errors.array().map(e => e.msg).join(', '),
    });
  }
  next();
};

// ── Auth validators ──────────────────────────────────
const registerRules = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters.')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores.'),
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Valid email required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

// ── Song validators ──────────────────────────────────
const songRules = [
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title is required (max 100 chars).'),
  body('artist').trim().isLength({ min: 1, max: 100 }).withMessage('Artist is required (max 100 chars).'),
  body('category').isIn([
    'romantic', 'sad', 'old', 'hindi', 'english',
    'party', 'devotional', 'folk', 'pop', 'other',
  ]).withMessage('Invalid category.'),
];

// ── Playlist validators ──────────────────────────────
const playlistRules = [
  body('name').trim().isLength({ min: 1, max: 80 }).withMessage('Playlist name required (max 80 chars).'),
  body('visibility').optional().isIn(['public', 'private']).withMessage('Visibility must be public or private.'),
];

// ── Message validators ───────────────────────────────
const messageRules = [
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1–2000 characters.'),
];

// ── Param validators ─────────────────────────────────
const mongoIdParam = (name) => [
  param(name).isMongoId().withMessage(`Invalid ${name}.`),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  songRules,
  playlistRules,
  messageRules,
  mongoIdParam,
};
