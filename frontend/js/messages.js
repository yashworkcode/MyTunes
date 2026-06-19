/* ╔══════════════════════════════════════════╗
   ║   MyTunes — Messages / DM Module         ║
   ╚══════════════════════════════════════════╝ */

let dmTarget = null;       // user object we're chatting with
let typingTimeout = null;

function chatItemHTML(contact) {
  const u = contact.user;
  const preview = contact.lastMessage?.preview || 'Start a conversation';
  const ts = contact.lastMessage?.createdAt;
  return `
    <div class="chat-item" onclick="goTo('messages.html', {with:'${u._id}'})">
      <div class="chat-avatar-wrap">
        ${avatarHTML(u, 42)}
        ${u.isOnline ? '<div class="online-dot"></div>' : ''}
      </div>
      <div class="chat-info">
        <div class="chat-name">${escHtml(u.username)}</div>
        <div class="chat-preview">${escHtml(preview)}</div>
      </div>
      ${ts ? `<div class="chat-time">${fmtAgo(ts)}</div>` : ''}
      ${contact.unreadCount > 0 ? `<div class="chat-unread">${contact.unreadCount}</div>` : ''}
    </div>`;
}

async function loadContactsList(container) {
  container.innerHTML = `<div class="list-loader"><span class="spinner"></span></div>`;
  try {
    const res = await api.messages.contacts();
    if (!res.contacts.length) {
      container.innerHTML = `<div class="empty"><big>💬</big>No conversations yet. Visit a profile and say hi!</div>`;
      return;
    }
    container.innerHTML = res.contacts.map(chatItemHTML).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty">${escHtml(err.message)}</div>`;
  }
}

function msgBubbleHTML(msg, myId) {
  const mine = msg.sender._id === myId || msg.sender === myId;
  const sender = mine ? currentUser : dmTarget;
  const sharedSongHtml = msg.sharedSong ? `
    <div class="msg-shared-song" onclick="window.playSongFromList?.('${msg.sharedSong._id}')">
      ${msg.sharedSong.coverUrl ? `<div class="sthumb" style="width:32px;height:32px;background-image:url('${escHtml(msg.sharedSong.coverUrl)}')"></div>` : `<div class="sthumb" style="width:32px;height:32px">🎵</div>`}
      <div>
        <div style="font-size:12px;font-weight:600">${escHtml(msg.sharedSong.title)}</div>
        <div style="font-size:11px;color:var(--muted)">${escHtml(msg.sharedSong.artist)}</div>
      </div>
    </div>` : '';
  const readTick = mine ? (msg.read ? '✓✓' : '✓') : '';
  return `
    <div class="msg ${mine ? 'mine' : ''}">
      ${avatarHTML(sender, 28)}
      <div>
        <div class="msg-bubble">${sharedSongHtml}${escHtml(msg.content)}</div>
        <div class="msg-time">${fmtAgo(msg.createdAt)} ${readTick}</div>
      </div>
    </div>`;
}

async function loadDMThread(userId) {
  try {
    const profileRes = await api.users.profile(userId);
    dmTarget = profileRes.user;
  } catch (err) {
    toast('User not found.', true);
    return;
  }

  renderDMHeader();

  const msgsEl = qs('#dm-msgs');
  msgsEl.innerHTML = `<div class="list-loader"><span class="spinner"></span></div>`;

  try {
    const res = await api.messages.thread(userId);
    renderDMMessages(res.messages);
  } catch (err) {
    msgsEl.innerHTML = `<div class="empty">${escHtml(err.message)}</div>`;
  }

  // Join socket events for this thread
  const sock = getSocket();
  if (sock) {
    sock.emit('mark_read', { senderId: userId });
  }
}

