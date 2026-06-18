/* ╔══════════════════════════════════════════╗
   ║   MyTunes — Shared Utilities             ║
   ╚══════════════════════════════════════════╝ */

function toast(msg, isErr = false) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('err', isErr);
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2600);
}

function escHtml(s) {
  return (s ?? '').toString()
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  return Math.floor(sec/60) + ':' + String(sec%60).padStart(2,'0');
}

function fmtAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff/60000);
  if (m < 1)  return 'now';
  if (m < 60) return m + 'm';
  const h = Math.floor(m/60);
  if (h < 24) return h + 'h';
  const d = Math.floor(h/24);
  if (d < 7)  return d + 'd';
  return new Date(ts).toLocaleDateString();
}

const AVATAR_COLORS = ['#7c6aff','#ff6ab0','#ffb84d','#22c55e','#06b6d4','#f97316','#a855f7','#ec4899'];

function avatarColor(username) {
  let h = 0;
  for (const c of (username || '?')) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/**
 * Returns inline style + content for an avatar div.
 * If user.avatar (image URL) exists, uses background-image; else initials.
 */
function avatarHTML(user, size = 36) {
  const username = user?.username || user?.displayName || '?';
  const initial  = username[0]?.toUpperCase() || '?';
  const style = `width:${size}px;height:${size}px;font-size:${Math.round(size*0.42)}px;`;
  if (user?.avatar) {
    return `<div class="avatar" style="${style}background-image:url('${escHtml(user.avatar)}')"></div>`;
  }
  return `<div class="avatar" style="${style}background:${avatarColor(username)}">${initial}</div>`;
}

function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function requireAuth() {
  if (!Auth.isLoggedIn()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function goTo(page, params = {}) {
  const qsStr = new URLSearchParams(params).toString();
  window.location.href = `${page}${qsStr ? '?' + qsStr : ''}`;
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
