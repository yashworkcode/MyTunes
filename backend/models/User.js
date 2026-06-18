const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String, required: true, unique: true, trim: true,
      minlength: 3, maxlength: 30,
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, underscores.'],
    },
    email: {
      type: String, required: true, unique: true, lowercase: true, trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email.'],
    },
    password:    { type: String, required: true, minlength: 6, select: false },
    displayName: { type: String, trim: true, maxlength: 50 },
    bio:         { type: String, maxlength: 200, default: '' },
    avatar:      { type: String, default: '' },          // Cloudinary URL
    avatarPublicId: { type: String, default: '' },
    coverImage:  { type: String, default: '' },
    coverImagePublicId: { type: String, default: '' },

    // Counts (denormalized for performance)
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    songsCount:     { type: Number, default: 0 },

    // Online presence
    isOnline:   { type: Boolean, default: false },
    lastSeen:   { type: Date,    default: Date.now },
    socketId:   { type: String,  default: '' },

    // Recently played songs (last 50)
    recentlyPlayed: [
      {
        song:     { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
        playedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// ── Hash password before save ────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt   = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Compare password ─────────────────────────────────
userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

// ── Virtual: displayName fallback ────────────────────
userSchema.virtual('name').get(function () {
  return this.displayName || this.username;
});

// ── Remove sensitive fields from JSON output ─────────
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  delete obj.socketId;
  delete obj.avatarPublicId;
  delete obj.coverImagePublicId;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
