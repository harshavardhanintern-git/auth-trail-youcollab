const supabase = require('./supabase');
const AppError = require('../utils/AppError');
const { parsePagination, paginateResults } = require('../utils/pagination');

/**
 * Create a new notification.
 * Also broadcasts via Supabase Realtime (automatically via Postgres Changes).
 */
const create = async (data) => {
  const { data: notif, error } = await supabase
    .from('notifications')
    .insert({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    })
    .select('*')
    .single();

  if (error) {
    throw new AppError('Failed to create notification.', 500, 'DATABASE_ERROR');
  }

  // Real-time broadcast happens automatically via Supabase Postgres Changes
  // when the notifications table is added to supabase_realtime publication.
  // See migration.sql §8: ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

  return notif;
};

/**
 * Fetch a user's notifications.
 */
const getUserNotifications = async (userId, filters) => {
  const { cursor, limit } = parsePagination(filters, 20);

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('userId', userId);

  if (cursor) {
    const { data: cursorItem } = await supabase
      .from('notifications')
      .select('createdAt, id')
      .eq('id', cursor)
      .maybeSingle();
    if (cursorItem) {
      query = query.or(`createdAt.lt.${cursorItem.createdAt},and(createdAt.eq.${cursorItem.createdAt},id.lt.${cursorItem.id})`);
    }
  }

  query = query.order('createdAt', { ascending: false }).order('id', { ascending: false });

  const { data: notifications, error } = await query.limit(limit + 1);

  if (error) {
    throw new AppError('Failed to fetch notifications.', 500, 'DATABASE_ERROR');
  }

  const parsedNotifications = (notifications || []).map((n) => ({
    ...n,
    metadata: n.metadata ? JSON.parse(n.metadata) : null,
  }));

  return paginateResults(parsedNotifications, limit);
};

/**
 * Mark a single notification as read.
 */
const markAsRead = async (id, userId) => {
  const { data: notification, error: findError } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (findError || !notification) {
    throw new AppError('Notification not found.', 404, 'NOT_FOUND');
  }

  if (notification.userId !== userId) {
    throw new AppError("You don't have access to this notification.", 403, 'FORBIDDEN');
  }

  const { data: updatedNotif, error: updateError } = await supabase
    .from('notifications')
    .update({ isRead: true })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) {
    throw new AppError('Failed to update notification status.', 500, 'DATABASE_ERROR');
  }

  return updatedNotif;
};

/**
 * Mark all notifications as read for a user.
 */
const markAllAsRead = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ isRead: true })
    .eq('userId', userId)
    .eq('isRead', false);

  if (error) {
    throw new AppError('Failed to mark all notifications as read.', 500, 'DATABASE_ERROR');
  }

  return data;
};

/**
 * Get count of unread notifications.
 */
const getUnreadCount = async (userId) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('userId', userId)
    .eq('isRead', false);

  if (error) {
    throw new AppError('Failed to get unread count.', 500, 'DATABASE_ERROR');
  }

  return { count: count || 0 };
};

/**
 * Delete a notification.
 */
const deleteNotification = async (id, userId) => {
  const { data: notification, error: findError } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (findError || !notification) {
    throw new AppError('Notification not found.', 404, 'NOT_FOUND');
  }

  if (notification.userId !== userId) {
    throw new AppError("You don't have access to delete this notification.", 403, 'FORBIDDEN');
  }

  const { error: deleteError } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);

  if (deleteError) {
    throw new AppError('Failed to delete notification.', 500, 'DATABASE_ERROR');
  }

  return { deleted: true };
};

module.exports = {
  create,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
};
