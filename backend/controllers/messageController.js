const Message  = require('../models/Message');
const User     = require('../models/User');
const { encrypt, decrypt } = require('../utils/encryption');

// ── GET /api/messages/contacts ───────────────────────
// Returns all users this person has a conversation with
const getContacts = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const msgs = await Message.aggregate([
      { $match: { $or: [{ sender: userId }, { recipient: userId }] } },
      { $sort:  { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $lt: ['$sender', '$recipient'] },
              { a: '$sender', b: '$recipient' },
              { a: '$recipient', b: '$sender' }],
          },
          lastMsg:   { $first: '$$ROOT' },
          unreadCount: { $sum: { $cond: [{ $and: [{ $eq: ['$recipient', userId] }, { $eq: ['$read', false] }] }, 1, 0] } },
        },
      },
      { $sort: { 'lastMsg.createdAt': -1 } },
    ]);

    // Get the other person in each conversation
    const contacts = await Promise.all(
      msgs.map(async (m) => {
        const otherId = m.lastMsg.sender.toString() === userId.toString()
          ? m.lastMsg.recipient : m.lastMsg.sender;
        const other = await User.findById(otherId).select('username displayName avatar isOnline lastSeen');

        // Decrypt last message preview
        let preview = '';
        try {
          preview = decrypt(m.lastMsg.content, m.lastMsg.iv, m.lastMsg.authTag);
          if (preview.length > 60) preview = preview.slice(0, 60) + '…';
        } catch (_) { preview = '[message]'; }

        return { user: other, lastMessage: { ...m.lastMsg, preview }, unreadCount: m.unreadCount };
      })
    );

    res.json({ success: true, contacts });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/messages/:userId ────────────────────────
const getThread = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const otherId = req.params.userId;
    const myId    = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: myId,    recipient: otherId, deletedBySender:    false },
        { sender: otherId, recipient: myId,    deletedByRecipient: false },
      ],
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit))
      .populate('sender',     'username displayName avatar')
      .populate('recipient',  'username displayName avatar')
      .populate('sharedSong', 'title artist coverUrl audioUrl');

    // Mark as read
    await Message.updateMany(
      { sender: otherId, recipient: myId, read: false },
      { read: true, readAt: new Date() }
    );

    // Decrypt each message
    const decrypted = messages.reverse().map(m => {
      const obj = m.toObject();
      try {
        obj.content = decrypt(m.content, m.iv, m.authTag);
      } catch (_) {
        obj.content = '[decryption failed]';
      }
      delete obj.iv;
      delete obj.authTag;
      return obj;
    });

    // Emit read receipt via socket
    req.io?.to(`user:${otherId}`).emit('message_read', { by: myId, threadWith: myId });

    res.json({ success: true, messages: decrypted });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/messages/:userId ───────────────────────
const sendMessage = async (req, res, next) => {
  try {
    const { content, sharedSong } = req.body;
    const recipientId = req.params.userId;

    const recipient = await User.findById(recipientId);
    if (!recipient) return res.status(404).json({ success: false, error: 'User not found.' });

    // Encrypt message
    const { ciphertext, iv, authTag } = encrypt(content);

    const message = await Message.create({
      sender:    req.user._id,
      recipient: recipientId,
      content:   ciphertext,
      iv, authTag,
      sharedSong: sharedSong || null,
    });

    const populated = await message.populate([
      { path: 'sender',    select: 'username displayName avatar' },
      { path: 'sharedSong', select: 'title artist coverUrl audioUrl' },
    ]);

    // Return decrypted to the sender for immediate display
    const obj         = populated.toObject();
    obj.content       = content;   // original plaintext for sender
    delete obj.iv;
    delete obj.authTag;

    // Real-time delivery via socket
    req.io?.to(`user:${recipientId}`).emit('receive_message', obj);

    res.status(201).json({ success: true, message: obj });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/messages/:messageId ─────────────────
const deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ success: false, error: 'Message not found.' });

    const myId = req.user._id.toString();
    if (message.sender.toString() === myId)    message.deletedBySender    = true;
    if (message.recipient.toString() === myId) message.deletedByRecipient = true;

    if (message.deletedBySender && message.deletedByRecipient) {
      await message.deleteOne();
    } else {
      await message.save();
    }

    res.json({ success: true, message: 'Message deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getContacts, getThread, sendMessage, deleteMessage };
