const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const AppError = require('../utils/AppError');

// Ensure upload directory exists
if (!fs.existsSync(config.UPLOAD.DIR)) {
  fs.mkdirSync(config.UPLOAD.DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.UPLOAD.DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (config.UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only images (JPEG, PNG, WEBP) are supported.', 400, 'VALIDATION_ERROR'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.UPLOAD.MAX_SIZE,
  },
});

module.exports = upload;
