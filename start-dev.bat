@echo off
title Gay-I Club Concierge Development Server

REM Change directory to the location of this script
cd /d "%~dp0"

REM Activate Python virtual environment if present
if exist "venv\Scripts\activate.bat" (
    echo Activating venv\n
    call "venv\Scripts\activate.bat"
) else if exist ".venv\Scripts\activate.bat" (
    echo Activating .venv\n
    call ".venv\Scripts\activate.bat"
) else (
    echo No Python virtual environment found, skipping activation.
)

REM Start Next.js development server
echo Starting Next.js dev server...
npm run dev

pause