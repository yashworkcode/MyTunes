/* ╔══════════════════════════════════════════╗
   ║   MyTunes — Profile Page Module          ║
   ╚══════════════════════════════════════════╝ */

let profileUser = null;
let profileIsOwn = false;
let pendingAvatarFile = null, pendingProfileCoverFile = null;

async function initProfilePage() {
  if (!requireAuth()) return;
  currentUser = Auth.getUser();

  const userId = getParam('id') || currentUser._id;
  profileIsOwn = userId === currentUser._id;

  await loadProfile(userId);
  switchProfileTab('playlists');
}

async function loadProfile(userId) {
  try {
    const res = await api.users.profile(userId);
    profileUser = res.user;
    renderProfileHeader(res);
    renderProfilePlaylists(res.playlists);
    renderProfileSongs(res.songs);
  } catch (err) {
    qs('#profile-root').innerHTML = `<div class="empty"><big>😕</big>${escHtml(err.message)}</div>`;
  }
}

function renderProfileHeader(data) {
  const u = profileUser;
  qs('#profile-cover').style.backgroundImage = u.coverImage ? `url('${escHtml(u.coverImage)}')` : '';
  qs('#profile-avatar').outerHTML = avatarHTML(u, 96).replace('class="avatar"', 'class="avatar profile-avatar" id="profile-avatar"');
  qs('#profile-name').textContent = u.displayName || u.username;
  qs('#profile-username').textContent = '@' + u.username;
  qs('#profile-bio').textContent = u.bio || '';
  qs('#profile-bio').classList.toggle('hidden', !u.bio);
  qs('#stat-followers').innerHTML = `<b>${u.followersCount}</b> Followers`;
  qs('#stat-following').innerHTML = `<b>${u.followingCount}</b> Following`;
  qs('#stat-songs').innerHTML     = `<b>${u.songsCount}</b> Songs`;

  const actionsEl = qs('#profile-actions');
  if (profileIsOwn) {
    actionsEl.innerHTML = `<button class="btn btn-g btn-sm" onclick="openEditProfileModal()">✏️ Edit Profile</button>`;
  } else {
    actionsEl.innerHTML = `
      <button class="btn ${data.isFollowing ? 'btn-g' : 'btn-p'} btn-sm" id="follow-btn" onclick="toggleFollow()">
        ${data.isFollowing ? 'Following' : '+ Follow'}
      </button>
      <button class="btn btn-g btn-sm" onclick="goTo('messages.html', {with:'${u._id}'})">💬 Message</button>`;
  }
}

function renderProfilePlaylists(playlists) {
  const el = qs('#profile-playlists-grid');
  if (!playlists?.length) {
    el.innerHTML = `<div class="empty" style="padding:20px 0"><big>📋</big>No public playlists yet.</div>`;
    return;
  }
  el.innerHTML = playlists.map(playlistCardHTML).join('');
}

function renderProfileSongs(songs) {
  lastQueueSongs = songs || [];
  const el = qs('#profile-songs-list');
  renderSongList(el, songs, { emptyIcon: '🎵', emptyMsg: 'No songs uploaded yet.' });
}

function switchProfileTab(tab) {
  qsa('.profile-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  qsa('.profile-tab-panel').forEach(p => p.classList.toggle('hidden', p.dataset.tab !== tab));
}

async function toggleFollow() {
  const btn = qs('#follow-btn');
  const isFollowing = btn.textContent.trim() === 'Following';
  try {
    if (isFollowing) {
      await api.users.unfollow(profileUser._id);
      btn.textContent = '+ Follow';
      btn.classList.replace('btn-g', 'btn-p');
      profileUser.followersCount--;
    } else {
      await api.users.follow(profileUser._id);
      btn.textContent = 'Following';
      btn.classList.replace('btn-p', 'btn-g');
      profileUser.followersCount++;
      toast(`✅ Following ${profileUser.username}`);
    }
    qs('#stat-followers').innerHTML = `<b>${profileUser.followersCount}</b> Followers`;
  } catch (err) {
    toast(err.message, true);
  }
}

// ── Edit profile modal ───────────────────────────────
function openEditProfileModal() {
  qs('#edit-displayName').value = profileUser.displayName || '';
  qs('#edit-username').value = profileUser.username;
  qs('#edit-bio').value = profileUser.bio || '';
  qs('#modal-edit-profile').classList.add('open');
}
function closeEditProfileModal() {
  qs('#modal-edit-profile').classList.remove('open');
  pendingAvatarFile = null; pendingProfileCoverFile = null;
}
function handleAvatarSelect(input) { pendingAvatarFile = input.files[0] || null; }
function handleProfileCoverSelect(input) { pendingProfileCoverFile = input.files[0] || null; }

async function submitEditProfile() {
  const fd = new FormData();
  fd.append('displayName', qs('#edit-displayName').value.trim());
  fd.append('username', qs('#edit-username').value.trim());
  fd.append('bio', qs('#edit-bio').value.trim());
  if (pendingAvatarFile) fd.append('avatar', pendingAvatarFile);
  if (pendingProfileCoverFile) fd.append('cover', pendingProfileCoverFile);

  try {
    const res = await api.users.update(currentUser._id, fd);
    Auth.setUser(res.user);
    toast('✅ Profile updated!');
    closeEditProfileModal();
    location.reload();
  } catch (err) {
    toast(err.message, true);
  }
}
