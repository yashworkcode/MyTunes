const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Stored encrypted (AES-256-GCM)
    content:  { type: String, required: true },  // encrypted ciphertext
    iv:       { type: String, required: true },  // base64 IV
    authTag:  { type: String, required: true },  // base64 auth tag

    // Read receipt
    read:   { type: Boolean, default: false },
    readAt: { type: Date },

    // Soft delete
    deletedBySender:    { type: Boolean, default: false },
    deletedByRecipient: { type: Boolean, default: false },

    // Optional: shared song in message
    sharedSong: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', default: null },
  },
  { timestamps: true }
);

messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model('Message', messageSchema);
