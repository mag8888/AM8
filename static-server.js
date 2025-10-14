#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8000;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    
    // Handle health check
    if (pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            service: 'aura-money-frontend',
            timestamp: new Date().toISOString()
        }));
        return;
    }
    
    // Handle root path
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    // Get file path
    const filePath = path.join(__dirname, pathname);
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // File not found
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
        }
        
        // Get file extension
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'text/plain';
        
        // Read and serve file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal server error');
                return;
            }
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Static server running on port ${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`🎮 Game: http://localhost:${PORT}/`);
});

server.on('error', (err) => {
    console.error('❌ Server error:', err);
    process.exit(1);
});
