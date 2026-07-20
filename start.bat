@echo off
echo ========================================
echo    Uruchamianie projektu Dziki Zachód
echo ========================================
echo.

echo Instalowanie zależności...
call npm install

echo.
echo Uruchamianie serwera deweloperskiego...
echo.

:: Uruchom npm run dev w tle i poczekaj chwilę
start /b npm run dev

:: Czekaj 4 sekundy na start serwera (możesz zmienić)
timeout /t 4 /nobreak > nul

echo Otwieram przeglądarkę...
start http://localhost:5173

echo.
echo Projekt uruchomiony! 
echo Jeśli strona się nie załadowała od razu, odśwież (F5).
echo.
pause