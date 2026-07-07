/**
 * YouCollab — Instagram Controller
 * ==================================
 * Handles HTTP request/response for Instagram Graph API integration.
 * Delegates all business logic to instagram.service.js.
 */

const igService = require('../services/instagram.service');
const asyncHandler = require('../utils/asyncHandler');
const crypto = require('crypto');

/**
 * GET /api/instagram/connect
 * Returns the Meta OAuth authorization URL + CSRF state.
 * Client should redirect the browser to the returned URL.
 */
const getConnectUrl = asyncHandler(async (req, res) => {
  // Use a hash of the user ID as a CSRF state token
  const state = crypto
    .createHmac('sha256', req.user.id)
    .update(Date.now().toString())
    .digest('hex')
    .slice(0, 16);

  const url = igService.getOAuthUrl(state);

  res.status(200).json({
    success: true,
    data: { url, state },
  });
});

/**
 * GET /api/instagram/callback
 * Receives `code` and `state` from Meta OAuth redirect (proxied from frontend).
 * Exchanges code for tokens, fetches profile, and saves to DB.
 */
const handleCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: { message: 'Missing authorization code from Instagram.', code: 'MISSING_CODE' },
    });
  }

  const influencer = await igService.connectInstagram(req.user.id, code);

  res.status(200).json({
    success: true,
    data: {
      message: `Instagram connected successfully! Welcome, @${influencer.igUsername} 🎉`,
      instagram: {
        username: influencer.igUsername,
        profilePicUrl: influencer.igProfilePicUrl,
        followersCount: influencer.igFollowersCount,
        followingCount: influencer.igFollowingCount,
        mediaCount: influencer.igMediaCount,
        bio: influencer.igBio,
        connectedAt: influencer.igConnectedAt,
        isVerified: influencer.isIgVerified,
      },
    },
  });
});

/**
 * GET /api/instagram/profile
 * Returns cached Instagram profile data from the DB (no API call).
 */
const getProfile = asyncHandler(async (req, res) => {
  const profile = await igService.getIgProfileFromDb(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      instagram: profile
        ? {
            isConnected: profile.isIgVerified,
            username: profile.igUsername,
            userId: profile.igUserId,
            profilePicUrl: profile.igProfilePicUrl,
            bio: profile.igBio,
            followersCount: profile.igFollowersCount,
            followingCount: profile.igFollowingCount,
            mediaCount: profile.igMediaCount,
            connectedAt: profile.igConnectedAt,
            lastSyncAt: profile.igLastSyncAt,
            tokenExpiresAt: profile.igTokenExpiresAt,
          }
        : { isConnected: false },
    },
  });
});

/**
 * POST /api/instagram/sync
 * Triggers a fresh sync from the Instagram Graph API.
 * Also proactively refreshes the access token if expiring within 7 days.
 */
const syncData = asyncHandler(async (req, res) => {
  const updated = await igService.syncInfluencerIgData(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      message: 'Instagram data synced successfully ✅',
      instagram: {
        isConnected: updated.isIgVerified,
        username: updated.igUsername,
        profilePicUrl: updated.igProfilePicUrl,
        bio: updated.igBio,
        followersCount: updated.igFollowersCount,
        followingCount: updated.igFollowingCount,
        mediaCount: updated.igMediaCount,
        lastSyncAt: updated.igLastSyncAt,
      },
    },
  });
});

/**
 * DELETE /api/instagram/disconnect
 * Clears all Instagram fields from the influencer profile.
 */
const disconnect = asyncHandler(async (req, res) => {
  await igService.disconnectIg(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      message: 'Instagram account disconnected successfully.',
    },
  });
});

module.exports = {
  getConnectUrl,
  handleCallback,
  getProfile,
  syncData,
  disconnect,
};
