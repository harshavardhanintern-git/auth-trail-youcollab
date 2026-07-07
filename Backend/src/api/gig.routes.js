const express = require('express');
const gigController = require('../controllers/gig.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createGigSchema, updateGigSchema } = require('../models/gig.schema');

const router = express.Router();

router.post('/', authenticate, requireRole('BRAND'), validate(createGigSchema), gigController.create);
router.get('/', authenticate, gigController.list);
router.get('/mine', authenticate, requireRole('BRAND'), gigController.mine);
router.get('/:id', authenticate, gigController.detail);
router.patch('/:id', authenticate, requireRole('BRAND'), validate(updateGigSchema), gigController.update);
router.patch('/:id/toggle-status', authenticate, requireRole('BRAND'), gigController.toggleStatus);
router.delete('/:id', authenticate, requireRole('BRAND'), gigController.close);
router.delete('/:id/destroy', authenticate, requireRole('BRAND'), gigController.destroy);

module.exports = router;
