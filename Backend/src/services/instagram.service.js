/**
 * YouCollab — Instagram Graph API Service
 * ========================================
 * Handles all communication with Meta's Instagram Graph API:
 *  - OAuth URL generation
 *  - Token exchange (short-lived → long-lived)
 *  - Token refresh
 *  - Profile & metrics fetching
 *  - DB sync and disconnect
 */

const https = require('https');
const supabase = require('./supabase');
const config = require('../config');
const AppError = require('../utils/AppError');

// ─── Constants ────────────────────────────────────────────────────────────────

const GRAPH_API_BASE = 'https://graph.instagram.com';
// Instagram OAuth authorize endpoint (for Business/Creator accounts)
const META_AUTH_BASE = 'https://api.instagram.com/oauth/authorize';
const META_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const META_LONG_TOKEN_URL = `${GRAPH_API_BASE}/access_token`;
const META_REFRESH_URL = `${GRAPH_API_BASE}/refresh_access_token`;

// Scopes for Instagram Business/Creator OAuth (do NOT mix with Facebook scopes here)
const INSTAGRAM_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_insights',
].join(',');


// ─── HTTP Helper ──────────────────────────────────────────────────────────────

/**
 * Tiny fetch wrapper using Node built-in https for Meta Graph API calls.
 * @param {string} url
 * @returns {Promise<object>}
 */
const fetchJson = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new AppError(parsed.error.message || 'Instagram API error.', 502, 'INSTAGRAM_API_ERROR'));
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new AppError('Failed to parse Instagram API response.', 502, 'INSTAGRAM_PARSE_ERROR'));
        }
      });
    }).on('error', (err) => {
      reject(new AppError(`Instagram API network error: ${err.message}`, 502, 'INSTAGRAM_NETWORK_ERROR'));
    });
  });
};

/**
 * POST helper for token exchange endpoints (form-encoded).
 * @param {string} url
 * @param {object} params
 * @returns {Promise<object>}
 */
const postForm = (url, params) => {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new AppError(parsed.error.message || 'Instagram token error.', 502, 'INSTAGRAM_TOKEN_ERROR'));
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new AppError('Failed to parse Instagram token response.', 502, 'INSTAGRAM_PARSE_ERROR'));
        }
      });
    });

    req.on('error', (err) => {
      reject(new AppError(`Instagram token request error: ${err.message}`, 502, 'INSTAGRAM_NETWORK_ERROR'));
    });

    req.write(body);
    req.end();
  });
};

// ─── OAuth URL ────────────────────────────────────────────────────────────────

/**
 * Build the Meta OAuth authorization URL.
 * @param {string} state - CSRF prevention token (user's ID or random string)
 * @returns {string} Full URL to redirect the browser to
 */
const getOAuthUrl = (state) => {
  const params = new URLSearchParams({
    client_id: config.INSTAGRAM.APP_ID,
    redirect_uri: config.INSTAGRAM.REDIRECT_URI,
    scope: INSTAGRAM_SCOPES,
    response_type: 'code',
    state,
  });
  return `${META_AUTH_BASE}?${params.toString()}`;
};

// ─── Token Exchange ───────────────────────────────────────────────────────────

/**
 * Exchange the authorization code from the OAuth callback for a short-lived token.
 * @param {string} code
 * @returns {Promise<{ access_token: string, user_id: string }>}
 */
const exchangeCodeForToken = async (code) => {
  const result = await postForm(META_TOKEN_URL, {
    client_id: config.INSTAGRAM.APP_ID,
    client_secret: config.INSTAGRAM.APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: config.INSTAGRAM.REDIRECT_URI,
    code,
  });

  if (!result.access_token) {
    throw new AppError('Failed to obtain Instagram access token.', 502, 'INSTAGRAM_TOKEN_ERROR');
  }

  return result; // { access_token, user_id }
};

/**
 * Exchange a short-lived token (1h) for a long-lived token (60 days).
 * @param {string} shortLivedToken
 * @returns {Promise<{ access_token: string, token_type: string, expires_in: number }>}
 */
