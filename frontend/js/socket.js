/* ╔══════════════════════════════════════════╗
   ║   MyTunes — Socket.io Client             ║
   ╚══════════════════════════════════════════╝ */

const SOCKET_URL = isLocalDev
  ? `http://localhost:${BACKEND_PORT}`
  : 'https://mytunes-kk3n.onrender.com';

let socket = null;

function initSocket() {
  if (socket) return socket;
  const token = Auth.getToken();
  if (!token) return null;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected');
    socket.emit('get_unread_count');
  });

  return socket;
}

function getSocket() {
  return socket || initSocket();
}
