const express = require('express');
const router  = express.Router();
const {
  getSongs, searchSongs, getSongsByCategory, getSong,
  uploadSong, deleteSong, likeSong, unlikeSong, logPlay, getRecentlyPlayed,
} = require('../controllers/songController');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadSong: uploadSongFiles } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { songRules, validate } = require('../middleware/validate');

router.get   ('/',                    optionalAuth, getSongs);
router.get   ('/search',              optionalAuth, searchSongs);
router.get   ('/recently-played',     protect,      getRecentlyPlayed);
router.get   ('/category/:cat',       optionalAuth, getSongsByCategory);
router.get   ('/:id',                 optionalAuth, getSong);
router.post  ('/',                    protect, uploadLimiter, uploadSongFiles.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), songRules, validate, uploadSong);
router.delete('/:id',                 protect,      deleteSong);
router.post  ('/:id/like',            protect,      likeSong);
router.delete('/:id/like',            protect,      unlikeSong);
router.post  ('/:id/play',            protect,      logPlay);

module.exports = router;
