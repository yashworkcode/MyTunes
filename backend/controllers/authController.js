const User          = require('../models/User');
const generateToken = require('../utils/generateToken');

// ── POST /api/auth/register ──────────────────────────
const register = async (req, res, next) => {
  try {
    const { username, email, password, displayName } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      const field = existing.email === email ? 'email' : 'username';
      return res.status(400).json({ success: false, error: `That ${field} is already taken.` });
    }

    const user  = await User.create({ username, email, password, displayName: displayName || username });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id:         user._id,
        username:    user.username,
        email:       user.email,
        displayName: user.displayName,
        avatar:      user.avatar,
        bio:         user.bio,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        songsCount:     user.songsCount,
        isOnline:    true,
        createdAt:   user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/login ─────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const match = await user.matchPassword(password);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id:         user._id,
        username:    user.username,
        email:       user.email,
        displayName: user.displayName,
        avatar:      user.avatar,
        bio:         user.bio,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        songsCount:     user.songsCount,
        isOnline:    true,
        createdAt:   user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auth/me ─────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/logout ────────────────────────────
const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isOnline: false, lastSeen: new Date() });
    res.json({ success: true, message: 'Logged out.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, logout };
