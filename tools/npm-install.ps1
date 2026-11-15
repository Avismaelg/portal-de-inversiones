# Instala dependencias sin romper el junction de node_modules (OneDrive).
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File tools\npm-install.ps1
#   powershell -ExecutionPolicy Bypass -File tools\npm-install.ps1 -Packages "@supabase/ssr","zod"
#   powershell -ExecutionPolicy Bypass -File tools\npm-install.ps1 -Packages vitest -Dev
#
# npm borra el junction si se ejecuta dentro del proyecto. Por eso se instala en
# C:\Users\User\.portal-deps y se sincroniza package.json / package-lock.json.

param(
  [string[]]$Packages = @(),
  [switch]$Dev
)

$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $PSScriptRoot
$deps = "C:\Users\User\.portal-deps"
$link = Join-Path $project "node_modules"
$linkTarget = Join-Path $deps "node_modules"

Write-Host "Proyecto : $project"
Write-Host "Deps     : $deps"

New-Item -ItemType Directory -Force -Path $deps | Out-Null
New-Item -ItemType Directory -Force -Path $linkTarget | Out-Null

# Sincronizar manifiestos hacia el workspace de dependencias
Copy-Item (Join-Path $project "package.json") $deps -Force
if (Test-Path (Join-Path $project "package-lock.json")) {
  Copy-Item (Join-Path $project "package-lock.json") $deps -Force
}

# Verificar / reparar junction
if (Test-Path $link) {
  $item = Get-Item $link -Force
  if ($item.LinkType -ne "Junction") {
    Write-Error "node_modules existe y NO es un junction. Abortado para no borrar datos. Revisar manualmente: $link"
    exit 1
  }
} else {
  cmd /c mklink /J "$link" "$linkTarget" | Out-Null
  Write-Host "Junction creado."
}

# Instalar
Push-Location $deps
try {
  if ($Packages.Count -gt 0) {
    if ($Dev) {
      & npm install --save-dev @Packages
    } else {
      & npm install --save @Packages
    }
  } else {
    & npm install
  }
  if ($LASTEXITCODE -ne 0) { throw "npm install falló con código $LASTEXITCODE" }
} finally {
  Pop-Location
}

# Devolver manifiestos actualizados al proyecto
Copy-Item (Join-Path $deps "package.json") $project -Force
if (Test-Path (Join-Path $deps "package-lock.json")) {
  Copy-Item (Join-Path $deps "package-lock.json") $project -Force
}

Write-Host "OK. Dependencias instaladas fuera de OneDrive y manifiestos sincronizados."
