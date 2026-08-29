@echo off
setlocal
cd /d "%~dp0.."

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js не найден. Откройте файл ИНСТРУКЦИЯ.txt в папке WIN.
  pause
  exit /b 1
)

echo Останавливаю прошлый запуск...
taskkill /F /FI "WINDOWTITLE eq Velo adapter*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Velo game*" >nul 2>&1

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "foreach ($p in 8080,5173) { Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"

timeout /t 1 /nobreak >nul

echo Запускаю адаптер и игру...
start "Velo adapter" cmd /k "cd /d "%~dp0..\velo-node" && npm start"
start "Velo game" cmd /k "cd /d "%~dp0..\velo-game" && npm run dev"

echo Жду, пока игра поднимется...
set /a n=0
:wait
powershell -NoProfile -Command "try { $c=New-Object Net.Sockets.TcpClient('127.0.0.1',5173); $c.Close(); exit 0 } catch { exit 1 }"
if %errorlevel%==0 goto open
set /a n+=1
if %n% geq 40 (
  echo Игра не ответила. Смотрите окно Velo game и файл ИНСТРУКЦИЯ.txt в папке WIN.
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto wait

:open
start "" "http://localhost:5173"
echo Готово. Окна Velo adapter и Velo game не закрывайте, пока идёт заезд.
pause
