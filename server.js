const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the current directory
app.use(express.static('.'));

// API routes
app.use('/api/rooms', require('./server/routes/rooms'));

// Serve auth module on /auth path
app.use('/auth', express.static(path.join(__dirname, 'auth')));

// Serve rooms page on /pages path
app.use('/pages', express.static(path.join(__dirname, 'pages')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Aura Money Game Server'
  });
});

// Handle client-side routing - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎮 Aura Money Game Server running on port ${PORT}`);
  console.log(`📱 Open your browser to: http://localhost:${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
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
