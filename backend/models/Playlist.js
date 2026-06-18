const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    visibility:  { type: String, enum: ['public', 'private'], default: 'public' },
    emoji:       { type: String, default: '🎵' },

    // Cover image
    coverUrl:      { type: String, default: '' },
    coverPublicId: { type: String, default: '' },

    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    songs: [
      {
        song:    { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
        addedAt: { type: Date, default: Date.now },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    likes:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

playlistSchema.index({ owner: 1 });
playlistSchema.index({ visibility: 1 });
playlistSchema.index({ likesCount: -1 });
playlistSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Playlist', playlistSchema);