const getLongLivedToken = async (shortLivedToken) => {
  const url = `${META_LONG_TOKEN_URL}?grant_type=ig_exchange_token&client_secret=${config.INSTAGRAM.APP_SECRET}&access_token=${shortLivedToken}`;
  const result = await fetchJson(url);

  if (!result.access_token) {
    throw new AppError('Failed to obtain long-lived Instagram token.', 502, 'INSTAGRAM_TOKEN_ERROR');
  }

  return result; // { access_token, token_type, expires_in }
};

/**
 * Refresh an existing long-lived token before it expires.
 * Long-lived tokens can only be refreshed if they are at least 24h old.
 * @param {string} existingToken
 * @returns {Promise<{ access_token: string, expires_in: number }>}
 */
const refreshLongLivedToken = async (existingToken) => {
  const url = `${META_REFRESH_URL}?grant_type=ig_refresh_token&access_token=${existingToken}`;
  const result = await fetchJson(url);

  if (!result.access_token) {
    throw new AppError('Failed to refresh Instagram token.', 502, 'INSTAGRAM_TOKEN_ERROR');
  }

  return result;
};

// ─── Profile Fetching ─────────────────────────────────────────────────────────

/**
 * Fetch Instagram profile data from the Graph API.
 * @param {string} accessToken
 * @returns {Promise<object>} Raw API profile response
 */
const fetchIgProfile = async (accessToken) => {
  const fields = [
    'id',
    'name',
    'username',
    'biography',
    'followers_count',
    'follows_count',
    'media_count',
    'profile_picture_url',
    'account_type',
  ].join(',');

  const url = `${GRAPH_API_BASE}/me?fields=${fields}&access_token=${accessToken}`;
  const profile = await fetchJson(url);

  return profile;
};

// ─── DB Sync ──────────────────────────────────────────────────────────────────

/**
 * Full sync: fetch latest profile data from API and update the influencer row.
 * Also proactively refreshes the token if expiring within 7 days.
 * @param {string} userId - YouCollab user ID
 * @returns {Promise<object>} Updated influencer record
 */
const syncInfluencerIgData = async (userId) => {
  // 1. Fetch current token from DB
  const { data: influencer, error: fetchErr } = await supabase
    .from('influencers')
    .select('id, igAccessToken, igTokenExpiresAt, igUserId, isIgVerified')
    .eq('userId', userId)
    .maybeSingle();

  if (fetchErr || !influencer) {
    throw new AppError('Influencer profile not found.', 404, 'NOT_FOUND');
  }

  if (!influencer.isIgVerified || !influencer.igAccessToken) {
    throw new AppError('Instagram account is not connected.', 400, 'INSTAGRAM_NOT_CONNECTED');
  }

  let activeToken = influencer.igAccessToken;

  // 2. Proactively refresh token if expiring within 7 days
  if (influencer.igTokenExpiresAt) {
    const expiresAt = new Date(influencer.igTokenExpiresAt);
    const daysLeft = (expiresAt - new Date()) / (1000 * 60 * 60 * 24);

    if (daysLeft < 7) {
      try {
        const refreshed = await refreshLongLivedToken(activeToken);
        activeToken = refreshed.access_token;
        const newExpiresAt = new Date();
        newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshed.expires_in);

        await supabase
          .from('influencers')
          .update({
            igAccessToken: activeToken,
            igTokenExpiresAt: newExpiresAt.toISOString(),
          })
          .eq('userId', userId);
      } catch (refreshErr) {
        console.warn(`[Instagram] Token refresh failed for user ${userId}:`, refreshErr.message);
      }
    }
  }

  // 3. Fetch latest profile from Instagram Graph API
  const profile = await fetchIgProfile(activeToken);

  // 4. Compute token expiry (if not refreshed above, keep existing)
  const now = new Date();
  const igLastSyncAt = now.toISOString();

  // 5. Upsert the influencer row with latest metrics
  const updatePayload = {
    igUserId: profile.id,
    igUsername: profile.username,
    igProfilePicUrl: profile.profile_picture_url || null,
    igBio: profile.biography || null,
    igFollowersCount: profile.followers_count ?? null,
    igFollowingCount: profile.follows_count ?? null,
    igMediaCount: profile.media_count ?? null,
    igLastSyncAt,
  };

  const { data: updated, error: updateErr } = await supabase
    .from('influencers')
    .update(updatePayload)
    .eq('userId', userId)
    .select()
    .single();

  if (updateErr) {
    throw new AppError('Failed to sync Instagram data.', 500, 'DATABASE_ERROR');
  }

  return updated;
};

