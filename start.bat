@echo off
echo Starting Chat Application...
echo.

echo Step 1: Installing backend dependencies...
cd backend
if not exist node_modules (
    npm install
    echo Backend dependencies installed.
) else (
    echo Backend dependencies already installed.
)

echo.
echo Step 2: Starting backend server...
start cmd /k "npm start"

echo Backend server starting on http://localhost:3001
echo.

echo Step 3: Opening frontend...
echo Frontend will be available at http://localhost:3000
start http://localhost:3000

echo.
echo Chat application is starting...
echo - Backend API: http://localhost:3001
echo - Frontend App: http://localhost:3000
echo.
echo Press any key to close this window...
pause >nul