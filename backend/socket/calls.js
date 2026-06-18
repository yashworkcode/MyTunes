const Call = require('../models/Call');
const { createNotification } = require('../utils/notifications');

/**
 * Handles all WebRTC signaling events for voice/video calls
 */
const callHandler = (io, socket) => {
  const user = socket.user;

  // ── Initiate a call ──────────────────────────────────
  socket.on('call_initiate', async ({ recipientId, type, roomId }) => {
    try {
      const call = await Call.create({
        caller: user._id, recipient: recipientId,
        type, status: 'ringing', roomId,
        startedAt: null,
      });

      await call.populate('caller', 'username displayName avatar');

      // Ring the recipient
      io.to(`user:${recipientId}`).emit('incoming_call', {
        callId:  call._id.toString(),
        roomId:  call.roomId,
        type:    call.type,
        caller:  call.caller,
      });

      // Notify the caller the ring was sent
      socket.emit('call_ringing', { callId: call._id.toString() });

      // Missed call timeout — 30 seconds
      setTimeout(async () => {
        const latest = await Call.findById(call._id);
        if (latest && latest.status === 'ringing') {
          latest.status  = 'missed';
          latest.endedAt = new Date();
          await latest.save();

          io.to(`user:${recipientId}`).emit('call_missed', { callId: call._id.toString() });
          socket.emit('call_missed', { callId: call._id.toString() });

          await createNotification(io, {
            recipientId,
            senderId: user._id,
            type:     'missed_call',
            message:  `Missed ${type} call from ${user.username}`,
            refModel: 'Call',
            refId:    call._id,
          });
        }
      }, 30000);

    } catch (err) {
      socket.emit('error', { event: 'call_initiate', message: err.message });
    }
  });

  // ── Answer the call ──────────────────────────────────
  socket.on('call_answer', async ({ callId, callerId }) => {
    try {
      const call = await Call.findByIdAndUpdate(callId, {
        status: 'accepted', startedAt: new Date(),
      }, { new: true });

      // Tell caller their call was answered
      io.to(`user:${callerId}`).emit('call_answered', {
        callId, roomId: call.roomId,
      });

    } catch (err) {
      socket.emit('error', { event: 'call_answer', message: err.message });
    }
  });

  // ── Reject the call ──────────────────────────────────
  socket.on('call_reject', async ({ callId, callerId }) => {
    try {
      await Call.findByIdAndUpdate(callId, { status: 'rejected', endedAt: new Date() });
      io.to(`user:${callerId}`).emit('call_rejected', { callId });
    } catch (err) {
      socket.emit('error', { event: 'call_reject', message: err.message });
    }
  });

  // ── End the call ─────────────────────────────────────
  socket.on('call_end', async ({ callId, recipientId }) => {
    try {
      const call = await Call.findById(callId);
      if (call) {
        call.status  = 'ended';
        call.endedAt = new Date();
        if (call.startedAt) call.duration = Math.round((call.endedAt - call.startedAt) / 1000);
        await call.save();
      }

      // Notify both parties
      io.to(`user:${recipientId}`).emit('call_ended', { callId });
      socket.emit('call_ended', { callId });

    } catch (err) {
      socket.emit('error', { event: 'call_end', message: err.message });
    }
  });

  // ── WebRTC Offer ─────────────────────────────────────
  socket.on('webrtc_offer', ({ recipientId, offer, callId }) => {
    io.to(`user:${recipientId}`).emit('webrtc_offer', {
      offer, callId, from: user._id,
    });
  });

  // ── WebRTC Answer ────────────────────────────────────
  socket.on('webrtc_answer', ({ callerId, answer, callId }) => {
    io.to(`user:${callerId}`).emit('webrtc_answer', {
      answer, callId, from: user._id,
    });
  });

  // ── ICE Candidates ───────────────────────────────────
  socket.on('ice_candidate', ({ recipientId, candidate }) => {
    io.to(`user:${recipientId}`).emit('ice_candidate', {
      candidate, from: user._id,
    });
  });
};

module.exports = callHandler;
