const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, notificationController.list);
router.get('/unread-count', authenticate, notificationController.unreadCount);
router.patch('/read', authenticate, notificationController.markAllRead);
router.patch('/:id/read', authenticate, notificationController.markRead);

module.exports = router;
