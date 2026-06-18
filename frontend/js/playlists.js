/* ╔══════════════════════════════════════════╗
   ║   MyTunes — Playlists Module             ║
   ╚══════════════════════════════════════════╝ */

let pendingSongForPlaylist = null;
let pendingPlaylistCoverFile = null;

function playlistCardHTML(pl) {
  const count = pl.songs?.length ?? 0;
  const cover = pl.coverUrl
    ? `<div class="playlist-cover" style="background-image:url('${escHtml(pl.coverUrl)}')"></div>`
    : `<div class="playlist-cover">${pl.emoji || '🎵'}</div>`;
  return `
    <div class="playlist-card" onclick="goTo('playlist.html', {id:'${pl._id}'})">
      ${cover}
      <div class="playlist-name">${escHtml(pl.name)}</div>
      <div class="playlist-meta">
        <span>${count} song${count !== 1 ? 's' : ''}</span>
        ${pl.visibility === 'private' ? '<span class="lock-badge">🔒</span>' : ''}
        <span>❤️ ${pl.likesCount || 0}</span>
      </div>
      <div class="playlist-creator">
        ${avatarHTML(pl.owner, 16)}
        ${escHtml(pl.owner?.username || '')}
      </div>
    </div>`;
}

async function loadPlaylistsGrid(container, params = {}) {
  container.innerHTML = `<div class="list-loader"><span class="spinner"></span></div>`;
  try {
    const res = await api.playlists.list(params);
    if (!res.playlists.length) {
      container.innerHTML = `<div class="empty" style="padding:20px 0"><big>🎵</big>No playlists yet.</div>`;
      return;
    }
    container.innerHTML = res.playlists.map(playlistCardHTML).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty">${escHtml(err.message)}</div>`;
  }
}

function openCreatePlaylistModal() {
  if (!Auth.isLoggedIn()) { toast('⚠️ Please log in first!', true); return; }
  qs('#modal-create-pl').classList.add('open');
}
function closeCreatePlaylistModal() {
  qs('#modal-create-pl').classList.remove('open');
  qs('#pl-name').value = ''; qs('#pl-desc').value = ''; qs('#pl-emoji-input').value = '';
  qs('#pl-cover-input').value = '';
  pendingPlaylistCoverFile = null;
}
function handlePlaylistCoverSelect(input) {
  pendingPlaylistCoverFile = input.files[0] || null;
}

async function submitCreatePlaylist() {
  const name = qs('#pl-name').value.trim();
  if (!name) { toast('⚠️ Enter a playlist name!', true); return; }

  const fd = new FormData();
  fd.append('name', name);
  fd.append('description', qs('#pl-desc').value.trim());
  fd.append('visibility', qs('#pl-visibility').value);
  fd.append('emoji', qs('#pl-emoji-input').value.trim() || '🎵');
  if (pendingPlaylistCoverFile) fd.append('cover', pendingPlaylistCoverFile);

  try {
    const res = await api.playlists.create(fd);
    toast(`✅ Playlist "${name}" created!`);
    closeCreatePlaylistModal();
    goTo('playlist.html', { id: res.playlist._id });
  } catch (err) {
    toast(err.message, true);
  }
}

// ── Add-to-playlist modal ────────────────────────────
window.openAddToPlaylist = async function (e, songId) {
  e.stopPropagation();
  if (!Auth.isLoggedIn()) { toast('⚠️ Please log in!', true); return; }
  pendingSongForPlaylist = songId;

  const listEl = qs('#add-to-pl-list');
  listEl.innerHTML = `<div class="list-loader"><span class="spinner"></span></div>`;
  qs('#modal-add-to-pl').classList.add('open');

  try {
    const res = await api.playlists.list({ owner: currentUser._id });
    if (!res.playlists.length) {
      listEl.innerHTML = `<div class="empty" style="padding:16px 0"><big>🎵</big>No playlists yet! <a href="#" onclick="closeAddToPlaylistModal();openCreatePlaylistModal();return false" style="color:var(--accent)">Create one</a></div>`;
      return;
    }
    listEl.innerHTML = res.playlists.map(pl => `
      <div class="chat-item" onclick="window.addSongToPlaylistConfirm('${pl._id}')">
        ${pl.coverUrl ? `<div class="sthumb" style="background-image:url('${escHtml(pl.coverUrl)}')"></div>` : `<div class="sthumb">${pl.emoji||'🎵'}</div>`}
        <div class="chat-info">
          <div class="chat-name">${escHtml(pl.name)}</div>
          <div class="chat-preview">${pl.songs?.length || 0} songs</div>
        </div>
      </div>`).join('');
  } catch (err) {
    listEl.innerHTML = `<div class="empty">${escHtml(err.message)}</div>`;
  }
};
function closeAddToPlaylistModal() {
  qs('#modal-add-to-pl').classList.remove('open');
  pendingSongForPlaylist = null;
}
window.addSongToPlaylistConfirm = async function (plId) {
  if (!pendingSongForPlaylist) return;
  try {
    await api.playlists.addSong(plId, pendingSongForPlaylist);
    toast('✅ Added to playlist!');
    closeAddToPlaylistModal();
  } catch (err) {
    toast(err.message, true);
  }
};

window.removeFromPlaylist = async function (e, plId, songId) {
  e.stopPropagation();
  try {
    await api.playlists.removeSong(plId, songId);
    toast('Removed from playlist');
    if (window.refreshCurrentView) window.refreshCurrentView();
  } catch (err) {
    toast(err.message, true);
  }
};

async function togglePlaylistLike(plId, btn) {
  try {
    const res = await api.playlists.like(plId);
    btn.textContent = res.liked ? `❤️ ${res.likesCount}` : `🤍 ${res.likesCount}`;
    btn.classList.toggle('btn-o', res.liked);
  } catch (err) {
    toast(err.message, true);
  }
}

async function deletePlaylistConfirm(plId) {
  if (!confirm('Delete this playlist? This cannot be undone.')) return;
  try {
    await api.playlists.delete(plId);
    toast('🗑️ Playlist deleted');
    goTo('home.html', { view: 'playlists' });
  } catch (err) {
    toast(err.message, true);
  }
}
