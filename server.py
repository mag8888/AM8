#!/usr/bin/env python3
"""
Simple HTTP server for static files with health check endpoint
"""
import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse

class HealthCheckHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Handle health check
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status": "ok", "service": "aura-money-frontend"}')
            return
        
        # Handle all other requests normally
        super().do_GET()

def run_server(port=8000):
    """Run the HTTP server"""
    try:
        with socketserver.TCPServer(("", port), HealthCheckHandler) as httpd:
            print(f"🚀 Server running on port {port}")
            print(f"📁 Serving files from: {os.getcwd()}")
            print(f"🌐 Health check: http://localhost:{port}/health")
            print(f"🎮 Game: http://localhost:{port}/")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
    except Exception as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8000))
    run_server(port)
