const express = require('express');
const applicationController = require('../controllers/application.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { applySchema, updateApplicationStatusSchema, sendMessageSchema } = require('../models/application.schema');

const router = express.Router();

router.post('/', authenticate, requireRole('INFLUENCER'), validate(applySchema), applicationController.apply);
router.get('/me', authenticate, requireRole('INFLUENCER'), applicationController.listMyApplications);
router.get('/gig/:gigId', authenticate, requireRole('BRAND'), applicationController.listApplicants);
router.patch('/:id/status', authenticate, requireRole('BRAND'), validate(updateApplicationStatusSchema), applicationController.updateStatus);
router.get('/:id/messages', authenticate, applicationController.listMessages);
router.post('/:id/messages', authenticate, validate(sendMessageSchema), applicationController.sendMessage);

module.exports = router;
