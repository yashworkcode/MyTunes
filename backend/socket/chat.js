const Message = require('../models/Message');
const { encrypt, decrypt } = require('../utils/encryption');
const { createNotification } = require('../utils/notifications');

/**
 * Handles all real-time chat socket events
 */
const chatHandler = (io, socket) => {
  const user = socket.user;

  // ── Send message ─────────────────────────────────────
  socket.on('send_message', async (data) => {
    try {
      const { recipientId, content, sharedSong } = data;
      if (!recipientId || !content?.trim()) return;

      // Encrypt
      const { ciphertext, iv, authTag } = encrypt(content.trim());

      const message = await Message.create({
        sender:    user._id,
        recipient: recipientId,
        content:   ciphertext,
        iv, authTag,
        sharedSong: sharedSong || null,
      });

      await message.populate([
        { path: 'sender',     select: 'username displayName avatar' },
        { path: 'sharedSong', select: 'title artist coverUrl audioUrl' },
      ]);

      // Decrypted payload for both parties
      const payload = {
        ...message.toObject(),
        content,   // plaintext
        iv: undefined, authTag: undefined,
      };

      // Deliver to recipient
      io.to(`user:${recipientId}`).emit('receive_message', payload);

      // Confirm to sender
      socket.emit('message_sent', payload);

      // Push notification if recipient is offline or in different room
      await createNotification(io, {
        recipientId,
        senderId: user._id,
        type:     'new_message',
        message:  `${user.username}: ${content.slice(0, 60)}`,
        refModel: 'Message',
        refId:    message._id,
      });

    } catch (err) {
      socket.emit('error', { event: 'send_message', message: err.message });
    }
  });

  // ── Typing indicators ────────────────────────────────
  socket.on('typing_start', ({ recipientId }) => {
    io.to(`user:${recipientId}`).emit('user_typing', {
      userId:   user._id,
      username: user.username,
    });
  });

  socket.on('typing_stop', ({ recipientId }) => {
    io.to(`user:${recipientId}`).emit('user_stopped_typing', {
      userId: user._id,
    });
  });

  // ── Mark messages as read ────────────────────────────
  socket.on('mark_read', async ({ senderId }) => {
    try {
      await Message.updateMany(
        { sender: senderId, recipient: user._id, read: false },
        { read: true, readAt: new Date() }
      );
      // Notify the other person their messages were read
      io.to(`user:${senderId}`).emit('message_read', {
        by:         user._id,
        threadWith: user._id,
        readAt:     new Date(),
      });
    } catch (err) {
      console.error('mark_read error:', err.message);
    }
  });
};

module.exports = chatHandler;
