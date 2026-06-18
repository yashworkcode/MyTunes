/* ╔══════════════════════════════════════════╗
   ║   MyTunes — API Layer (all fetch calls)  ║
   ╚══════════════════════════════════════════╝ */

/* ──────────────────────────────────────────
   Backend URL config — change BACKEND_PORT if
   your Express server runs on a different port.
   ────────────────────────────────────────── */
const BACKEND_PORT = 5000;

const isLocalDev = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

// Appended /api to the production URL, and added a dynamic fallback for local testing
const API_BASE = isLocalDev 
  ? `http://localhost:${BACKEND_PORT}/api` 
  : "https://mytunes-kk3n.onrender.com/api";

const Auth = {
  getToken()   { return localStorage.getItem('mt_token'); },
  setToken(t)  { localStorage.setItem('mt_token', t); },
  clearToken() { localStorage.removeItem('mt_token'); },
  getUser()    { try { return JSON.parse(localStorage.getItem('mt_user')); } catch { return null; } },
  setUser(u)   { localStorage.setItem('mt_user', JSON.stringify(u)); },
  isLoggedIn() { return !!Auth.getToken(); },
};

/**
 * Core request function — handles JSON + multipart, auth header, error parsing
 */
async function request(method, path, { body, isFormData = false, params } = {}) {
  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams(Object.entries(params).filter(([,v]) => v !== undefined && v !== null && v !== ''));
    const qsStr = qs.toString();
    if (qsStr) url += `?${qsStr}`;
  }

  const headers = {};
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const api = {
  // ── AUTH ──────────────────────────────────────────
  auth: {
    register: (data) => request('POST', '/auth/register', { body: data }),
    login:    (data) => request('POST', '/auth/login',    { body: data }),
    me:       ()     => request('GET',  '/auth/me'),
    logout:   ()     => request('POST', '/auth/logout'),
  },

  // ── USERS ─────────────────────────────────────────
  users: {
    search:    (q, params={})       => request('GET', '/users/search', { params: { q, ...params } }),
    profile:   (id)                 => request('GET', `/users/${id}`),
    update:    (id, formData)       => request('PUT', `/users/${id}`, { body: formData, isFormData: true }),
    follow:    (id)                 => request('POST', `/users/${id}/follow`),
    unfollow:  (id)                 => request('DELETE', `/users/${id}/follow`),
    followers: (id, params={})      => request('GET', `/users/${id}/followers`, { params }),
    following: (id, params={})      => request('GET', `/users/${id}/following`, { params }),
  },

  // ── SONGS ─────────────────────────────────────────
  songs: {
    list:      (params={})    => request('GET', '/songs', { params }),
    search:    (q, params={}) => request('GET', '/songs/search', { params: { q, ...params } }),
    byCategory:(cat, params={}) => request('GET', `/songs/category/${cat}`, { params }),
    get:       (id)            => request('GET', `/songs/${id}`),
    upload:    (formData)      => request('POST', '/songs', { body: formData, isFormData: true }),
    delete:    (id)            => request('DELETE', `/songs/${id}`),
    like:      (id)            => request('POST', `/songs/${id}/like`),
    unlike:    (id)            => request('DELETE', `/songs/${id}/like`),
    logPlay:   (id)            => request('POST', `/songs/${id}/play`),
    recentlyPlayed: ()         => request('GET', '/songs/recently-played'),
  },

  // ── PLAYLISTS ─────────────────────────────────────
  playlists: {
    list:    (params={})         => request('GET', '/playlists', { params }),
    create:  (formData)          => request('POST', '/playlists', { body: formData, isFormData: true }),
    get:     (id)                => request('GET', `/playlists/${id}`),
    update:  (id, formData)      => request('PUT', `/playlists/${id}`, { body: formData, isFormData: true }),
    delete:  (id)                => request('DELETE', `/playlists/${id}`),
    addSong: (id, songId)        => request('POST', `/playlists/${id}/songs`, { body: { songId } }),
    removeSong: (id, songId)     => request('DELETE', `/playlists/${id}/songs/${songId}`),
    like:    (id)                => request('POST', `/playlists/${id}/like`),
    unlike:  (id)                => request('DELETE', `/playlists/${id}/like`),
  },

  // ── MESSAGES ──────────────────────────────────────
  messages: {
    contacts: ()              => request('GET', '/messages/contacts'),
    thread:   (userId, params={}) => request('GET', `/messages/${userId}`, { params }),
    send:     (userId, content, sharedSong) => request('POST', `/messages/${userId}`, { body: { content, sharedSong } }),
    delete:   (messageId)     => request('DELETE', `/messages/${messageId}`),
  },

  // ── CALLS ─────────────────────────────────────────
  calls: {
    initiate: (recipientId, type) => request('POST', '/calls/initiate', { body: { recipientId, type } }),
    end:      (id, status)        => request('PUT', `/calls/${id}/end`, { body: { status } }),
    history:  (params={})         => request('GET', '/calls/history', { params }),
  },

  // ── NOTIFICATIONS ─────────────────────────────────
  notifications: {
    list:      (params={}) => request('GET', '/notifications', { params }),
    markRead:  (id)         => request('PUT', `/notifications/${id}/read`),
    markAllRead: ()         => request('PUT', '/notifications/read-all'),
  },
};