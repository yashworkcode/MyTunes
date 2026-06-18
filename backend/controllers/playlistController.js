const Playlist = require('../models/Playlist');
const { uploadBuffer } = require('../config/cloudinary');
const { cloudinary }   = require('../config/cloudinary');
const { createNotification } = require('../utils/notifications');

// ── GET /api/playlists?page=&limit= ─────────────────
const getPlaylists = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, owner } = req.query;
    const query = { visibility: 'public' };
    if (owner) query.owner = owner;

    const [playlists, total] = await Promise.all([
      Playlist.find(query)
        .populate('owner', 'username displayName avatar')
        .sort({ likesCount: -1, createdAt: -1 })
        .skip((page - 1) * limit).limit(Number(limit))
        .select('-songs'),
      Playlist.countDocuments(query),
    ]);

    res.json({ success: true, playlists, total });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/playlists ──────────────────────────────
const createPlaylist = async (req, res, next) => {
  try {
    const { name, description, visibility, emoji } = req.body;

    let coverUrl = '', coverPublicId = '';
    if (req.file) {
      const result = await uploadBuffer(req.file.buffer, {
        folder: 'mytunes/playlist-covers',
        transformation: [{ width: 500, height: 500, crop: 'fill' }],
      });
      coverUrl      = result.secure_url;
      coverPublicId = result.public_id;
    }

    const playlist = await Playlist.create({
      name, description: description || '', visibility: visibility || 'public',
      emoji: emoji || '🎵', coverUrl, coverPublicId, owner: req.user._id,
    });

    await playlist.populate('owner', 'username displayName avatar');
    res.status(201).json({ success: true, playlist });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/playlists/:id ───────────────────────────
const getPlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('owner', 'username displayName avatar')
      .populate({ path: 'songs.song', populate: { path: 'uploadedBy', select: 'username displayName avatar' } })
      .populate('songs.addedBy', 'username displayName');

    if (!playlist) return res.status(404).json({ success: false, error: 'Playlist not found.' });

    // Private playlists only accessible to owner
    if (playlist.visibility === 'private' && playlist.owner._id.toString() !== req.user?._id?.toString()) {
      return res.status(403).json({ success: false, error: 'This playlist is private.' });
    }

    const isLiked = req.user ? playlist.likes.includes(req.user._id) : false;
    res.json({ success: true, playlist, isLiked });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/playlists/:id ───────────────────────────
const updatePlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ success: false, error: 'Playlist not found.' });
    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized.' });
    }

    const { name, description, visibility, emoji } = req.body;
    if (name        !== undefined) playlist.name        = name;
    if (description !== undefined) playlist.description = description;
    if (visibility  !== undefined) playlist.visibility  = visibility;
    if (emoji       !== undefined) playlist.emoji       = emoji;

    if (req.file) {
      if (playlist.coverPublicId) await cloudinary.uploader.destroy(playlist.coverPublicId);
      const result = await uploadBuffer(req.file.buffer, {
        folder: 'mytunes/playlist-covers',
        transformation: [{ width: 500, height: 500, crop: 'fill' }],
      });
      playlist.coverUrl      = result.secure_url;
      playlist.coverPublicId = result.public_id;
    }

    await playlist.save();
    res.json({ success: true, playlist });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/playlists/:id ────────────────────────
const deletePlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ success: false, error: 'Playlist not found.' });
    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized.' });
    }
    if (playlist.coverPublicId) await cloudinary.uploader.destroy(playlist.coverPublicId);
    await playlist.deleteOne();
    res.json({ success: true, message: 'Playlist deleted.' });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/playlists/:id/songs ────────────────────
const addSong = async (req, res, next) => {
  try {
    const { songId } = req.body;
    const playlist   = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ success: false, error: 'Playlist not found.' });
    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized.' });
    }
    const exists = playlist.songs.some(s => s.song?.toString() === songId);
    if (exists) return res.status(400).json({ success: false, error: 'Song already in playlist.' });

    playlist.songs.push({ song: songId, addedBy: req.user._id });
    await playlist.save();
    res.json({ success: true, message: 'Song added.' });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/playlists/:id/songs/:songId ──────────
const removeSong = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ success: false, error: 'Playlist not found.' });
    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized.' });
    }
    playlist.songs = playlist.songs.filter(s => s.song?.toString() !== req.params.songId);
    await playlist.save();
    res.json({ success: true, message: 'Song removed.' });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/playlists/:id/like ─────────────────────
const likePlaylist = async (req, res, next) => {
  try {
    const playlist    = await Playlist.findById(req.params.id);
    if (!playlist)    return res.status(404).json({ success: false, error: 'Playlist not found.' });
    const alreadyLiked = playlist.likes.includes(req.user._id);
    if (alreadyLiked) {
      playlist.likes      = playlist.likes.filter(id => id.toString() !== req.user._id.toString());
      playlist.likesCount = Math.max(0, playlist.likesCount - 1);
    } else {
      playlist.likes.push(req.user._id);
      playlist.likesCount += 1;
      await createNotification(req.io, {
        recipientId: playlist.owner,
        senderId:    req.user._id,
        type:        'playlist_like',
        message:     `${req.user.username} liked your playlist "${playlist.name}"`,
        refModel:    'Playlist',
        refId:       playlist._id,
      });
    }
    await playlist.save();
    res.json({ success: true, liked: !alreadyLiked, likesCount: playlist.likesCount });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPlaylists, createPlaylist, getPlaylist, updatePlaylist, deletePlaylist, addSong, removeSong, likePlaylist };
