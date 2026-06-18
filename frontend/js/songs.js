/* ╔══════════════════════════════════════════╗
   ║   MyTunes — Songs Module                 ║
   ╚══════════════════════════════════════════╝ */

const catMeta = {
  romantic:{label:'💕 Romantic'},   sad:{label:'💔 Sad Songs'},
  old:{label:'🕰 Old Classics'},    hindi:{label:'🇮🇳 Hindi'},
  english:{label:'🇬🇧 English'},    party:{label:'🎉 Party'},
  devotional:{label:'🙏 Devotional'}, folk:{label:'🪗 Folk'}, pop:{label:'✨ Pop / New'},
  other:{label:'🎵 Other'},
};

let currentUser = null;
let pendingFile = null, pendingCoverFile = null;
let lastQueueSongs = [];

function songRowHTML(song, index, opts = {}) {
  const active   = Player.currentSong()?._id === song._id;
  const playing  = active && Player.getState().isPlaying;
  const liked    = song.likes?.includes(currentUser?._id);
  const cover    = song.coverUrl
    ? `<div class="sthumb" style="background-image:url('${escHtml(song.coverUrl)}')"></div>`
    : `<div class="sthumb">${song.emoji || '🎵'}</div>`;
  const numContent = playing
    ? `<span style="color:var(--accent);font-size:14px">▶</span>`
    : `<span>${index + 1}</span>`;
  const uploaderName = song.uploadedBy?.username || 'unknown';
  const uploader = `<a href="profile.html?id=${song.uploadedBy?._id}" class="uploader-badge" onclick="event.stopPropagation()">👤 ${escHtml(uploaderName)}</a>`;
  const plBtn = opts.inPlaylist
    ? `<div class="sadd-pl" title="Remove from playlist" onclick="window.removeFromPlaylist(event,'${opts.plId}','${song._id}')">✕</div>`
    : `<div class="sadd-pl" title="Add to playlist" onclick="window.openAddToPlaylist(event,'${song._id}')">＋</div>`;

  return `
    <div class="song-row ${active ? 'playing' : ''}" data-song-id="${song._id}" onclick="window.playSongFromList('${song._id}')">
      <div class="snum">${numContent}</div>
      ${cover}
      <div class="sinfo">
        <div class="st">${escHtml(song.title)}</div>
        <div class="sa">${escHtml(song.artist)} ${uploader}</div>
      </div>
      <div class="salb">${escHtml(song.album || '—')}</div>
      <div class="sdur">${fmtTime(song.duration)}</div>
      <div class="slike ${liked ? 'liked' : ''}" onclick="window.toggleSongLike(event,'${song._id}')">${liked ? '♥' : '♡'}</div>
      ${plBtn}
    </div>`;
}

function renderSongList(container, songs, opts = {}) {
  if (!songs?.length) {
    container.innerHTML = `<div class="empty"><big>${opts.emptyIcon || '🎵'}</big>${opts.emptyMsg || 'No songs here yet.'}</div>`;
    return;
  }
  container.innerHTML = songs.map((s, i) => songRowHTML(s, i, opts)).join('');
}

// ── Play a song from any rendered list ──────────────
window.playSongFromList = function (songId) {
  const idx = lastQueueSongs.findIndex(s => s._id === songId);
  if (idx === -1) return;
  Player.setQueue(lastQueueSongs, idx);
};

// ── Like toggle ──────────────────────────────────────
window.toggleSongLike = async function (e, songId) {
  e.stopPropagation();
  if (!Auth.isLoggedIn()) { toast('⚠️ Please log in to like songs!', true); return; }
  try {
    const res = await api.songs.like(songId);
    // Update UI
    qsa(`[data-song-id="${songId}"] .slike`).forEach(el => {
      el.textContent = res.liked ? '♥' : '♡';
      el.classList.toggle('liked', res.liked);
    });
    if (Player.currentSong()?._id === songId) updatePlayerLikeIcon(res.liked);
    toast(res.liked ? '❤️ Liked!' : '💔 Removed from likes');
  } catch (err) {
    toast(err.message, true);
  }
};

function updatePlayerLikeIcon(liked) {
  const el = qs('#pLike');
  if (!el) return;
  el.textContent = liked ? '♥' : '♡';
  el.classList.toggle('liked', liked);
}

// ── Add Song Form ────────────────────────────────────
function toggleAddForm() {
  qs('#addForm').classList.toggle('open');
}

function handleAudioSelect(input) {
  const file = input.files[0];
  if (!file) return;
  pendingFile = file;
  const titleField = qs('#f-title');
  if (!titleField.value.trim()) titleField.value = file.name.replace(/\.[^.]+$/, '');
}
function handleCoverSelect(input) {
  pendingCoverFile = input.files[0] || null;
}

async function submitAddSong() {
  if (!Auth.isLoggedIn()) { toast('⚠️ Please log in first!', true); return; }
  const title  = qs('#f-title').value.trim();
  const artist = qs('#f-artist').value.trim();
  const cat    = qs('#f-cat').value;

  if (!title || !artist) { toast('⚠️ Title and Artist are required!', true); return; }
  if (!pendingFile)       { toast('⚠️ Please choose an MP3 file!', true); return; }

  const fd = new FormData();
  fd.append('title', title);
  fd.append('artist', artist);
  fd.append('album', qs('#f-album').value.trim());
  fd.append('category', cat);
  fd.append('emoji', qs('#f-emoji').value.trim() || '🎵');
  fd.append('audio', pendingFile);
  if (pendingCoverFile) fd.append('cover', pendingCoverFile);

  const btn = qs('#add-song-btn');
  btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Uploading…`;

  try {
    await api.songs.upload(fd);
    toast(`✅ "${title}" uploaded!`);
    ['f-title','f-artist','f-album','f-emoji'].forEach(id => qs('#'+id).value = '');
    qs('#f-audio').value = ''; qs('#f-cover').value = '';
    pendingFile = null; pendingCoverFile = null;
    toggleAddForm();
    if (window.refreshCurrentView) window.refreshCurrentView();
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false; btn.innerHTML = 'Upload Song';
  }
}
