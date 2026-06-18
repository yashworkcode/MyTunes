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
const corsOriginCheck = (origin, callback) => {
  // Allow requests with no origin (like server-to-server or curl)
  if (!origin) return callback(null, true);

  // Always allow local development configurations
  if (process.env.NODE_ENV !== 'production') {
    return callback(null, true);
  }

  // ── PRODUCTION CORS RULE (ROCK SOLID) ──
  // Trust your custom CLIENT_URL OR any dynamic Vercel deployment subdomain
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

// ── Global Error Handler ─────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 MyTunes server running on port ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = { app, server, io };