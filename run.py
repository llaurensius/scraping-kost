import uvicorn
import socket
import sys
import argparse

def find_free_port(start_port=8000):
    port = start_port
    while port < start_port + 100:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('localhost', port)) != 0:
                return port
        port += 1
    return start_port

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=None, help="Port untuk menjalankan server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host interface")
    args = parser.parse_args()

    port = args.port or find_free_port(8000)

    print("=" * 60)
    print("🚀 MENJALANKAN MAMIKOS SCRAPING & LOCATION INTELLIGENCE SYSTEM")
    print("=" * 60)
    print(f"Web Dashboard : http://localhost:{port}")
    print(f"API Docs (OpenAPI): http://localhost:{port}/docs")
    print("-" * 60)
    uvicorn.run("backend.main:app", host=args.host, port=port, reload=True)
