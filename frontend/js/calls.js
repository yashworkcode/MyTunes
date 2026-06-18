/* ╔══════════════════════════════════════════╗
   ║   MyTunes — Voice/Video Calls (WebRTC)   ║
   ╚══════════════════════════════════════════╝ */

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

let pc = null;                 // RTCPeerConnection
let localStream = null;
let activeCall = null;         // { callId, roomId, type, otherUser, isCaller }
let callDurationTimer = null;
let callStartTime = null;
let isMuted = false;
let isVideoOff = false;

// ── Start an outgoing call ───────────────────────────
window.startCall = async function (recipientId, type) {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    });
  } catch (err) {
    toast('⚠️ Camera/Mic permission denied.', true);
    return;
  }

  const roomId = `call_${currentUser._id}_${recipientId}_${Date.now()}`;
  activeCall = { roomId, type, otherUser: dmTarget, isCaller: true };

  setupPeerConnection(recipientId);
  showCallOverlay(type, dmTarget, 'Calling…');

  const sock = getSocket();
  sock.emit('call_initiate', { recipientId, type, roomId });

  sock.once('call_ringing', ({ callId }) => {
    activeCall.callId = callId;
  });
};

// ── Incoming call handling ───────────────────────────
function wireCallSocketEvents() {
  const sock = getSocket();
  if (!sock) return;

  sock.on('incoming_call', async ({ callId, roomId, type, caller }) => {
    activeCall = { callId, roomId, type, otherUser: caller, isCaller: false };
    showIncomingCallBanner(caller, type, callId, roomId);
  });

  sock.on('call_answered', async ({ callId, roomId }) => {
    qs('#call-status-text')?.replaceChildren(document.createTextNode('Connecting…'));
    // Caller creates the offer once answered
    if (pc && activeCall?.isCaller) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sock2 = getSocket();
      sock2.emit('webrtc_offer', { recipientId: activeCall.otherUser._id, offer, callId });
    }
  });

  sock.on('call_rejected', () => {
    toast('Call declined.');
    endCallCleanup('rejected');
  });

  sock.on('call_missed', ({ callId }) => {
    if (activeCall?.callId === callId) {
      toast('No answer.');
      endCallCleanup('missed');
    }
    hideIncomingCallBanner();
  });

  sock.on('call_ended', () => {
    toast('Call ended.');
    endCallCleanup('ended');
  });

  sock.on('webrtc_offer', async ({ offer, from, callId }) => {
    if (!pc) setupPeerConnection(from);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    const sock2 = getSocket();
    sock2.emit('webrtc_answer', { callerId: from, answer, callId });
  });

  sock.on('webrtc_answer', async ({ answer }) => {
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
  });

  sock.on('ice_candidate', async ({ candidate }) => {
    if (pc && candidate) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (_) {}
    }
  });
}

function setupPeerConnection(otherUserId) {
  pc = new RTCPeerConnection(RTC_CONFIG);

  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      getSocket().emit('ice_candidate', { recipientId: otherUserId, candidate: e.candidate });
    }
  };

  pc.ontrack = (e) => {
    const remoteVideo = qs('#remoteVideo');
    if (remoteVideo) remoteVideo.srcObject = e.streams[0];
  };

  const localVideo = qs('#localVideo');
  if (localVideo) localVideo.srcObject = localStream;
}

// ── Incoming call banner ─────────────────────────────
function showIncomingCallBanner(caller, type, callId, roomId) {
  const el = qs('#incoming-call-banner');
  el.innerHTML = `
    <div class="call-banner-top">
      ${avatarHTML(caller, 44)}
      <div>
        <div class="call-banner-name">${escHtml(caller.username)}</div>
        <div class="call-banner-sub ringing-pulse">Incoming ${type} call…</div>
      </div>
    </div>
    <div class="call-banner-btns">
      <button class="call-reject" onclick="window.rejectCall('${callId}','${caller._id}')">✕ Decline</button>
      <button class="call-accept" onclick="window.acceptCall('${callId}','${caller._id}','${type}','${roomId}')">✓ Accept</button>
    </div>`;
  el.classList.add('show');
}
function hideIncomingCallBanner() {
  qs('#incoming-call-banner')?.classList.remove('show');
}

