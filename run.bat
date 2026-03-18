@echo off
echo === CSE Research Dashboard Setup ===

python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install from https://python.org and try again.
    pause
    exit /b 1
)

echo.
echo Installing dependencies...
python -m pip install -r requirements.txt

echo.
echo Fetching scholar data (this may take several minutes)...
python fetch_data.py

echo.
echo Done! Opening dashboard...
start index.html

pause
