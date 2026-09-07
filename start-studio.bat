@echo off
title bitwise. Studio ^& Dashboard Server
cd /d "%~dp0"
echo ===================================================
echo   Launching bitwise. Studio ^& Dashboard Server...
echo ===================================================
powershell -ExecutionPolicy Bypass -File "%~dp0start-studio.ps1"
pause
