@echo off
echo Starting Redis (make sure Redis is installed and running on default port or start via WSL/Docker if not installed natively!)
echo Alternatively, install memurai or redis-windows if you haven't.

echo Starting QuickQ Backend (FastAPI)...
start cmd /k "cd %~dp0backend && .\venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting QuickQ Admin Frontend (React)...
start cmd /k "cd %~dp0admin-frontend && npm run dev"

echo Starting QuickQ Client Web App (React)...
start cmd /k "cd %~dp0client-frontend && npm run dev"

echo All services starting! 
echo - Backend: http://localhost:8000
echo - Admin Dashboard: http://localhost:5173
echo - Client Web App: http://localhost:5174
pause
