const express = require('express');
const onboardingController = require('../controllers/onboarding.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { brandOnboardingSchema, influencerOnboardingSchema } = require('../models/onboarding.schema');

const router = express.Router();

router.post('/brand', authenticate, requireRole('BRAND'), validate(brandOnboardingSchema), onboardingController.onboardBrand);
router.post('/influencer', authenticate, requireRole('INFLUENCER'), validate(influencerOnboardingSchema), onboardingController.onboardInfluencer);

module.exports = router;
