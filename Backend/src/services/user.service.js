/**
 * YouCollab — User Identity Service (Clerk ↔ Supabase)
 * =====================================================
 * Clerk is the single source of truth for authentication.
 * Supabase is DATABASE ONLY — this service keeps the `users` table
 * in sync with Clerk identities:
 *
 *   • getOrCreateFromClerk  → auto-provisions a users row on first login
 *   • setRole               → persists the selected role (DB + Clerk metadata)
 *   • getMe                 → full profile payload for the frontend
 */

const { clerkClient } = require('@clerk/express');
const supabase = require('./supabase');
const AppError = require('../utils/AppError');

const VALID_ROLES = ['BRAND', 'INFLUENCER'];

// Small in-memory cache so hot request paths don't hit the DB on every call.
// Entries are short-lived and invalidated whenever the role/profile changes.
const CACHE_TTL_MS = 30 * 1000;
const userCache = new Map(); // clerkUserId → { user, expiresAt }

const cacheGet = (clerkUserId) => {
  const hit = userCache.get(clerkUserId);
  if (hit && hit.expiresAt > Date.now()) return hit.user;
  if (hit) userCache.delete(clerkUserId);
  return null;
};

const cacheSet = (clerkUserId, user) => {
  userCache.set(clerkUserId, { user, expiresAt: Date.now() + CACHE_TTL_MS });
};

const cacheInvalidate = (clerkUserId) => {
  userCache.delete(clerkUserId);
};

/**
 * Normalize a role value coming from Clerk metadata.
 * Accepts the app roles plus friendly aliases ("CREATOR" → INFLUENCER).
 */
const normalizeRole = (value) => {
  if (!value || typeof value !== 'string') return null;
  const upper = value.trim().toUpperCase();
  if (upper === 'CREATOR') return 'INFLUENCER';
  return VALID_ROLES.includes(upper) ? upper : null;
};

/**
 * Extract the identity fields we persist from a Clerk user object.
 */
const identityFromClerkUser = (clerkUser) => {
  const primaryEmail =
    clerkUser.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
    clerkUser.emailAddresses?.[0]?.emailAddress ||
    null;

  const metaName =
    clerkUser.unsafeMetadata?.fullName ||
    clerkUser.publicMetadata?.fullName ||
    null;

  const composedName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim();

  const fullName = metaName || composedName || clerkUser.username || (primaryEmail ? primaryEmail.split('@')[0] : null);

  const role =
    normalizeRole(clerkUser.publicMetadata?.role) ||
    normalizeRole(clerkUser.unsafeMetadata?.role);

  return {
    email: primaryEmail,
    fullName: fullName || null,
    avatarUrl: clerkUser.imageUrl || null,
    role,
  };
};

/**
 * Find an app user by Clerk user id.
 */
const findByClerkId = async (clerkUserId) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  console.log("Supabase data:", data);
  console.log("Supabase error:", error);

  if (error) {
    throw new AppError(
      `Supabase Error: ${error.message}`,
      500,
      "DATABASE_ERROR"
    );
  }

  return data || null;
};
/**
 * Get the app user for a Clerk identity, creating the record automatically
 * after the first successful login if it does not already exist.
 *
 * Legacy accounts (rows that pre-date Clerk and match by email) are claimed
 * by attaching the Clerk id instead of inserting a duplicate.
 */
const getOrCreateFromClerk = async (clerkUserId) => {
  const cached = cacheGet(clerkUserId);
  if (cached) return cached;

  let user = await findByClerkId(clerkUserId);
  if (user) {
    cacheSet(clerkUserId, user);
    return user;
  }

  // Fetch the identity from Clerk (source of truth for auth data)
  let clerkUser;
  try {
    clerkUser = await clerkClient.users.getUser(clerkUserId);
  } catch (err) {
    throw new AppError('Could not verify your account. Try signing in again.', 401, 'UNAUTHORIZED');
  }

  const identity = identityFromClerkUser(clerkUser);
  if (!identity.email) {
    throw new AppError('Your account has no email address on file.', 400, 'BAD_REQUEST');
  }

  // Claim a legacy (pre-Clerk) row with the same email, if one exists.
  const { data: legacy } = await supabase
    .from('users')
    .select('*')
    .eq('email', identity.email)
    .is('clerk_user_id', null)
    .maybeSingle();

  if (legacy) {
    const { data: claimed, error: claimError } = await supabase
      .from('users')
      .update({
        clerk_user_id: clerkUserId,
        full_name: legacy.full_name || identity.fullName,
        avatar_url: legacy.avatar_url || identity.avatarUrl,
        role: legacy.role || identity.role,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', legacy.id)
      .select('*')
      .single();

    if (claimError) {
      throw new AppError('Failed to link your account.', 500, 'DATABASE_ERROR');
    }
    cacheSet(clerkUserId, claimed);
    return claimed;
  }

  // Auto-create the user record on first login
  const { data: created, error: insertError } = await supabase
    .from('users')
    .insert({
      clerk_user_id: clerkUserId,
      email: identity.email,
      full_name: identity.fullName,
      role: identity.role,
      avatar_url: identity.avatarUrl,
      is_onboarded: false,
      last_active_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (insertError) {
    // Unique-violation race: another request created the row first — re-read it.
    user = await findByClerkId(clerkUserId);
    if (user) {
      cacheSet(clerkUserId, user);
      return user;
    }
    throw new AppError('Failed to create your account record.', 500, 'DATABASE_ERROR');
  }

  cacheSet(clerkUserId, created);
  return created;
};

/**
 * Persist the selected role for a user.
 * Writes to the database and mirrors the role into Clerk publicMetadata so
 * the role travels with the Clerk identity.
 */
const setRole = async (user, role) => {
  const normalized = normalizeRole(role);
  if (!normalized) {
    throw new AppError('Role must be either Creator or Brand.', 400, 'VALIDATION_ERROR');
  }

  // Roles are set once at signup — never silently switched afterwards.
  if (user.role && user.role !== normalized) {
    return user;
  }

  let updated = user;
  if (user.role !== normalized) {
    const { data, error } = await supabase
      .from('users')
      .update({ role: normalized })
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) {
      throw new AppError('Failed to save your role.', 500, 'DATABASE_ERROR');
    }
    updated = data;
  }

  // Mirror into Clerk metadata (best effort — DB already holds the role)
  try {
    await clerkClient.users.updateUserMetadata(user.clerk_user_id, {
      publicMetadata: { role: normalized },
    });
  } catch (err) {
    // Non-fatal: the database is authoritative for the application.
  }

  cacheInvalidate(user.clerk_user_id);
  return updated;
};

/**
 * Update the "last seen" timestamp (fire-and-forget from callers).
 */
const touchLastActive = async (userId) => {
  await supabase
    .from('users')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', userId);
};

/**
 * Full profile payload for the authenticated user (same shape the
 * frontend has always consumed).
 */
const getMe = async (userId) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*, brand:brands(*), influencer:influencers(*)')
    .eq('id', userId)
    .maybeSingle();

  if (error || !user) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }

  await touchLastActive(userId);
  cacheInvalidate(user.clerk_user_id);

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.full_name,
    avatarUrl: user.avatar_url,
    isOnboarded: user.is_onboarded,
    lastActiveAt: user.last_active_at,
    brand: user.brand,
    influencer: user.influencer,
  };
};

module.exports = {
  findByClerkId,
  getOrCreateFromClerk,
  setRole,
  getMe,
  touchLastActive,
  cacheInvalidate,
  normalizeRole,
};
