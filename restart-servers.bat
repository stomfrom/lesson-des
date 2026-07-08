@echo off
title Shixun Restart
echo Killing node processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 3 /nobreak >nul
echo Starting backend...
start "Shixun-Backend" cmd /k "cd /d %~dp0server && npm run dev"
timeout /t 3 /nobreak >nul
echo Starting frontend...
start "Shixun-Frontend" cmd /k "cd /d %~dp0client && npm run dev"
timeout /t 3 /nobreak >nul
start http://localhost:5173/login
echo Done
