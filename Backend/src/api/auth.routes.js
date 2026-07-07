const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { syncSchema } = require('../models/auth.schema');

const router = express.Router();

// Authentication itself (signup, login, email verification, password reset,
// OAuth, sessions, logout) is fully handled by Clerk. These endpoints only
// bridge the Clerk identity into the application database.
router.get('/me', authenticate, authController.me);
router.post('/sync', authenticate, validate(syncSchema), authController.sync);

module.exports = router;
