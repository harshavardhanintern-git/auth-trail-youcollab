const { getAuth } = require('@clerk/express');
const userService = require('../services/user.service');
const AppError = require('../utils/AppError');

/**
 * Middleware to authenticate requests via a Clerk session.
 *
 * `clerkMiddleware()` (mounted in src/index.js) verifies the session token on
 * every request. This guard rejects unauthenticated requests, then resolves
 * the Clerk identity to the application's `users` row — creating it
 * automatically on first login — and attaches it as `req.user`.
 */
const authenticate = async (req, res, next) => {
  try {
    const auth = getAuth(req);

    if (!auth || !auth.userId) {
      return next(new AppError('Join YouCollab or sign in to view this.', 401, 'UNAUTHORIZED'));
    }

    const user = await userService.getOrCreateFromClerk(auth.userId);

    req.auth = auth;
    req.user = {
      id: user.id,
      clerkUserId: user.clerk_user_id,
      role: user.role,
      isOnboarded: user.is_onboarded,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError('Oops, your credentials look invalid. Try signing in again.', 401, 'UNAUTHORIZED'));
  }
};

/**
 * Role authorization guard.
 * @param {...string} allowedRoles - 'BRAND', 'INFLUENCER'
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Sign in to perform this action.', 401, 'UNAUTHORIZED'));
    }

    if (!req.user.role || !allowedRoles.includes(req.user.role)) {
      return next(new AppError("You don't have access to do that.", 403, 'FORBIDDEN'));
    }

    next();
  };
};

module.exports = {
  authenticate,
  requireRole,
};
