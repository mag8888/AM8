#!/usr/bin/env python3
"""
Ultra-simple HTTP server for Railway deployment
"""
import http.server
import socketserver
import os

# Simple handler that always responds with 200 for health checks
class SimpleHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'OK')
            return
        super().do_GET()

if __name__ == "__main__":
    # Run server
    PORT = int(os.environ.get('PORT', 8000))
    print(f"Starting server on port {PORT}")

    with socketserver.TCPServer(("", PORT), SimpleHandler) as httpd:
        httpd.serve_forever()
