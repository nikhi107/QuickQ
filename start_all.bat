@echo off
echo Starting Redis (make sure Redis or Memurai is running on port 6379)

echo Starting QuickQ Backend (Spring Boot)...
start cmd /k "cd %~dp0backend && mvnw.cmd spring-boot:run"

echo Starting QuickQ Admin Frontend (Static HTML)...
start cmd /k "cd %~dp0admin-frontend && python -m http.server 5173"

echo Starting QuickQ Client Web App (Static HTML)...
start cmd /k "cd %~dp0client-frontend && python -m http.server 5174"

echo All services starting! 
echo - Backend: http://localhost:8000
echo - Admin Dashboard: http://localhost:5173
echo - Client Web App: http://localhost:5174
echo.
echo Note: The backend will now automatically download Maven using the wrapper.
pause
