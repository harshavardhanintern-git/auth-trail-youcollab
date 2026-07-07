/**
 * YouCollab — Instagram Routes
 * ==============================
 * All routes require authentication and the INFLUENCER role.
 *
 * GET    /api/instagram/connect     → Returns Meta OAuth URL
 * GET    /api/instagram/callback    → Completes OAuth flow (code exchange)
 * GET    /api/instagram/profile     → Returns cached IG profile from DB
 * POST   /api/instagram/sync        → Triggers fresh sync from Graph API
 * DELETE /api/instagram/disconnect  → Disconnects the IG account
 */

const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const igController = require('../controllers/instagram.controller');

const router = express.Router();

// All Instagram endpoints require an authenticated INFLUENCER
router.use(authenticate, requireRole('INFLUENCER'));

router.get('/connect', igController.getConnectUrl);
router.get('/callback', igController.handleCallback);
router.get('/profile', igController.getProfile);
router.post('/sync', igController.syncData);
router.delete('/disconnect', igController.disconnect);

module.exports = router;
