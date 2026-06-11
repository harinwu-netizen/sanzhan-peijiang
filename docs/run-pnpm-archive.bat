@echo off
setlocal
set "PATH=C:\Users\Administrator\.cache\node-portable\node-v24.14.0-win-x64;%PATH%"
cd /d "E:\minimax project\三战配将"
"C:\Users\Administrator\.pnpm-tools\node_modules\.bin\pnpm.cmd" %*
exit /b %ERRORLEVEL%
