/**
 * YouCollab — Supabase Storage Service
 * =======================================
 * Cloud-based file storage using Supabase Storage buckets.
 *
 * Buckets:
 *   • avatars    → User profile images and brand logos
 *   • gig-media  → Gig-related images and media files
 *
 * Falls back to local Multer storage if Supabase Storage is unavailable.
 *
 * Setup Required (run once in Supabase SQL Editor):
 *   Buckets are created by migrations/migration.sql (§9 Storage) — run
 *   `npm run db:migrate` and both 'avatars' and 'gig-media' will exist.
 */

const { supabase, supabaseAdmin } = require('./supabase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// ─── Constants ──────────────────────────────────────────────────────────
const BUCKETS = {
  AVATARS: 'avatars',
  GIG_MEDIA: 'gig-media',
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload a file to Supabase Storage.
 *
 * @param {Buffer} fileBuffer - File content as a Buffer
 * @param {string} originalName - Original filename (e.g. "photo.jpg")
 * @param {string} mimeType - MIME type (e.g. "image/jpeg")
 * @param {string} bucket - Storage bucket name (default: 'avatars')
 * @param {string} [folder] - Optional subfolder path within the bucket
 * @returns {Promise<{ url: string, path: string, bucket: string }>}
 */
const uploadFile = async (fileBuffer, originalName, mimeType, bucket = BUCKETS.AVATARS, folder = '') => {
  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`File type "${mimeType}" is not allowed. Accepted: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  // Validate file size
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
  }

  // Generate unique filename to avoid collisions
  const ext = path.extname(originalName) || '.jpg';
  const uniqueName = `${uuidv4()}${ext}`;
  const filePath = folder ? `${folder}/${uniqueName}` : uniqueName;

  const client = supabaseAdmin || supabase;
  const { data, error } = await client.storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = client.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
    bucket,
  };
};

/**
 * Upload a file from a Multer file object (Express middleware).
 * Convenience wrapper for use with existing Multer middleware.
 *
 * @param {object} multerFile - Multer file object (req.file)
 * @param {string} bucket - Storage bucket name
 * @param {string} [folder] - Optional subfolder
 * @returns {Promise<{ url: string, path: string, bucket: string }>}
 */
const uploadMulterFile = async (multerFile, bucket = BUCKETS.AVATARS, folder = '') => {
  if (!multerFile) {
    throw new Error('No file provided for upload.');
  }

  return uploadFile(
    multerFile.buffer,
    multerFile.originalname,
    multerFile.mimetype,
    bucket,
    folder
  );
};

/**
 * Generate a signed URL for private file access.
 *
 * @param {string} bucket - Storage bucket name
 * @param {string} filePath - Path to the file within the bucket
 * @param {number} expiresIn - Seconds until the URL expires (default: 1 hour)
 * @returns {Promise<string>} Signed URL
 */
const getSignedUrl = async (bucket, filePath, expiresIn = 3600) => {
  const client = supabaseAdmin || supabase;
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
};

/**
 * Get the public URL for a file (for public buckets).
 *
 * @param {string} bucket - Storage bucket name
 * @param {string} filePath - Path to the file within the bucket
 * @returns {string} Public URL
 */
const getPublicUrl = (bucket, filePath) => {
  const client = supabaseAdmin || supabase;
  const { data } = client.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return data.publicUrl;
};

/**
 * Delete a file from Supabase Storage.
 *
 * @param {string} bucket - Storage bucket name
 * @param {string} filePath - Path to the file within the bucket
 * @returns {Promise<void>}
 */
const deleteFile = async (bucket, filePath) => {
  if (!filePath) return;

  const client = supabaseAdmin || supabase;
  const { error } = await client.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    console.error(`Failed to delete file from storage: ${error.message}`);
  }
};

/**
 * Delete a file by its public URL.
 * Extracts the bucket and path from the URL.
 *
 * @param {string} publicUrl - Full public URL of the file
 * @returns {Promise<void>}
 */
const deleteFileByUrl = async (publicUrl) => {
  if (!publicUrl) return;

  try {
    // Extract path from Supabase Storage URL
    // Format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const url = new URL(publicUrl);
    const pathParts = url.pathname.split('/storage/v1/object/public/');
    if (pathParts.length < 2) return;

    const [bucket, ...rest] = pathParts[1].split('/');
    const filePath = rest.join('/');

    await deleteFile(bucket, filePath);
  } catch (err) {
    console.error(`Failed to parse and delete file URL: ${err.message}`);
  }
};

/**
 * List files in a storage bucket folder.
 *
 * @param {string} bucket - Storage bucket name
 * @param {string} [folder] - Folder path within the bucket
 * @param {object} [options] - { limit, offset, sortBy }
 * @returns {Promise<object[]>} Array of file metadata objects
 */
const listFiles = async (bucket, folder = '', options = {}) => {
  const client = supabaseAdmin || supabase;
  const { data, error } = await client.storage
    .from(bucket)
    .list(folder, {
      limit: options.limit || 100,
      offset: options.offset || 0,
      sortBy: options.sortBy || { column: 'created_at', order: 'desc' },
    });

  if (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }

  return data;
};

module.exports = {
  BUCKETS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  uploadFile,
  uploadMulterFile,
  getSignedUrl,
  getPublicUrl,
  deleteFile,
  deleteFileByUrl,
  listFiles,
};
