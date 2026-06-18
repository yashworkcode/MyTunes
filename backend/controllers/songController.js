const Song    = require('../models/Song');
const User    = require('../models/User');
const { uploadBuffer } = require('../config/cloudinary');
const { cloudinary }   = require('../config/cloudinary');
const { createNotification } = require('../utils/notifications');
const Follower = require('../models/Follower');

// ── GET /api/songs?page=&limit=&category= ───────────
const getSongs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, sort = 'newest' } = req.query;
    const skip  = (page - 1) * limit;
    const query = category ? { category } : {};

    const sortMap = {
      newest:  { createdAt: -1 },
      popular: { playsCount: -1 },
      liked:   { likesCount: -1 },
    };

    const [songs, total] = await Promise.all([
      Song.find(query)
        .populate('uploadedBy', 'username displayName avatar')
        .sort(sortMap[sort] || { createdAt: -1 })
        .skip(skip).limit(Number(limit)),
      Song.countDocuments(query),
    ]);

    res.json({ success: true, songs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/songs/search?q= ─────────────────────────
const searchSongs = async (req, res, next) => {
  try {
    const { q = '', page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const songs = await Song.find({ $text: { $search: q } }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .populate('uploadedBy', 'username displayName avatar')
      .skip(skip).limit(Number(limit));

    res.json({ success: true, songs });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/songs/category/:cat ─────────────────────
const getSongsByCategory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const songs = await Song.find({ category: req.params.cat })
      .populate('uploadedBy', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit));
    res.json({ success: true, songs });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/songs/:id ───────────────────────────────
const getSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate('uploadedBy', 'username displayName avatar');
    if (!song) return res.status(404).json({ success: false, error: 'Song not found.' });
    res.json({ success: true, song });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/songs ──────────────────────────────────
const uploadSong = async (req, res, next) => {
  try {
    if (!req.files?.audio?.[0]) {
      return res.status(400).json({ success: false, error: 'Audio file is required.' });
    }

    const { title, artist, album, category, emoji, lyrics, tags } = req.body;

    // Upload audio to Cloudinary
    const audioResult = await uploadBuffer(req.files.audio[0].buffer, {
      resource_type: 'video',   // Cloudinary uses 'video' for audio
      folder:        'mytunes/songs',
      use_filename:  true,
    });

    // Upload cover image if provided
    let coverUrl = '', coverPublicId = '';
    if (req.files?.cover?.[0]) {
      const coverResult = await uploadBuffer(req.files.cover[0].buffer, {
        folder: 'mytunes/song-covers',
        transformation: [{ width: 500, height: 500, crop: 'fill' }],
      });
      coverUrl      = coverResult.secure_url;
      coverPublicId = coverResult.public_id;
    }

    const song = await Song.create({
      title, artist,
      album:    album    || '',
      category: category || 'other',
      emoji:    emoji    || '🎵',
      lyrics:   lyrics   || '',
      tags:     tags ? tags.split(',').map(t => t.trim()) : [],
      audioUrl:      audioResult.secure_url,
      audioPublicId: audioResult.public_id,
      duration:      Math.round(audioResult.duration || 0),
      coverUrl, coverPublicId,
      uploadedBy: req.user._id,
    });

    // Increment user song count
    await User.findByIdAndUpdate(req.user._id, { $inc: { songsCount: 1 } });

    // Notify followers
    const followers = await Follower.find({ following: req.user._id }).select('follower');
    for (const f of followers) {
      await createNotification(req.io, {
        recipientId: f.follower,
        senderId:    req.user._id,
        type:        'song_upload',
        message:     `${req.user.username} uploaded a new song: "${title}"`,
        refModel:    'Song',
        refId:       song._id,
      });
    }

    const populated = await song.populate('uploadedBy', 'username displayName avatar');
    res.status(201).json({ success: true, song: populated });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/songs/:id ────────────────────────────
const deleteSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ success: false, error: 'Song not found.' });
    if (song.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized.' });
    }

    // Delete from Cloudinary
    if (song.audioPublicId) await cloudinary.uploader.destroy(song.audioPublicId, { resource_type: 'video' });
    if (song.coverPublicId) await cloudinary.uploader.destroy(song.coverPublicId);

    await song.deleteOne();
    await User.findByIdAndUpdate(req.user._id, { $inc: { songsCount: -1 } });

    res.json({ success: true, message: 'Song deleted.' });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/songs/:id/like ─────────────────────────
const likeSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ success: false, error: 'Song not found.' });

    const alreadyLiked = song.likes.includes(req.user._id);
    if (alreadyLiked) {
      song.likes      = song.likes.filter(id => id.toString() !== req.user._id.toString());
      song.likesCount = Math.max(0, song.likesCount - 1);
    } else {
      song.likes.push(req.user._id);
      song.likesCount += 1;

      await createNotification(req.io, {
        recipientId: song.uploadedBy,
        senderId:    req.user._id,
        type:        'song_like',
        message:     `${req.user.username} liked your song "${song.title}"`,
        refModel:    'Song',
        refId:       song._id,
      });
    }

    await song.save();
    res.json({ success: true, liked: !alreadyLiked, likesCount: song.likesCount });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/songs/:id/like ───────────────────────
const unlikeSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ success: false, error: 'Song not found.' });
    song.likes      = song.likes.filter(id => id.toString() !== req.user._id.toString());
    song.likesCount = Math.max(0, song.likesCount - 1);
    await song.save();
    res.json({ success: true, liked: false, likesCount: song.likesCount });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/songs/:id/play ─────────────────────────
const logPlay = async (req, res, next) => {
  try {
    await Song.findByIdAndUpdate(req.params.id, { $inc: { playsCount: 1 } });

    // Add to recently played (keep last 50, avoid duplicates)
    await User.findByIdAndUpdate(req.user._id, {
      $pull:  { recentlyPlayed: { song: req.params.id } },
    });
    await User.findByIdAndUpdate(req.user._id, {
      $push:  { recentlyPlayed: { $each: [{ song: req.params.id, playedAt: new Date() }], $position: 0, $slice: 50 } },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/songs/recently-played ──────────────────
const getRecentlyPlayed = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({ path: 'recentlyPlayed.song', populate: { path: 'uploadedBy', select: 'username displayName avatar' } });

    const songs = user.recentlyPlayed
      .filter(r => r.song)
      .slice(0, 20)
      .map(r => ({ ...r.song.toObject(), playedAt: r.playedAt }));

    res.json({ success: true, songs });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSongs, searchSongs, getSongsByCategory, getSong, uploadSong, deleteSong, likeSong, unlikeSong, logPlay, getRecentlyPlayed };
