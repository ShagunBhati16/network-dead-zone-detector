@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 collector.py
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    python collector.py
  ) else (
    echo Python 3 is required. Install Python 3 and enable the PATH option.
    pause
  )
)
endlocal
