const profileService = require('../services/profile.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get current user's profile.
 */
const getProfile = asyncHandler(async (req, res) => {
  const profile = await profileService.getProfile(req.user.id);

  res.status(200).json({
    success: true,
    data: profile,
  });
});

/**
 * Update current user's profile based on role.
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { role } = req.user;
  let result;

  if (role === 'BRAND') {
    result = await profileService.updateBrandProfile(req.user.id, req.body);
  } else {
    result = await profileService.updateInfluencerProfile(req.user.id, req.body);
  }

  res.status(200).json({
    success: true,
    data: result,
    message: 'Profile updated successfully! ✨',
  });
});

module.exports = {
  getProfile,
  updateProfile,
};
