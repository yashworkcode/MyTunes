const Notification = require('../models/Notification');

/**
 * Handles real-time notification socket events
 */
const notificationHandler = (io, socket) => {
  const user = socket.user;

  // ── Get unread count on connect ──────────────────────
  socket.on('get_unread_count', async () => {
    try {
      const count = await Notification.countDocuments({ recipient: user._id, read: false });
      socket.emit('unread_count', { count });
    } catch (err) {
      console.error('get_unread_count error:', err.message);
    }
  });

  // ── Mark single notification read ────────────────────
  socket.on('notification_read', async ({ notificationId }) => {
    try {
      await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: user._id },
        { read: true }
      );
      const count = await Notification.countDocuments({ recipient: user._id, read: false });
      socket.emit('unread_count', { count });
    } catch (err) {
      console.error('notification_read error:', err.message);
    }
  });

  // ── Mark all read ────────────────────────────────────
  socket.on('notifications_read_all', async () => {
    try {
      await Notification.updateMany({ recipient: user._id, read: false }, { read: true });
      socket.emit('unread_count', { count: 0 });
    } catch (err) {
      console.error('notifications_read_all error:', err.message);
    }
  });
};

module.exports = notificationHandler;
