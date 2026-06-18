const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    title:    { type: String, required: true, trim: true, maxlength: 100 },
    artist:   { type: String, required: true, trim: true, maxlength: 100 },
    album:    { type: String, trim: true, maxlength: 100, default: '' },
    category: {
      type: String, required: true,
      enum: ['romantic','sad','old','hindi','english','party','devotional','folk','pop','other'],
      default: 'other',
    },
    emoji:    { type: String, default: '🎵' },

    // Cloudinary audio
    audioUrl:      { type: String, required: true },
    audioPublicId: { type: String, required: true },
    duration:      { type: Number, default: 0 },   // seconds

    // Cloudinary cover image
    coverUrl:      { type: String, default: '' },
    coverPublicId: { type: String, default: '' },

    // Uploader
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Likes (array of user IDs)
    likes:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },

    // Play count
    playsCount: { type: Number, default: 0 },

    // Lyrics (optional)
    lyrics: { type: String, default: '' },

    // Tags for search
    tags: [{ type: String, trim: true, lowercase: true }],
  },
  { timestamps: true }
);

// ── Text index for search ────────────────────────────
songSchema.index({ title: 'text', artist: 'text', album: 'text', tags: 'text' });
songSchema.index({ category: 1 });
songSchema.index({ uploadedBy: 1 });
songSchema.index({ likesCount: -1 });
songSchema.index({ playsCount: -1 });
songSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Song', songSchema);
