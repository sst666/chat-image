@echo off
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Node.js 未安装，请先安装 Node.js 18+
  exit /b 1
)
if not exist node_modules (
  call npm install
)
call npm run build
call npm run start
