const express = require('express');
const path = require('path');
const databaseConfig = require('./server/config/database');
const app = express();
const PORT = process.env.PORT || 3000;

// Установка переменных окружения для авторизации
process.env.JWT_SECRET = process.env.JWT_SECRET || 'am8-production-secret-key-2024-railway';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '12';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes (должны быть ПЕРЕД статическими файлами)
app.use('/api/rooms', require('./server/routes/rooms'));
app.use('/api/cells', require('./server/routes/cells'));

// Auth API routes
app.use('/auth/api', require('./auth/server/routes/auth'));
app.use('/auth/api/health', require('./auth/server/routes/health'));

// Serve static files from the current directory
app.use(express.static('.'));

// Serve auth module on /auth path
app.use('/auth', express.static(path.join(__dirname, 'auth')));

// Serve rooms page on /pages path
app.use('/pages', express.static(path.join(__dirname, 'pages')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Aura Money Game Server',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Root health check for Railway
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Basic health check
app.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Handle client-side routing - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Aura Money Game Server running on port ${PORT}`);
  console.log(`📱 Open your browser to: http://localhost:${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💚 Health check available at: /health`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('❌ Server startup error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Server shutting down gracefully...');
  process.exit(0);
});
