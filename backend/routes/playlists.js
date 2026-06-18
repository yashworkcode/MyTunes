const express = require('express');
const router  = express.Router();
const {
  getPlaylists, createPlaylist, getPlaylist, updatePlaylist,
  deletePlaylist, addSong, removeSong, likePlaylist,
} = require('../controllers/playlistController');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadImage }           = require('../middleware/upload');
const { playlistRules, validate } = require('../middleware/validate');

router.get   ('/',                        optionalAuth, getPlaylists);
router.post  ('/',                        protect, uploadImage.single('cover'), playlistRules, validate, createPlaylist);
router.get   ('/:id',                     optionalAuth, getPlaylist);
router.put   ('/:id',                     protect, uploadImage.single('cover'), updatePlaylist);
router.delete('/:id',                     protect, deletePlaylist);
router.post  ('/:id/songs',              protect, addSong);
router.delete('/:id/songs/:songId',      protect, removeSong);
router.post  ('/:id/like',               protect, likePlaylist);
router.delete('/:id/like',               protect, likePlaylist);  // same handler toggles

module.exports = router;
