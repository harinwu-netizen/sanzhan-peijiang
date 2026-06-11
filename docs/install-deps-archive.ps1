# install-deps.ps1
Set-Location 'E:\minimax project\三战配将'
$env:PATH = 'C:\Users\Administrator\.cache\node-portable\node-v24.14.0-win-x64;' + $env:PATH
$env:PNPM_HOME = 'C:\Users\Administrator\.pnpm-tools'

Write-Host 'Adding dev dependencies...' -ForegroundColor Cyan
& 'C:\Users\Administrator\.pnpm-tools\node_modules\.bin\pnpm.cmd' add -D prettier@3 prettier-plugin-tailwindcss vitest@2 @vitest/ui@2 @testing-library/react@16 jsdom@25
Write-Host 'Done.' -ForegroundColor Green
