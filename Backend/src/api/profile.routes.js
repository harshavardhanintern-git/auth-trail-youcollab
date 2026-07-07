const express = require('express');
const profileController = require('../controllers/profile.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateBrandProfileSchema, updateInfluencerProfileSchema } = require('../models/profile.schema');

const router = express.Router();

router.get('/', authenticate, profileController.getProfile);

// Dynamic validation based on user role
router.patch('/', authenticate, (req, res, next) => {
  // We'll validate based on the user's role from the JWT
  const schema = req.user.role === 'BRAND' ? updateBrandProfileSchema : updateInfluencerProfileSchema;
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: {
        message: errors[0]?.message || 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      },
    });
  }
  req.body = result.data;
  next();
}, profileController.updateProfile);

module.exports = router;