// ─── Connect ──────────────────────────────────────────────────────────────────

/**
 * Complete the OAuth flow: exchange code → get long-lived token → fetch profile → save to DB.
 * @param {string} userId - YouCollab user ID
 * @param {string} code - Authorization code from Meta callback
 * @returns {Promise<object>} Updated influencer record
 */
const connectInstagram = async (userId, code) => {
  // 1. Exchange code for short-lived token
  const shortToken = await exchangeCodeForToken(code);

  // 2. Upgrade to long-lived token (60 days)
  const longToken = await getLongLivedToken(shortToken.access_token);

  // 3. Compute expiry timestamp
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + longToken.expires_in);

  // 4. Fetch Instagram profile
  const profile = await fetchIgProfile(longToken.access_token);

  // 5. Save everything to DB
  const now = new Date().toISOString();
  const updatePayload = {
    igUserId: profile.id,
    igUsername: profile.username,
    igAccessToken: longToken.access_token,
    igTokenExpiresAt: expiresAt.toISOString(),
    igConnectedAt: now,
    isIgVerified: true,
    igProfilePicUrl: profile.profile_picture_url || null,
    igBio: profile.biography || null,
    igFollowersCount: profile.followers_count ?? null,
    igFollowingCount: profile.follows_count ?? null,
    igMediaCount: profile.media_count ?? null,
    igLastSyncAt: now,
  };

  const { data: updated, error } = await supabase
    .from('influencers')
    .update(updatePayload)
    .eq('userId', userId)
    .select()
    .single();

  if (error) {
    throw new AppError('Failed to save Instagram connection.', 500, 'DATABASE_ERROR');
  }

  return updated;
};

// ─── Disconnect ───────────────────────────────────────────────────────────────

/**
 * Disconnect Instagram — nullifies all IG fields on the influencer row.
 * @param {string} userId - YouCollab user ID
 * @returns {Promise<void>}
 */
const disconnectIg = async (userId) => {
  const { error } = await supabase
    .from('influencers')
    .update({
      igUserId: null,
      igUsername: null,
      igAccessToken: null,
      igTokenExpiresAt: null,
      igConnectedAt: null,
      isIgVerified: false,
      igProfilePicUrl: null,
      igBio: null,
      igFollowersCount: null,
      igFollowingCount: null,
      igMediaCount: null,
      igLastSyncAt: null,
    })
    .eq('userId', userId);

  if (error) {
    throw new AppError('Failed to disconnect Instagram.', 500, 'DATABASE_ERROR');
  }
};

// ─── Get Profile ──────────────────────────────────────────────────────────────

/**
 * Retrieve cached Instagram profile data from the DB (no API call).
 * @param {string} userId - YouCollab user ID
 * @returns {Promise<object|null>}
 */
const getIgProfileFromDb = async (userId) => {
  const { data: influencer } = await supabase
    .from('influencers')
    .select(
      'isIgVerified, igUsername, igUserId, igProfilePicUrl, igBio, igFollowersCount, igFollowingCount, igMediaCount, igConnectedAt, igLastSyncAt, igTokenExpiresAt'
    )
    .eq('userId', userId)
    .maybeSingle();

  return influencer || null;
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getOAuthUrl,
  exchangeCodeForToken,
  getLongLivedToken,
  refreshLongLivedToken,
  fetchIgProfile,
  connectInstagram,
  syncInfluencerIgData,
  disconnectIg,
  getIgProfileFromDb,
};
