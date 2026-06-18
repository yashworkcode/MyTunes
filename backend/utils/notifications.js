const Notification = require('../models/Notification');

/**
 * Create a notification and emit it via Socket.io
 * @param {Object} io          - Socket.io server instance
 * @param {Object} params
 * @param {string} params.recipientId
 * @param {string} params.senderId
 * @param {string} params.type
 * @param {string} params.message
 * @param {string} [params.refModel]
 * @param {string} [params.refId]
 */
const createNotification = async (io, { recipientId, senderId, type, message, refModel = null, refId = null }) => {
  try {
    // Don't notify yourself
    if (recipientId.toString() === senderId.toString()) return;

    const notification = await Notification.create({
      recipient: recipientId,
      sender:    senderId,
      type,
      message,
      refModel,
      refId,
    });

    const populated = await notification.populate('sender', 'username avatar displayName');

    // Emit in real-time if recipient is online
    if (io) {
      io.to(`user:${recipientId}`).emit('new_notification', populated);
    }

    return notification;
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

module.exports = { createNotification };
