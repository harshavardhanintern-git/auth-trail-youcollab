const notificationService = require('../services/notification.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get user's notifications.
 */
const list = asyncHandler(async (req, res) => {
  const result = await notificationService.getUserNotifications(req.user.id, req.query);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * Mark a single notification as read.
 */
const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    data: notification,
  });
});

/**
 * Mark all user's notifications as read.
 */
const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      message: 'All notifications marked as read.',
    },
  });
});

/**
 * Get unread notification count.
 */
const unreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user.id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  list,
  markRead,
  markAllRead,
  unreadCount,
};
