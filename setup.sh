#!/usr/bin/env bash
set -e

echo "=== 1. Setup Python Virtual Environment ==="
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "=== 2. Setup Node.js & Frontend Build ==="
if command -v npm &> /dev/null; then
    cd frontend
    npm install
    npm run build
    cd ..
else
    echo "Warning: npm tidak ditemukan. Silakan pasang Node.js untuk rebuild frontend."
fi

echo "=== Setup Selesai! Jalankan: source venv/bin/activate && python3 run.py ==="
