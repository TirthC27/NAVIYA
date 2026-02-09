@echo off
REM Install Python dependencies for NAVIYA Backend
cd /d "%~dp0"
echo ================================================
echo Installing Python Dependencies for NAVIYA
echo ================================================
echo.

echo Installing all requirements from requirements.txt...
py -m pip install -r requirements.txt

echo.
echo ================================================
echo Installation Complete!
echo ================================================
echo.
echo You can now start the server by running:
echo   start_server.bat
echo.
pause
