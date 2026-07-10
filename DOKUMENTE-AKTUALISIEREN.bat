@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ==============================================
echo   SELLENCE Dokumentenliste aktualisieren
echo ==============================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dokumente-index.ps1"
if errorlevel 1 (
  echo.
  echo Fehler beim Aktualisieren der Dokumentenliste.
  echo Bitte pruefe, ob der Ordner assets\dokumente vorhanden ist.
)
echo.
pause
