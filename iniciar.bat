@echo off
cd /d "%~dp0"
py -3 -m http.server 8080 --directory web --bind 127.0.0.1
pause
