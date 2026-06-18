const Call = require('../models/Call');

// ── POST /api/calls/initiate ─────────────────────────
const initiateCall = async (req, res, next) => {
  try {
    const { recipientId, type } = req.body;
    if (!recipientId || !['voice', 'video'].includes(type)) {
      return res.status(400).json({ success: false, error: 'recipientId and type (voice|video) required.' });
    }

    const roomId = `call_${req.user._id}_${recipientId}_${Date.now()}`;

    const call = await Call.create({
      caller: req.user._id, recipient: recipientId,
      type, status: 'initiated', roomId,
    });

    await call.populate('caller recipient', 'username displayName avatar');

    // Notify recipient in real-time
    req.io?.to(`user:${recipientId}`).emit('incoming_call', {
      callId:  call._id,
      roomId:  call.roomId,
      type:    call.type,
      caller:  call.caller,
    });

    res.status(201).json({ success: true, call });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/calls/:id/end ───────────────────────────
const endCall = async (req, res, next) => {
  try {
    const { status } = req.body;  // 'ended' | 'rejected' | 'missed'
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, error: 'Call not found.' });

    call.status  = status || 'ended';
    call.endedAt = new Date();
    if (call.startedAt) {
      call.duration = Math.round((call.endedAt - call.startedAt) / 1000);
    }
    await call.save();

    // Notify both participants
    req.io?.to(`user:${call.caller}`).emit('call_ended',   { callId: call._id, status: call.status });
    req.io?.to(`user:${call.recipient}`).emit('call_ended', { callId: call._id, status: call.status });

    res.json({ success: true, call });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/calls/history ───────────────────────────
const getCallHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const userId = req.user._id;

    const calls = await Call.find({
      $or: [{ caller: userId }, { recipient: userId }],
    })
      .populate('caller recipient', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit));

    res.json({ success: true, calls });
  } catch (err) {
    next(err);
  }
};

module.exports = { initiateCall, endCall, getCallHistory };
