const TRIAL_CREDITS = 500;

const TIER_COST = {
  NANO: 100,
  MICRO: 300,
};

/**
 * Classify a creator into a hiring tier by Instagram follower count.
 * MID is intentionally unhireable — there's no paid pack yet to unlock it,
 * it only exists so the trial-pack ceiling is visible to brands.
 */
const getTier = (followerCount = 0) => {
  if (followerCount > 10000) return 'MID';
  if (followerCount >= 1000) return 'MICRO';
  return 'NANO';
};

module.exports = { TRIAL_CREDITS, TIER_COST, getTier };
