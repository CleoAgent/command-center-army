import http.server
import socketserver
import os

PORT = 5173
DIRECTORY = "/home/node/.openclaw/workspace/command-center/app/dist"

os.chdir(DIRECTORY)

Handler = http.server.SimpleHTTPRequestHandler

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

with ReusableTCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"Serving at port {PORT}")
    httpd.serve_forever()
