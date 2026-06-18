const multer = require('multer');

// Store files in memory so we can stream to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (allowedTypes) => (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`), false);
  }
};

// Audio upload — MP3, WAV, OGG, M4A (max 50 MB)
const uploadAudio = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: fileFilter(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a']),
});

// Image upload — JPEG, PNG, WEBP, GIF (max 5 MB)
const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
});

// Song upload — both audio + cover image in one request
const uploadSong = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a',
      'image/jpeg', 'image/png', 'image/webp',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type.'), false);
  },
});

module.exports = { uploadAudio, uploadImage, uploadSong };
