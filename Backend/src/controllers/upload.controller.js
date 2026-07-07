const uploadService = require('../services/upload.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Handle a single file upload request.
 */
const uploadSingle = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please select an image file to upload.', 400, 'VALIDATION_ERROR'));
  }

  const result = await uploadService.uploadFile(req.file);

  res.status(200).json({
    success: true,
    data: {
      url: result.url,
      message: 'Image uploaded successfully! 📸',
    },
  });
});

module.exports = {
  uploadSingle,
};
