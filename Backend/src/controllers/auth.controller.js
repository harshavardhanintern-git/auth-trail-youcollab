const userService = require('../services/user.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get Profile controller.
 * Returns the application profile for the authenticated Clerk session.
 * The `users` row is auto-created on first login by the authenticate
 * middleware, so this always resolves for a valid session.
 */
const me = asyncHandler(async (req, res) => {
  const userProfile = await userService.getMe(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      user: userProfile,
    },
  });
});

/**
 * Sync controller.
 * Called by the frontend right after signup / first OAuth login to persist
 * the selected role (Creator or Brand). The role is stored in the database
 * and mirrored into Clerk publicMetadata.
 */
const sync = asyncHandler(async (req, res) => {
  const { role } = req.body;

  const current = await userService.getOrCreateFromClerk(req.user.clerkUserId);
  await userService.setRole(current, role);
  const userProfile = await userService.getMe(current.id);

  res.status(200).json({
    success: true,
    data: {
      user: userProfile,
    },
  });
});

module.exports = {
  me,
  sync,
};
