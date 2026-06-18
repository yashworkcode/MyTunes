const Notification = require('../models/Notification');

// ── GET /api/notifications ───────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user._id })
        .populate('sender', 'username displayName avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(Number(limit)),
      Notification.countDocuments({ recipient: req.user._id, read: false }),
    ]);

    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/notifications/:id/read ─────────────────
const markRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/notifications/read-all ─────────────────
const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markRead, markAllRead };
