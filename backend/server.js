require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const path       = require('path');

const connectDB      = require('./config/db');
const errorHandler   = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const initSocket     = require('./socket');

// ── Routes ──────────────────────────────────────────
const authRoutes         = require('./routes/auth');
const userRoutes         = require('./routes/users');
const songRoutes         = require('./routes/songs');
const playlistRoutes     = require('./routes/playlists');
const messageRoutes      = require('./routes/messages');
const callRoutes         = require('./routes/calls');
const notificationRoutes = require('./routes/notifications');

// ── Connect Database ─────────────────────────────────
connectDB();

const app    = express();
const server = http.createServer(app);

// ── CORS ─────────────────────────────────────────────
const DEV_ORIGINS = [
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:5500', 'http://127.0.0.1:5500',
  'http://localhost:8000', 'http://127.0.0.1:8000',
  'http://localhost:8080', 'http://127.0.0.1:8080',
  'http://localhost:5173', 'http://127.0.0.1:5173',
];

const corsOriginCheck = (origin, callback) => {
  // Allow requests with no origin (like server-to-server or curl)
  if (!origin) return callback(null, true);

  // Always allow local development ports
  if (process.env.NODE_ENV !== 'production') {
    return callback(null, true);
  }

  // ── PRODUCTION CORS RULE (UPDATED) ──
  // Trust your custom CLIENT_URL OR any generated deployment URL ending in vercel.app
  if (origin === process.env.CLIENT_URL || origin.includes('vercel.app')) {
    return callback(null, true);
  }
  
  callback(new Error('Not allowed by CORS'));
};

// ── Socket.io ────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: corsOriginCheck,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
initSocket(io);

// Make io accessible in controllers via req.io
app.use((req, _res, next) => { req.io = io; next(); });

// ── Middleware ───────────────────────────────────────
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false 
}));

app.use(cors({
  origin: corsOriginCheck,
  credentials: true,
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiter — 200 requests per 15 min per IP
app.use('/api', rateLimiter);

// ── API Routes ───────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/songs',         songRoutes);
app.use('/api/playlists',     playlistRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/calls',         callRoutes);
app.use('/api/notifications', notificationRoutes);

// ── Health check ─────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// ── Serve frontend in production ─────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/index.html'));
  });
}

// ── Global Error Handler ─────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 MyTunes server running on port ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = { app, server, io };