@echo off
echo ============================================
echo   QuickQ - Starting All Services
echo ============================================
echo.

:: Check if Redis is running by attempting to ping it
echo Checking if Redis is running on port 6379...
redis-cli ping >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Redis is NOT running on port 6379!
    echo Please start Redis, Memurai, or run "docker run -p 6379:6379 redis:7-alpine" first.
    echo.
    pause
    exit /b 1
)
echo [OK] Redis is running.
echo.

echo Starting QuickQ Backend (Spring Boot)...
start cmd /k "cd %~dp0backend && mvn spring-boot:run"

echo Starting QuickQ Admin Frontend (Static HTML)...
start cmd /k "cd %~dp0admin-frontend && python -m http.server 5173"

echo Starting QuickQ Client Web App (Static HTML)...
start cmd /k "cd %~dp0client-frontend && python -m http.server 5174"

echo.
echo All services starting! 
echo - Backend API + Swagger: http://localhost:8000/swagger-ui.html
echo - Admin Dashboard:       http://localhost:5173
echo - Client Web App:        http://localhost:5174
echo.
pause
