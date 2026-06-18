const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    type: {
      type: String,
      required: true,
      enum: [
        'new_message',
        'playlist_like',
        'song_like',
        'follow',
        'song_upload',
        'incoming_call',
        'missed_call',
      ],
    },

    // Dynamic reference to song, playlist, call, etc.
    refModel: { type: String, enum: ['Song', 'Playlist', 'Call', 'Message', null], default: null },
    refId:    { type: mongoose.Schema.Types.ObjectId, default: null },

    message: { type: String, required: true },  // human-readable text
    read:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
