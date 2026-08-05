@echo off
chcp 65001 >nul
title 合同看板服务

:: ★ 关键：切换到脚本所在目录，确保相对路径正确
cd /d "%~dp0"

echo.
echo ══════════════════════════════════════════
echo    📋 合同生命周期看板 — 内网服务器
echo ══════════════════════════════════════════
echo.

:: 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未找到 Node.js，请先安装 Node.js
    echo    下载地址: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js 版本:
node --version
echo.

:: 检查依赖是否安装
if not exist "node_modules\express" (
    echo 📦 首次运行，正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo ❌ 依赖安装失败！请检查网络或手动执行 npm install
        echo    国内用户可尝试：npm config set registry https://registry.npmmirror.com
        echo.
        pause
        exit /b 1
    )
    echo.
)

:: 检查 data.json 是否有效，无效则初始化
node -e "try{require('fs').readFileSync('data.json','utf8')&&JSON.parse(require('fs').readFileSync('data.json','utf8'))}catch(e){require('fs').writeFileSync('data.json','[]','utf8');console.log('已初始化 data.json')}"

echo 🚀 启动服务...
echo.
node server.js
set ERR=%errorlevel%

if %ERR% neq 0 (
    echo.
    echo ══════════════════════════════════════════
    echo ❌ 服务启动失败 (错误码: %ERR%)
    echo ══════════════════════════════════════════
    echo.
    echo 可能的原因：
    echo   1. 端口 %PORT% 已被占用 → 修改 server.js 中的 PORT
    echo   2. data.json 格式损坏 → 已自动重置
    echo   3. 依赖缺失 → 请运行 npm install
    echo.
)

pause
