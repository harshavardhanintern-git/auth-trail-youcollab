const onboardingService = require('../services/onboarding.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Onboard Brand profile controller.
 */
const onboardBrand = asyncHandler(async (req, res) => {
  const result = await onboardingService.onboardBrand(req.user.id, req.body);
  
  res.status(200).json({
    success: true,
    data: {
      user: result,
      message: 'Brand onboarding completed! Welcome aboard 🏢✨',
    },
  });
});

/**
 * Onboard Influencer profile controller.
 */
const onboardInfluencer = asyncHandler(async (req, res) => {
  const result = await onboardingService.onboardInfluencer(req.user.id, req.body);

  res.status(200).json({
    success: true,
    data: {
      user: result,
      message: 'Creator profile completed! Happy collaborating 🎨🚀',
    },
  });
});

module.exports = {
  onboardBrand,
  onboardInfluencer,
};
