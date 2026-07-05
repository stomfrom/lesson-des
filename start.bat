@echo off
title Shixun Device Manager

echo ============================================
echo   Shixun Device Manager - Startup Script
echo ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js ^>= 18.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo [INFO] Node.js %%v

echo.
echo [1/3] Installing server dependencies...
cd /d "%~dp0server"
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] Server dependency installation failed.
    pause
    exit /b 1
)

echo [2/3] Installing client dependencies...
cd /d "%~dp0client"
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] Client dependency installation failed.
    pause
    exit /b 1
)

echo [3/3] Starting services...
echo.
echo   Backend: http://localhost:3000
echo   Frontend: http://localhost:5173
echo.

:: Start backend in new window
start "Shixun-Backend" cmd /k "cd /d %~dp0server && npm run dev"

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in new window
start "Shixun-Frontend" cmd /k "cd /d %~dp0client && npm run dev"

echo [DONE] Services started. Opening browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173/login

pause