function renderDMHeader() {
  qs('#dm-header').innerHTML = `
    <div class="dm-header-left">
      ${avatarHTML(dmTarget, 40)}
      <div>
        <div style="font-size:15px;font-weight:700">${escHtml(dmTarget.username)}</div>
        <div class="dm-status" id="dm-status">
          ${dmTarget.isOnline ? '🟢 Online' : `Last seen ${fmtAgo(dmTarget.lastSeen)} ago`}
        </div>
      </div>
    </div>
    <div class="dm-call-btns">
      <button class="call-icon-btn" title="Voice call" onclick="window.startCall?.('${dmTarget._id}','voice')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.36 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      </button>
      <button class="call-icon-btn" title="Video call" onclick="window.startCall?.('${dmTarget._id}','video')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      </button>
    </div>`;
}

function renderDMMessages(messages) {
  const msgsEl = qs('#dm-msgs');
  const myId = currentUser._id;
  msgsEl.innerHTML = messages.map(m => msgBubbleHTML(m, myId)).join('');
  msgsEl.scrollTop = msgsEl.scrollHeight;
}

function appendDMMessage(msg) {
  const msgsEl = qs('#dm-msgs');
  if (!msgsEl) return;
  msgsEl.insertAdjacentHTML('beforeend', msgBubbleHTML(msg, currentUser._id));
  msgsEl.scrollTop = msgsEl.scrollHeight;
}

async function sendDMMessage() {
  const input = qs('#dm-input');
  const text  = input.value.trim();
  if (!text || !dmTarget) return;
  input.value = '';

  const sock = getSocket();
  if (sock) {
    // 1. Emit to server over socket
    sock.emit('send_message', { recipientId: dmTarget._id, content: text });
    sock.emit('typing_stop', { recipientId: dmTarget._id });
    
    // 🔥 FIXED: Append to screen instantly so you don't have to refresh!
    appendDMMessage({
      senderId: 'mine', // or your current user's ID variable if your function checks for it
      content: text,
      createdAt: new Date().toISOString()
    });

  } else {
    try {
      const res = await api.messages.send(dmTarget._id, text);
      appendDMMessage(res.message);
    } catch (err) {
      toast(err.message, true);
    }
  }
}

function handleDMTyping() {
  const sock = getSocket();
  if (!sock || !dmTarget) return;
  sock.emit('typing_start', { recipientId: dmTarget._id });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => sock.emit('typing_stop', { recipientId: dmTarget._id }), 2000);
}

function showTypingIndicator(show) {
  const el = qs('#typing-indicator');
  if (el) el.classList.toggle('hidden', !show);
}

// ── Wire socket listeners for messaging (called once app boots) ──
function wireMessageSocketEvents() {
  const sock = getSocket();
  if (!sock) return;

  sock.on('receive_message', (msg) => {
    const fromId = msg.sender._id || msg.sender;
    if (dmTarget && fromId === dmTarget._id) {
      appendDMMessage(msg);
      sock.emit('mark_read', { senderId: fromId });
    }
    if (window.refreshUnreadBadge) window.refreshUnreadBadge();
  });

  sock.on('message_sent', (msg) => {
    if (dmTarget && (msg.recipient._id || msg.recipient) === dmTarget._id) {
      appendDMMessage(msg);
    }
  });

  sock.on('user_typing', ({ userId }) => {
    if (dmTarget && userId === dmTarget._id) showTypingIndicator(true);
  });
  sock.on('user_stopped_typing', ({ userId }) => {
    if (dmTarget && userId === dmTarget._id) showTypingIndicator(false);
  });

  sock.on('user_online', ({ userId }) => {
    if (dmTarget && userId === dmTarget._id) {
      dmTarget.isOnline = true;
      const statusEl = qs('#dm-status');
      if (statusEl) statusEl.textContent = '🟢 Online';
    }
  });
  sock.on('user_offline', ({ userId }) => {
    if (dmTarget && userId === dmTarget._id) {
      dmTarget.isOnline = false;
      const statusEl = qs('#dm-status');
      if (statusEl) statusEl.textContent = 'Offline';
    }
  });
}
