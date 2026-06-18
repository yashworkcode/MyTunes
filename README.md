# ♪ MyTunes — Full-Stack Music Sharing Platform

A production-ready social music platform: upload songs, build playlists, follow other users, message them in real time (E2E encrypted), and make voice/video calls — all with a vanilla HTML/CSS/JS frontend and a Node.js/Express/MongoDB backend.

---

## ⚡ Quick Start (read this first)

**Do not serve or open the project root folder.** Serving the root just shows you a file listing (`backend/`, `frontend/`, `README.md`) — there's no app there.

The actual app entry point is:
```
frontend/pages/index.html
```

### Fastest way to run it:

```bash
# Terminal 1 — backend
cd backend
npm install
cp .env.example .env        # then fill in MONGO_URI, CLOUDINARY_*, etc. (see below)
npm run dev                 # starts on http://localhost:5000

# Terminal 2 — frontend
cd frontend
npx serve .                 # serves on http://localhost:3000 by default
```

Then open the URL `npx serve` prints — it will land on a directory listing for `frontend/`; click into `pages/index.html` (or go straight to `http://localhost:3000/pages/index.html`).

If you're using **VSCode Live Server**, right-click `frontend/pages/index.html` specifically and choose "Open with Live Server" — don't right-click the project root or the `frontend` folder itself.

**Whatever port your frontend ends up on, make sure `CLIENT_URL` in `backend/.env` matches it exactly**, or the browser will block API calls with a CORS error. (The server now auto-allows common dev ports — 3000, 5500, 8000, 8080, 5173 — as a safety net, but production deployments must set `CLIENT_URL` correctly.)

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js + Express |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT + bcrypt |
| File Storage | Cloudinary (audio + images) |
| Real-time | Socket.io |
| Calls | WebRTC (signaled over Socket.io) |
| Encryption | AES-256-GCM for message content |

---

## 📁 Project Structure

```
mytunes-fullstack/
├── backend/
│   ├── config/        → db.js, cloudinary.js
│   ├── models/         → User, Song, Playlist, Message, Call, Notification, Follower
│   ├── controllers/    → business logic for every resource
│   ├── routes/         → Express route definitions
│   ├── middleware/     → auth, upload, validate, rateLimiter, errorHandler
│   ├── utils/           → generateToken, encryption, notifications
│   ├── socket/          → chat.js, calls.js, notifications.js (Socket.io handlers)
│   ├── socket.js        → Socket.io bootstrap + JWT auth middleware
│   ├── server.js        → Express + Socket.io entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── pages/    → index.html (login), home.html, profile.html, playlist.html, messages.html
    ├── css/      → global.css, auth.css, app.css, calls.css
    ├── js/       → api.js, utils.js, auth.js, socket.js, player.js, songs.js,
    │               playlists.js, messages.js, calls.js, notifications.js,
    │               profile.js, home.js
    └── assets/
```

---

## 🚀 Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, CLOUDINARY_* , ENCRYPTION_KEY, CLIENT_URL
npm run dev
```

The server starts on `http://localhost:5000`.

### 2. MongoDB Atlas

1. Create a free cluster at https://cloud.mongodb.com
2. Create a database user + allow your IP (or `0.0.0.0/0` for development)
3. Copy the connection string into `MONGO_URI` in `.env`

### 3. Cloudinary

1. Sign up free at https://cloudinary.com
2. Copy `Cloud Name`, `API Key`, `API Secret` from the dashboard into `.env`

### 4. Encryption Key

Generate a 32-byte (64 hex char) key for message encryption:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output into `ENCRYPTION_KEY` in `.env`.

### 5. Frontend

The frontend is plain static files — no build step. Serve them with any static server, e.g.:

```bash
cd frontend
npx serve .
```

Or just open `frontend/pages/index.html` directly (update `API_BASE`/`SOCKET_URL` in `js/api.js` and `js/socket.js` if not running on localhost:5000).

In production, `server.js` is already configured to serve the `frontend/` folder as static files when `NODE_ENV=production`.

---

## 🔌 API Overview

See full endpoint list in the original specification — all of `/api/auth`, `/api/users`, `/api/songs`, `/api/playlists`, `/api/messages`, `/api/calls`, `/api/notifications` are implemented in `backend/routes/`.

## 🔌 Socket.io Events

Chat: `send_message`, `receive_message`, `typing_start/stop`, `user_typing`, `message_read`
Calls: `call_initiate`, `incoming_call`, `call_answer/reject/end`, `webrtc_offer/answer`, `ice_candidate`
Presence: `user_online`, `user_offline`
Notifications: `new_notification`, `unread_count`

---

## 🔒 Security Notes

- Passwords hashed with bcrypt (12 salt rounds)
- JWT-protected routes via `middleware/auth.js`
- Messages encrypted at rest with AES-256-GCM (`utils/encryption.js`) — only ciphertext, IV, and auth tag are stored in MongoDB
- Rate limiting on all `/api` routes (200 req/15 min), stricter on auth (20/15 min) and uploads (30/hour)
- Input validation via `express-validator` on every write endpoint
- Helmet for HTTP security headers

**Note on "end-to-end" encryption:** messages are encrypted before being stored in MongoDB and the server holds the encryption key, so this is "encryption at rest / in transit via the server," not true E2EE (where only the two clients hold keys). For genuine E2EE, the encryption/decryption would need to move to the browser using the Web Crypto API with per-conversation keys exchanged via a key-exchange protocol — a meaningfully larger undertaking happy to scope separately if you need it.

---

## 🗺️ What's Implemented vs. Suggested Next Steps

**Implemented:** all 10 required feature areas — auth, songs, playlists, discovery/follow, real-time messaging, WebRTC calls, security middleware, notifications, full schema set, full REST API.

**Recommended hardening before real production traffic:**
- Move message encryption to client-side (true E2EE)
- Add refresh tokens (current JWT is long-lived only)
- Add pagination cursors instead of skip/limit for very large collections
- Add automated tests (none included yet)
- Add a CDN/queue for transcoding audio on upload (currently raw upload to Cloudinary)
