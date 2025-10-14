@echo off
REM Launch Codex in WSL Ubuntu and jump to your project

set "DISTRO=Ubuntu"
set "WSL_PATH=/mnt/c/projects/gay-i-concierge"

REM Start WSL, cd into the project, then run codex
wsl -d "%DISTRO%" -e bash -lc "cd '%WSL_PATH%' || { echo 'Path not found: %WSL_PATH%'; exec bash; }; codex || exec bash"
