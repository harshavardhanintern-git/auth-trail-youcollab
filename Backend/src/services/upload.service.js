const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const supabaseStorage = require('./storage');

/**
 * Upload Service
 * ==============
 * Primary: Supabase Storage (cloud)
 * Fallback: Local Multer storage (when Supabase Storage fails or for dev)
 */

/**
 * Upload a file — tries Supabase Storage first, falls back to local.
 *
 * @param {object} file - Express Multer file object
 * @param {string} [bucket] - Supabase Storage bucket name (default: 'avatars')
 * @param {string} [folder] - Optional subfolder within the bucket
 * @returns {Promise<object>} { url: string, storage: 'supabase' | 'local' }
 */
const uploadFile = async (file, bucket = supabaseStorage.BUCKETS.AVATARS, folder = '') => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  // Try Supabase Storage first
  try {
    // If multer is configured with memoryStorage, file.buffer is available
    // If multer is configured with diskStorage, read from disk
    let buffer = file.buffer;
    if (!buffer && file.path) {
      buffer = await fs.promises.readFile(file.path);
    }

    if (buffer) {
      const result = await supabaseStorage.uploadFile(
        buffer,
        file.originalname || file.filename,
        file.mimetype,
        bucket,
        folder
      );

      logger.info(`File uploaded to Supabase Storage: ${result.url}`);

      // Clean up local temp file if it exists
      if (file.path && fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
      }

      return { url: result.url, path: result.path, bucket: result.bucket, storage: 'supabase' };
    }
  } catch (err) {
    logger.warn(`Supabase Storage upload failed, falling back to local: ${err.message}`);
  }

  // Fallback: Local storage (original Multer behavior)
  const url = `/uploads/${file.filename}`;
  logger.info(`File stored locally: ${url}`);

  return { url, storage: 'local' };
};

/**
 * Remove an uploaded file (supports both Supabase Storage and local).
 *
 * @param {string} fileUrl - URL of the file to delete
 * @param {string} [storageBucket] - Supabase bucket name (if known)
 * @param {string} [storagePath] - Supabase path (if known)
 */
const deleteFile = async (fileUrl, storageBucket, storagePath) => {
  if (!fileUrl) return;

  // If Supabase Storage path is known, delete from cloud
  if (storageBucket && storagePath) {
    try {
      await supabaseStorage.deleteFile(storageBucket, storagePath);
      logger.info(`Deleted file from Supabase Storage: ${storageBucket}/${storagePath}`);
      return;
    } catch (err) {
      logger.warn(`Supabase Storage delete failed: ${err.message}`);
    }
  }

  // Try to detect if it's a Supabase URL
  if (fileUrl.includes('supabase.co/storage')) {
    try {
      await supabaseStorage.deleteFileByUrl(fileUrl);
      logger.info(`Deleted file from Supabase Storage by URL: ${fileUrl}`);
      return;
    } catch (err) {
      logger.warn(`Supabase Storage URL delete failed: ${err.message}`);
    }
  }

  // Fallback: Delete from local filesystem
  try {
    const filename = path.basename(fileUrl);
    const filepath = path.join(config.UPLOAD.DIR, filename);

    if (fs.existsSync(filepath)) {
      await fs.promises.unlink(filepath);
      logger.info(`Successfully deleted local file at ${filepath}`);
    }
  } catch (error) {
    logger.error(`Failed to delete file ${fileUrl}:`, error);
  }
};

module.exports = {
  uploadFile,
  deleteFile,
};
