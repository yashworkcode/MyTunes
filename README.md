# ♪ MyTunes — Full Stack Music Sharing App

MyTunes is a full-stack music sharing platform where users can upload songs, create playlists, follow other users, and chat in real time. It also supports voice/video calls and encrypted messaging.

Built using vanilla HTML/CSS/JS on the frontend and Node.js + Express + MongoDB on the backend.

---

## ⚡ Important (read this first)

Don’t serve the root folder of the project.

If you do, you’ll only see folders like `backend/` and `frontend/`.

The actual app starts here:
frontend/pages/index.html

---

## 🚀 How to run the project

### 1. Backend setup

cd backend
npm install
cp .env.example .env
npm run dev

Backend runs on:
http://localhost:5000

### .env setup (important)

Add these values:

- MONGO_URI
- JWT_SECRET
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- ENCRYPTION_KEY
- CLIENT_URL

---

### 2. Frontend setup

cd frontend
npx serve .

Then open the link shown in terminal and go to:
/pages/index.html

OR

Use VS Code Live Server and open:
frontend/pages/index.html

(Don’t open project root)

---

## 🧱 Tech Stack

Frontend:
- HTML
- CSS
- JavaScript (Vanilla)

Backend:
- Node.js
- Express.js
- MongoDB + Mongoose

Other:
- JWT authentication
- bcrypt password hashing
- Cloudinary file storage
- Socket.io for real-time features
- WebRTC for calls
- AES-256-GCM encryption for messages

---

## 📁 Project Structure

backend/
  config/        DB + Cloudinary setup
  models/        MongoDB schemas
  controllers/   logic
  routes/        API routes
  middleware/    auth + validation + rate limit
  utils/         helpers
  socket/        real-time handlers
  server.js      entry point

frontend/
  pages/         HTML pages
  css/           styles
  js/            frontend logic
  assets/        images/icons

---

## 🔌 API Routes

Auth:
- /api/auth
- /api/users

Music:
- /api/songs
- /api/playlists

Social:
- /api/messages
- /api/calls
- /api/notifications

---

## 💬 Real-time Features

Using Socket.io:
- Chat messages
- Typing indicator
- Online/offline status
- Notifications
- WebRTC call signaling

---

## 🔒 Security

- JWT authentication
- bcrypt password hashing
- Rate limiting on APIs
- Input validation on all requests
- AES-256-GCM encryption for messages
- Helmet security headers

Note: This is not full end-to-end encryption because the server still holds the encryption key.

---

## 📌 Features Completed

- Login / Signup
- Upload songs
- Create playlists
- Follow users
- Real-time chat
- Voice/video calls
- Notifications system

---

## 🔥 Future Improvements

- Add real end-to-end encryption (client-side)
- Add refresh tokens
- Add pagination for large data
- Add tests (Jest/Mocha)
- Add audio processing (compression/transcoding)
- Deploy project online

---

## 📌 Notes

- Always start backend before frontend
- Make sure CLIENT_URL matches frontend URL
- Don’t run project from root folder