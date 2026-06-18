const jwt  = require('jsonwebtoken');
const User = require('./models/User');

const chatHandler         = require('./socket/chat');
const callHandler         = require('./socket/calls');
const notificationHandler = require('./socket/notifications');

/**
 * Initialise Socket.io and authenticate every connection with JWT
 */
const initSocket = (io) => {

  // ── Auth middleware for every socket connection ──────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required.'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user    = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found.'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token.'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`🔌 Socket connected: ${user.username} [${socket.id}]`);

    // ── Join personal room ─────────────────────────────
    socket.join(`user:${user._id}`);

    // ── Mark user online ───────────────────────────────
    await User.findByIdAndUpdate(user._id, {
      isOnline: true,
      lastSeen: new Date(),
      socketId: socket.id,
    });

    // Broadcast online status to everyone
    socket.broadcast.emit('user_online', { userId: user._id, username: user.username });

    // ── Register event handlers ────────────────────────
    chatHandler(io, socket);
    callHandler(io, socket);
    notificationHandler(io, socket);

    // ── Disconnect ─────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${user.username}`);
      await User.findByIdAndUpdate(user._id, {
        isOnline: false,
        lastSeen: new Date(),
        socketId: '',
      });
      socket.broadcast.emit('user_offline', { userId: user._id });
    });
  });
};

module.exports = initSocket;
