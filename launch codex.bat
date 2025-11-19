@echo off
REM Launch Codex in WSL and jump to your project
REM - Uses the default WSL distro (no hardcoded name)
REM - Sets the project directory reliably
REM - Keeps the window open with an interactive shell on errors

setlocal
set "WSL_PATH=/mnt/c/projects/gay-i-concierge"

REM First try using --cd (supported on modern WSL). If that fails, fall back.
REM Inside WSL: if codex exists, run it; always drop to an interactive bash afterwards.
wsl --cd "%WSL_PATH%" bash -lc "if [ ! -d '%WSL_PATH%' ]; then echo 'Path not found: %WSL_PATH%'; exec bash; fi; if command -v codex >/dev/null 2>&1; then codex; else echo 'codex not found in PATH. Install Codex CLI in WSL or adjust your PATH.'; fi; exec bash"
if not errorlevel 1 goto :eof

REM Fallback path for older WSL (no --cd support)
wsl -e bash -lc "cd '%WSL_PATH%' || { echo 'Path not found: %WSL_PATH%'; exec bash; }; if command -v codex >/dev/null 2>&1; then codex; else echo 'codex not found in PATH. Install Codex CLI in WSL or adjust your PATH.'; fi; exec bash"

endlocal
