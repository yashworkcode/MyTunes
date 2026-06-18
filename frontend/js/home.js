/* ╔══════════════════════════════════════════╗
   ║   MyTunes — Home Page App Logic          ║
   ╚══════════════════════════════════════════╝ */

let navHistory = [];
let currentView = null;   // { section, data }
const ALL_SECS = ['home','all','category','favorites','search','playlists','discover','recent'];

async function initHomePage() {
  if (!requireAuth()) return;
  currentUser = Auth.getUser();
  Player.init();
  Player.onChange(onPlayerChange);

  renderUserChip();
  initSocketAndListeners();

  const view = getParam('view') || 'home';
  navigate(view, null, true);
}

function initSocketAndListeners() {
  initSocket();
  wireMessageSocketEvents();
  wireCallSocketEvents();
  wireNotificationSocketEvents();
}

function renderUserChip() {
  qs('#user-chip').innerHTML = `${avatarHTML(currentUser, 26)}<span>${escHtml(currentUser.username)}</span>`;
}

// ── NAVIGATION ────────────────────────────────────────
function navigate(section, data, replace = false) {
  if (!replace && currentView) {
    navHistory.push(currentView);
    if (navHistory.length > 30) navHistory.shift();
  }
  currentView = { section, data };
  renderCurrentView();
}

function goBack() {
  if (!navHistory.length) return;
  currentView = navHistory.pop();
  renderCurrentView();
}

function renderCurrentView() {
  ALL_SECS.forEach(s => qs('#sec-' + s)?.classList.add('hidden'));
  qsa('.si').forEach(el => el.classList.remove('active'));

  const sidebarMap = { home:'nav-home', all:'nav-all', favorites:'nav-fav', playlists:'nav-playlists', recent:'nav-recent' };
  const sbId = sidebarMap[currentView.section];
  if (sbId) qs('#' + sbId)?.classList.add('active');

  const backBtn = qs('#global-back');
  if (backBtn) backBtn.style.display = navHistory.length > 0 ? 'flex' : 'none';

  qs('#sec-' + currentView.section)?.classList.remove('hidden');

  const { section, data } = currentView;
  if (section === 'home')       renderHomeView();
  if (section === 'all')        renderAllSongsView();
  if (section === 'category')   renderCategoryView(data);
  if (section === 'favorites')  renderFavoritesView();
  if (section === 'search')     renderSearchView(data);
  if (section === 'playlists')  loadPlaylistsGrid(qs('#pl-all-grid'));
  if (section === 'discover')   renderDiscoverView();
  if (section === 'recent')     renderRecentView();
}

window.refreshCurrentView = () => renderCurrentView();

// ── HOME ──────────────────────────────────────────────
async function renderHomeView() {
  try {
    const res = await api.songs.list({ limit: 10, sort: 'newest' });
    lastQueueSongs = res.songs;
    renderSongList(qs('#recent-list'), res.songs);
  } catch (err) {
    toast(err.message, true);
  }
}

// ── ALL SONGS (infinite scroll) ──────────────────────
let allSongsPage = 1, allSongsLoading = false, allSongsDone = false;
async function renderAllSongsView() {
  allSongsPage = 1; allSongsDone = false;
  const container = qs('#all-list');
  container.innerHTML = `<div class="list-loader"><span class="spinner"></span></div>`;
  const res = await api.songs.list({ page: 1, limit: 20, sort: 'newest' });
  lastQueueSongs = res.songs;
  renderSongList(container, res.songs);
  qs('#all-count').textContent = res.total + ' songs';
  allSongsDone = res.page >= res.pages;
}
async function loadMoreAllSongs() {
  if (allSongsLoading || allSongsDone) return;
  allSongsLoading = true;
  allSongsPage++;
  const res = await api.songs.list({ page: allSongsPage, limit: 20, sort: 'newest' });
  lastQueueSongs = [...lastQueueSongs, ...res.songs];
  qs('#all-list').insertAdjacentHTML('beforeend', res.songs.map((s,i) => songRowHTML(s, lastQueueSongs.length - res.songs.length + i)).join(''));
  allSongsDone = res.page >= res.pages;
  allSongsLoading = false;
}

// ── CATEGORY ──────────────────────────────────────────
async function renderCategoryView(cat) {
  qs('#cat-title').textContent = catMeta[cat]?.label || cat;
  const container = qs('#cat-list');
  container.innerHTML = `<div class="list-loader"><span class="spinner"></span></div>`;
  const res = await api.songs.byCategory(cat, { limit: 50 });
  lastQueueSongs = res.songs;
  renderSongList(container, res.songs, { emptyIcon: catMeta[cat]?.label.split(' ')[0] || '🎵' });
}

// ── FAVORITES (liked songs) ─────────────────────────
async function renderFavoritesView() {
  const container = qs('#fav-list');
  container.innerHTML = `<div class="list-loader"><span class="spinner"></span></div>`;
  // Fetch all songs and filter client-side by likes array containing currentUser
  // (For scale, a dedicated /songs?likedBy= endpoint would be better, but this works within current API.)
  const res = await api.songs.list({ limit: 100 });
  const favs = res.songs.filter(s => s.likes?.includes(currentUser._id));
  lastQueueSongs = favs;
  qs('#fav-count').textContent = favs.length;
  renderSongList(container, favs, { emptyIcon: '❤️', emptyMsg: 'Like some songs to see them here.' });
}

