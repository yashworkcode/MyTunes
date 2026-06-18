/* ╔══════════════════════════════════════════╗
   ║   MyTunes — Notifications Module         ║
   ╚══════════════════════════════════════════╝ */

const notifIcons = {
  new_message:    '💬',
  playlist_like:  '❤️',
  song_like:      '🎵',
  follow:         '👥',
  song_upload:    '⬆️',
  incoming_call:  '📞',
  missed_call:    '📵',
};

function notifItemHTML(n) {
  return `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="window.openNotification('${n._id}')">
      ${avatarHTML(n.sender, 34)}
      <div>
        <div class="notif-text">${notifIcons[n.type] || '🔔'} ${escHtml(n.message)}</div>
        <div class="notif-time">${fmtAgo(n.createdAt)} ago</div>
      </div>
    </div>`;
}

async function toggleNotifPanel() {
  const panel = qs('#notif-panel');
  const willOpen = !panel.classList.contains('open');
  panel.classList.toggle('open');
  if (willOpen) await loadNotifications();
}

async function loadNotifications() {
  const panel = qs('#notif-panel');
  const listEl = qs('#notif-list');
  listEl.innerHTML = `<div class="list-loader"><span class="spinner"></span></div>`;
  try {
    const res = await api.notifications.list();
    if (!res.notifications.length) {
      listEl.innerHTML = `<div class="empty" style="padding:24px"><big>🔔</big>No notifications yet.</div>`;
    } else {
      listEl.innerHTML = res.notifications.map(notifItemHTML).join('');
    }
    updateNotifBadge(res.unreadCount);
  } catch (err) {
    listEl.innerHTML = `<div class="empty">${escHtml(err.message)}</div>`;
  }
}

function updateNotifBadge(count) {
  const badge = qs('#notif-badge');
  if (!badge) return;
  badge.textContent = count > 9 ? '9+' : count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

window.openNotification = async function (id) {
  try {
    await api.notifications.markRead(id);
    const el = document.querySelector(`.notif-item[onclick*="${id}"]`);
    el?.classList.remove('unread');
    getSocket()?.emit('notification_read', { notificationId: id });
  } catch (_) {}
};

async function markAllNotifsRead() {
  try {
    await api.notifications.markAllRead();
    qsa('.notif-item').forEach(el => el.classList.remove('unread'));
    updateNotifBadge(0);
    getSocket()?.emit('notifications_read_all');
  } catch (err) {
    toast(err.message, true);
  }
}

function wireNotificationSocketEvents() {
  const sock = getSocket();
  if (!sock) return;

  sock.on('unread_count', ({ count }) => updateNotifBadge(count));

  sock.on('new_notification', (n) => {
    updateNotifBadge((parseInt(qs('#notif-badge')?.textContent) || 0) + 1);
    toast(`🔔 ${n.message}`);
    const listEl = qs('#notif-list');
    if (listEl && qs('#notif-panel').classList.contains('open')) {
      listEl.insertAdjacentHTML('afterbegin', notifItemHTML(n));
    }
  });
}