window.acceptCall = async function (callId, callerId, type, roomId) {
  hideIncomingCallBanner();
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
  } catch (err) {
    toast('⚠️ Camera/Mic permission denied.', true);
    getSocket().emit('call_reject', { callId, callerId });
    return;
  }

  setupPeerConnection(callerId);
  showCallOverlay(type, activeCall.otherUser, 'Connecting…');
  getSocket().emit('call_answer', { callId, callerId });
};

window.rejectCall = function (callId, callerId) {
  hideIncomingCallBanner();
  getSocket().emit('call_reject', { callId, callerId });
  activeCall = null;
};

// ── Call overlay UI ──────────────────────────────────
function showCallOverlay(type, otherUser, statusText) {
  const overlay = qs('#call-overlay');
  const isVideo = type === 'video';

  qs('#call-stage').innerHTML = isVideo ? `
    <video id="remoteVideo" autoplay playsinline></video>
    <video id="localVideo" autoplay playsinline muted></video>
    <div class="call-duration hidden" id="call-duration">00:00</div>
  ` : `
    <div class="voice-call-avatar">
      <div style="position:relative">
        <div class="call-pulse-ring"></div>
        ${avatarHTML(otherUser, 120)}
      </div>
      <div class="voice-call-name">${escHtml(otherUser.username)}</div>
      <div class="voice-call-status" id="call-status-text">${statusText}</div>
    </div>
    <div class="call-duration hidden" id="call-duration">00:00</div>
  `;

  qs('#call-controls').innerHTML = `
    <button class="call-ctrl-btn" id="muteBtn" onclick="window.toggleMute()" title="Mute">🎤</button>
    ${isVideo ? `<button class="call-ctrl-btn" id="videoBtn" onclick="window.toggleVideo()" title="Camera">📷</button>` : ''}
    <button class="call-ctrl-btn end-call" onclick="window.endCall()" title="End call">📞</button>
  `;

  overlay.classList.add('active');

  // start "ringing/connecting" -> once remote track arrives, start timer
  if (pc) {
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'connected' && !callStartTime) {
        startCallTimer();
      }
    });
  }
}

function startCallTimer() {
  callStartTime = Date.now();
  qs('#call-duration')?.classList.remove('hidden');
  const statusEl = qs('#call-status-text');
  if (statusEl) statusEl.textContent = 'Connected';
  callDurationTimer = setInterval(() => {
    const sec = Math.floor((Date.now() - callStartTime) / 1000);
    const el = qs('#call-duration');
    if (el) el.textContent = fmtTime(sec);
  }, 1000);
}

window.toggleMute = function () {
  if (!localStream) return;
  isMuted = !isMuted;
  localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
  qs('#muteBtn').classList.toggle('muted', isMuted);
  qs('#muteBtn').textContent = isMuted ? '🔇' : '🎤';
};

window.toggleVideo = function () {
  if (!localStream) return;
  isVideoOff = !isVideoOff;
  localStream.getVideoTracks().forEach(t => t.enabled = !isVideoOff);
  qs('#videoBtn').classList.toggle('muted', isVideoOff);
  qs('#videoBtn').textContent = isVideoOff ? '🚫' : '📷';
};

window.endCall = function () {
  if (activeCall?.otherUser) {
    getSocket().emit('call_end', { callId: activeCall.callId, recipientId: activeCall.otherUser._id });
  }
  endCallCleanup('ended');
};

function endCallCleanup() {
  qs('#call-overlay')?.classList.remove('active');
  clearInterval(callDurationTimer);
  callDurationTimer = null;
  callStartTime = null;

  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  if (pc) { pc.close(); pc = null; }
  activeCall = null;
  isMuted = false; isVideoOff = false;
}