// ── RECENTLY PLAYED ───────────────────────────────────
async function renderRecentView() {
  const container = qs('#recent-played-list');
  container.innerHTML = `<div class="list-loader"><span class="spinner"></span></div>`;
  try {
    const res = await api.songs.recentlyPlayed();
    lastQueueSongs = res.songs;
    renderSongList(container, res.songs, { emptyIcon: '🕘', emptyMsg: 'Nothing played yet.' });
  } catch (err) {
    container.innerHTML = `<div class="empty">${escHtml(err.message)}</div>`;
  }
}

// ── SEARCH ────────────────────────────────────────────
const handleSearchInput = debounce((q) => {
  if (!q.trim()) { if (currentView?.section === 'search') goBack(); return; }
  navigate('search', q);
}, 350);

async function renderSearchView(q) {
  if (!q) return;
  const container = qs('#search-list');
  container.innerHTML = `<div class="list-loader"><span class="spinner"></span></div>`;
  const res = await api.songs.search(q, { limit: 40 });
  lastQueueSongs = res.songs;
  qs('#search-count').textContent = res.songs.length + ' results';
  renderSongList(container, res.songs, { emptyIcon: '🔍', emptyMsg: `No songs match "${escHtml(q)}"` });
}

// ── DISCOVER USERS ────────────────────────────────────
const handleUserSearchInput = debounce(async (q) => {
  const container = qs('#discover-results');
  if (!q.trim()) { container.innerHTML = ''; return; }
  container.innerHTML = `<div class="list-loader"><span class="spinner"></span></div>`;
  try {
    const res = await api.users.search(q);
    if (!res.users.length) {
      container.innerHTML = `<div class="empty"><big>🔍</big>No users found.</div>`;
      return;
    }
    container.innerHTML = res.users.map(u => `
      <div class="user-list-item" onclick="goTo('profile.html',{id:'${u._id}'})">
        ${avatarHTML(u, 42)}
        <div class="user-list-info">
          <div class="user-list-name">${escHtml(u.username)} ${u.isOnline ? '🟢' : ''}</div>
          <div class="user-list-sub">${u.followersCount} followers · ${u.songsCount} songs</div>
        </div>
        <button class="btn btn-g btn-xs" onclick="event.stopPropagation();goTo('profile.html',{id:'${u._id}'})">View</button>
      </div>`).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty">${escHtml(err.message)}</div>`;
  }
}, 350);

function renderDiscoverView() {
  qs('#discover-results').innerHTML = '';
  qs('#discover-search-input').value = '';
}

// ── PLAYER UI SYNC ────────────────────────────────────
function onPlayerChange(type) {
  const song = Player.currentSong();
  const state = Player.getState();

  if (type === 'progress') {
    const audio = Player.audio;
    if (audio.duration) {
      const pct = (audio.currentTime / audio.duration) * 100;
      qs('#progFill').style.width = pct + '%';
      qs('#curTime').textContent  = fmtTime(audio.currentTime);
      qs('#durTime').textContent  = fmtTime(audio.duration);
    }
    return;
  }

  if (!song) return;

  qs('#pThumb').style.backgroundImage = song.coverUrl ? `url('${song.coverUrl}')` : '';
  qs('#pThumb').textContent = song.coverUrl ? '' : (song.emoji || '🎵');
  qs('#pTitle').textContent  = song.title;
  qs('#pArtist').textContent = song.artist;
  updatePlayerLikeIcon(song.likes?.includes(currentUser._id));
  updatePlayIcon(state.isPlaying);

  qsa('.song-row').forEach(row => {
    const active = row.dataset.songId === song._id;
    row.classList.toggle('playing', active);
  });
}

function updatePlayIcon(playing) {
  qs('#playIcon').innerHTML = playing
    ? `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`
    : `<path d="M8 5v14l11-7z"/>`;
}

function seekClick(e) {
  const fraction = e.offsetX / e.currentTarget.offsetWidth;
  Player.seekTo(fraction);
}

function toggleShuffleUI() {
  const on = Player.toggleShuffle();
  qsa('#shuffleBtn, #shufflePlayerBtn').forEach(el => el.classList.toggle('on', on));
  toast(on ? '🔀 Shuffle ON' : '🔀 Shuffle OFF');
}

function cycleRepeatUI() {
  const mode = Player.cycleRepeat();
  const btn = qs('#repeatBtn');
  btn.classList.toggle('on', mode > 0);
  toast(['Repeat OFF','🔁 Repeat All','🔂 Repeat One'][mode]);
}

function toggleLikeCurrentSong() {
  const song = Player.currentSong();
  if (!song) return;
  window.toggleSongLike({ stopPropagation(){} }, song._id);
}

// ── Dropdown / logout ────────────────────────────────
function toggleUserDropdown() { qs('#user-dropdown').classList.toggle('open'); }
async function doLogout() {
  try { await api.auth.logout(); } catch (_) {}
  Auth.clearToken();
  localStorage.removeItem('mt_user');
  window.location.href = 'index.html';
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-chip')) qs('#user-dropdown')?.classList.remove('open');
  if (!e.target.closest('#notif-btn') && !e.target.closest('#notif-panel')) qs('#notif-panel')?.classList.remove('open');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); Player.togglePlay(); }
  if (e.code === 'ArrowRight' && e.altKey) Player.next();
  if (e.code === 'ArrowLeft'  && e.altKey) Player.prev();
});

window.addEventListener('DOMContentLoaded', initHomePage);
