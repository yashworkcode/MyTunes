const express = require('express');
const router  = express.Router();
const {
  searchUsers, getUserProfile, updateProfile,
  followUser, unfollowUser, getFollowers, getFollowing,
} = require('../controllers/userController');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadImage }           = require('../middleware/upload');

router.get   ('/search',          protect,      searchUsers);
router.get   ('/:id',             optionalAuth, getUserProfile);
router.put   ('/:id',             protect, uploadImage.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), updateProfile);
router.post  ('/:id/follow',      protect,      followUser);
router.delete('/:id/follow',      protect,      unfollowUser);
router.get   ('/:id/followers',   optionalAuth, getFollowers);
router.get   ('/:id/following',   optionalAuth, getFollowing);

module.exports = router;
