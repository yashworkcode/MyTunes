const mongoose = require('mongoose');

const followerSchema = new mongoose.Schema(
  {
    follower:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// A user can only follow another user once
followerSchema.index({ follower: 1, following: 1 }, { unique: true });
followerSchema.index({ following: 1 });
followerSchema.index({ follower: 1 });

module.exports = mongoose.model('Follower', followerSchema);
