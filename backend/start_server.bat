@echo off
REM LearnTube AI - Server Startup Script
cd /d "%~dp0"
set PYTHONPATH=%~dp0
echo Starting LearnTube AI with OPIK Integration...
echo.
py -m uvicorn app.main:app --reload --port 8000
pause
