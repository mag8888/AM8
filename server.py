#!/usr/bin/env python3
"""
Simple HTTP server for static files with health check endpoint
"""
import http.server
import socketserver
import os
import sys
import json

class HealthCheckHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Log all requests for debugging
        print(f"📝 {self.address_string()} - {format % args}")
    
    def do_GET(self):
        # Handle health check
        if self.path == '/health':
            print(f"🏥 Health check requested from {self.address_string()}")
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {"status": "ok", "service": "aura-money-frontend", "port": self.server.server_address[1]}
            self.wfile.write(json.dumps(response).encode())
            print(f"✅ Health check response sent: {response}")
            return
        
        # Handle root path
        if self.path == '/':
            self.path = '/index.html'
        
        # Handle all other requests normally
        super().do_GET()

def run_server(port=8000):
    """Run the HTTP server"""
    try:
        # Allow address reuse
        socketserver.TCPServer.allow_reuse_address = True
        
        with socketserver.TCPServer(("", port), HealthCheckHandler) as httpd:
            print(f"🚀 Server starting on port {port}")
            print(f"📁 Serving files from: {os.getcwd()}")
            print(f"🌐 Health check: http://localhost:{port}/health")
            print(f"🎮 Game: http://localhost:{port}/")
            print(f"🔧 Environment PORT: {os.environ.get('PORT', 'not set')}")
            
            # Test health endpoint immediately
            try:
                import urllib.request
                import urllib.error
                test_url = f"http://localhost:{port}/health"
                response = urllib.request.urlopen(test_url, timeout=1)
                print(f"✅ Health check test successful: {response.read().decode()}")
            except Exception as e:
                print(f"⚠️ Health check test failed: {e}")
            
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8000))
    print(f"🔧 Starting server on port {port}")
    run_server(port)
