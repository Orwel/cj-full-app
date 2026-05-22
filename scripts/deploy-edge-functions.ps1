# Despliega Edge Functions de Telegram + sincronización al proyecto remoto enlazado.
# Requisitos: supabase login, supabase link --project-ref TU_REF
# Uso: .\scripts\deploy-edge-functions.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$functions = @(
  "telegram-webhook",
  "telegram-send-pending",
  "student-daily-digest",
  "sync-one-caso",
  "sync-tick",
  "health-check",
  "sync-judicial-casos"
)

foreach ($fn in $functions) {
  Write-Host "`n=== Deploy $fn ===" -ForegroundColor Cyan
  supabase functions deploy $fn
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Falló deploy de $fn. ¿Ejecutaste supabase link?"
    exit $LASTEXITCODE
  }
}

Write-Host "`nListo. Siguiente paso: .\scripts\register-telegram-webhook.ps1" -ForegroundColor Green
