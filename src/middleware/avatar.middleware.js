const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/apiError');

const avatarsDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${req.user._id}-${suffix}${ALLOWED_TYPES[file.mimetype]}`);
  }
});

const avatarUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES[file.mimetype]) {
      return cb(ApiError.badRequest('Profile photo must be a JPG, PNG, WebP or GIF image'));
    }
    cb(null, true);
  }
});

module.exports = { avatarUpload, avatarsDir };
