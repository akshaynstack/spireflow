# Creates the Python venv for the Spireflow speech sidecar and installs Phonon-2.
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File server\setup.ps1

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

Write-Host 'Creating virtual environment...' -ForegroundColor Cyan
py -m venv .venv

Write-Host 'Upgrading pip...' -ForegroundColor Cyan
& .\.venv\Scripts\python.exe -m pip install --upgrade pip

Write-Host 'Installing Phonon-2 and the sidecar dependencies (this pulls torch, ~250 MB)...' -ForegroundColor Cyan
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt

Write-Host 'Done. The sidecar python is at server\.venv\Scripts\python.exe' -ForegroundColor Green
