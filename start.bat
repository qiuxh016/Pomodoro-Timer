@echo off
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
    echo Electron not found, running npm install...
    set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
    call npm install
)
start "" "node_modules\electron\dist\electron.exe" "."
