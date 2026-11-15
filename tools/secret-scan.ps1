# Escanea secretos con gitleaks sin depender del PATH.
#
# Uso:
#   npm run secret:scan
#   powershell -ExecutionPolicy Bypass -File tools\secret-scan.ps1

$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $PSScriptRoot
$local = Join-Path $env:USERPROFILE ".portal-tools\gitleaks\gitleaks.exe"
$command = Get-Command gitleaks -ErrorAction SilentlyContinue

$exe = $null
if (Test-Path $local) {
  $exe = $local
} elseif ($command) {
  $exe = $command.Source
}

if (-not $exe) {
  Write-Error "gitleaks no encontrado. Instalarlo en $local o añadirlo al PATH."
  exit 1
}

Push-Location $project
try {
  & $exe detect --source . --verbose --redact --no-banner
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
