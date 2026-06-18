/**
 * Global error handler — must be the last app.use() in server.js
 */
const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} →`, err.message);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, error: messages.join(', ') });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, error: `${field} already exists.` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError')  return res.status(401).json({ success: false, error: 'Invalid token.' });
  if (err.name === 'TokenExpiredError')  return res.status(401).json({ success: false, error: 'Token expired.' });

  // Multer file size
  if (err.code === 'LIMIT_FILE_SIZE')    return res.status(400).json({ success: false, error: 'File too large.' });

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
