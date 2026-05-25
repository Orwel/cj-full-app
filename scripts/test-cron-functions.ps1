# Prueba manual de Edge Functions protegidas por CRON_SECRET.
# Uso (desde la raíz del repo):
#   $env:CRON_SECRET = "tu-secret"   # el de Supabase Edge Secrets
#   .\scripts\test-cron-functions.ps1
#   .\scripts\test-cron-functions.ps1 -Only sync-tick

param(
  [string]$ProjectRef = "tiodnudjbwouwhffboam",
  [ValidateSet("sync-tick", "student-daily-digest", "health-check", "all")]
  [string]$Only = "all"
)

$ErrorActionPreference = "Stop"
$secret = $env:CRON_SECRET
if (-not $secret) {
  Write-Error "Define CRON_SECRET en la sesión: `$env:CRON_SECRET = '...'"
}

$base = "https://$ProjectRef.supabase.co/functions/v1"
$headers = @{
  Authorization = "Bearer $secret"
  "Content-Type" = "application/json"
}

$targets = @()
if ($Only -eq "all") {
  $targets = @("sync-tick", "student-daily-digest", "health-check")
} else {
  $targets = @($Only)
}

foreach ($fn in $targets) {
  Write-Host "`n=== POST $fn ===" -ForegroundColor Cyan
  try {
    $res = Invoke-WebRequest -Uri "$base/$fn" -Method POST -Headers $headers -Body "{}" -UseBasicParsing
    Write-Host "Status: $($res.StatusCode)" -ForegroundColor Green
    Write-Host $res.Content
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    $body = $_.ErrorDetails.Message
    Write-Host "Status: $status" -ForegroundColor Red
    if ($body) { Write-Host $body }
    if ($status -eq 401) {
      Write-Host "401 = Bearer no coincide con CRON_SECRET en Supabase Edge Secrets." -ForegroundColor Yellow
      Write-Host "Corrige también el header en Integrations -> Cron." -ForegroundColor Yellow
    }
  }
}
