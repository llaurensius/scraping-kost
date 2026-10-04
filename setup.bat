@echo off
echo === 1. Setup Python Virtual Environment ===
if not exist "venv" (
    python -m venv venv
)
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt

echo === 2. Setup Node.js ^& Frontend Build ===
where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    cd frontend
    call npm install
    call npm run build
    cd ..
) else (
    echo Warning: npm tidak ditemukan. Silakan pasang Node.js untuk rebuild frontend.
)

echo === Setup Selesai! Jalankan: venv\Scripts\activate ^&^& python run.py ===
pause
