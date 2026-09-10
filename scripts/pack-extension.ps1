$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "manifest.json"))) { $root = $PSScriptRoot; if (-not (Test-Path (Join-Path $root "manifest.json"))) { $root = Split-Path -Parent $PSScriptRoot } }
# scripts/ is under repo root, so parent of scripts is root
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$out = Join-Path $root "staysticky-extension.zip"
$stage = Join-Path $env:TEMP "staysticky-ext-pack"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null
$include = @("manifest.json","background.js","content","popup","shared","icons")
foreach ($item in $include) {
  $src = Join-Path $root $item
  if (-not (Test-Path $src)) { throw "Missing $src" }
  Copy-Item $src (Join-Path $stage $item) -Recurse -Force
}
if (Test-Path $out) { Remove-Item $out -Force }
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $out -Force
Remove-Item $stage -Recurse -Force
Write-Output "Wrote $out"
