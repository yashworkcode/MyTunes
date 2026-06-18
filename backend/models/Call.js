const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    caller:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:      { type: String, enum: ['voice', 'video'], required: true },
    status:    {
      type: String,
      enum: ['initiated', 'ringing', 'accepted', 'rejected', 'missed', 'ended'],
      default: 'initiated',
    },

    startedAt:  { type: Date },
    endedAt:    { type: Date },
    duration:   { type: Number, default: 0 },  // seconds

    // WebRTC room/session ID
    roomId: { type: String, required: true },
  },
  { timestamps: true }
);

callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Call', callSchema);
