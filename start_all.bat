@echo off
echo Starting Redis (make sure Redis or Memurai is running on port 6379)

echo Starting QuickQ Backend (Spring Boot)...
start cmd /k "cd %~dp0backend && mvn spring-boot:run"

echo Starting QuickQ Admin Frontend (React)...
start cmd /k "cd %~dp0admin-frontend && npm run dev"

echo Starting QuickQ Client Web App (React)...
start cmd /k "cd %~dp0client-frontend && npm run dev"

echo All services starting! 
echo - Backend: http://localhost:8000
echo - Admin Dashboard: http://localhost:5173
echo - Client Web App: http://localhost:5174
echo.
echo Note: Maven must be installed for the Java backend command to work.
pause
