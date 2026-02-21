@echo off
title Math Game Runner
echo [SYSTEM] Starting Math Quiz Game...

:: Start Backend
echo [SYSTEM] Launching Backend Server...
start "Math Server" cmd /c "node server/index.js"

:: Start Frontend
echo [SYSTEM] Launching Frontend Development Server...
cd client
start "Math Frontend" cmd /c "npm run dev"

echo [SYSTEM] Servers are starting up.
echo [SYSTEM] Backend: http://localhost:3001
echo [SYSTEM] Frontend: Check terminal for local port (usually 5173)
pause
