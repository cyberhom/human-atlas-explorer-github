$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$python = Join-Path $backend ".venv\Scripts\python.exe"
if (!(Test-Path $python)) {
    throw "محیط مجازی Flask پیدا نشد. ابتدا مراحل نصب بخش backend در README.md را اجرا کن."
}
if (!(Test-Path (Join-Path $frontend "node_modules"))) {
    throw "وابستگی‌های Next.js پیدا نشدند. ابتدا در پوشه frontend دستور npm install را اجرا کن."
}
Start-Process powershell -ArgumentList @("-NoExit", "-Command", "Set-Location '$backend'; & '$python' app.py")
Start-Process powershell -ArgumentList @("-NoExit", "-Command", "Set-Location '$frontend'; npm run dev")
Write-Host "سرویس‌ها در دو پنجره اجرا شدند. وب‌اپ: http://localhost:3000" -ForegroundColor Cyan
