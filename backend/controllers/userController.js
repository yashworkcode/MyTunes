const User       = require('../models/User');
const Follower   = require('../models/Follower');
const Song       = require('../models/Song');
const Playlist   = require('../models/Playlist');
const { uploadBuffer } = require('../config/cloudinary');
const { cloudinary }   = require('../config/cloudinary');
const { createNotification } = require('../utils/notifications');

// ── GET /api/users/search?q= ─────────────────────────
const searchUsers = async (req, res, next) => {
  try {
    const { q = '', page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const users = await User.find({
      $or: [
        { username:    { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
      ],
    })
      .select('username displayName avatar bio followersCount songsCount isOnline')
      .skip(skip)
      .limit(Number(limit))
      .sort({ followersCount: -1 });

    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users/:id ───────────────────────────────
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -socketId -avatarPublicId -coverImagePublicId');

    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    // Is current user following this user?
    let isFollowing = false;
    if (req.user) {
      isFollowing = !!(await Follower.findOne({ follower: req.user._id, following: user._id }));
    }

    // Their public playlists
    const playlists = await Playlist.find({ owner: user._id, visibility: 'public' })
      .sort({ createdAt: -1 }).limit(10)
      .select('name emoji coverUrl likesCount songs');

    // Their uploaded songs
    const songs = await Song.find({ uploadedBy: user._id })
      .sort({ createdAt: -1 }).limit(20)
      .select('title artist coverUrl audioUrl duration likesCount playsCount category');

    res.json({ success: true, user, isFollowing, playlists, songs });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/users/:id ───────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized.' });
    }

    const { displayName, bio, username } = req.body;
    const user = await User.findById(req.user._id);

    if (displayName !== undefined) user.displayName = displayName;
    if (bio         !== undefined) user.bio         = bio;
    if (username    !== undefined) {
      const taken = await User.findOne({ username, _id: { $ne: user._id } });
      if (taken) return res.status(400).json({ success: false, error: 'Username taken.' });
      user.username = username;
    }

    // Handle avatar upload
    if (req.files?.avatar) {
      if (user.avatarPublicId) await cloudinary.uploader.destroy(user.avatarPublicId);
      const result = await uploadBuffer(req.files.avatar[0].buffer, {
        folder: 'mytunes/avatars', transformation: [{ width: 400, height: 400, crop: 'fill' }],
      });
      user.avatar          = result.secure_url;
      user.avatarPublicId  = result.public_id;
    }

    // Handle cover image upload
    if (req.files?.cover) {
      if (user.coverImagePublicId) await cloudinary.uploader.destroy(user.coverImagePublicId);
      const result = await uploadBuffer(req.files.cover[0].buffer, {
        folder: 'mytunes/covers', transformation: [{ width: 1200, height: 400, crop: 'fill' }],
      });
      user.coverImage          = result.secure_url;
      user.coverImagePublicId  = result.public_id;
    }

    await user.save({ validateBeforeSave: false });

    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/users/:id/follow ───────────────────────
const followUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user._id.toString()) {
      return res.status(400).json({ success: false, error: "You can't follow yourself." });
    }

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ success: false, error: 'User not found.' });

    const existing = await Follower.findOne({ follower: req.user._id, following: targetId });
    if (existing)   return res.status(400).json({ success: false, error: 'Already following.' });

    await Follower.create({ follower: req.user._id, following: targetId });

    // Update counts atomically
    await User.findByIdAndUpdate(targetId,      { $inc: { followersCount:  1 } });
    await User.findByIdAndUpdate(req.user._id,  { $inc: { followingCount:  1 } });

    // Notify
    await createNotification(req.io, {
      recipientId: targetId,
      senderId:    req.user._id,
      type:        'follow',
      message:     `${req.user.username} started following you.`,
    });

    res.json({ success: true, message: 'Followed.' });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/users/:id/follow ─────────────────────
const unfollowUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const result   = await Follower.findOneAndDelete({ follower: req.user._id, following: targetId });
    if (!result) return res.status(400).json({ success: false, error: 'Not following this user.' });

    await User.findByIdAndUpdate(targetId,     { $inc: { followersCount: -1 } });
    await User.findByIdAndUpdate(req.user._id, { $inc: { followingCount: -1 } });

    res.json({ success: true, message: 'Unfollowed.' });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users/:id/followers ─────────────────────
const getFollowers = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const docs = await Follower.find({ following: req.params.id })
      .populate('follower', 'username displayName avatar isOnline')
      .skip((page - 1) * limit).limit(Number(limit))
      .sort({ createdAt: -1 });
    res.json({ success: true, followers: docs.map(d => d.follower) });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users/:id/following ─────────────────────
const getFollowing = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const docs = await Follower.find({ follower: req.params.id })
      .populate('following', 'username displayName avatar isOnline')
      .skip((page - 1) * limit).limit(Number(limit))
      .sort({ createdAt: -1 });
    res.json({ success: true, following: docs.map(d => d.following) });
  } catch (err) {
    next(err);
  }
};

module.exports = { searchUsers, getUserProfile, updateProfile, followUser, unfollowUser, getFollowers, getFollowing };
