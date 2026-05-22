# Registra el webhook de Telegram apuntando a telegram-webhook en Supabase.
# Uso (PowerShell, desde la raíz del repo):
#   .\scripts\register-telegram-webhook.ps1 -ProjectRef "abcdefgh" -BotToken "..." -WebhookSecret "..."
#
# También puedes definir variables de entorno: SUPABASE_PROJECT_REF, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET

param(
  [string]$ProjectRef = $env:SUPABASE_PROJECT_REF,
  [string]$BotToken = $env:TELEGRAM_BOT_TOKEN,
  [string]$WebhookSecret = $env:TELEGRAM_WEBHOOK_SECRET
)

if (-not $ProjectRef) {
  $ProjectRef = Read-Host "Supabase Project Ref (Settings → General → Reference ID)"
}
if (-not $BotToken) {
  $BotToken = Read-Host "TELEGRAM_BOT_TOKEN (BotFather)" -AsSecureString
  $BotToken = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($BotToken)
  )
}
if (-not $WebhookSecret) {
  $WebhookSecret = Read-Host "TELEGRAM_WEBHOOK_SECRET (mismo valor que en Supabase Secrets)"
}

$webhookUrl = "https://$ProjectRef.supabase.co/functions/v1/telegram-webhook?token=$WebhookSecret"
$body = @{
  url = $webhookUrl
  allowed_updates = @("message")
} | ConvertTo-Json -Compress

Write-Host "Registrando webhook: $webhookUrl"
$set = Invoke-RestMethod -Method Post `
  -Uri "https://api.telegram.org/bot$BotToken/setWebhook" `
  -ContentType "application/json" `
  -Body $body

if (-not $set.ok) {
  Write-Error "setWebhook falló: $($set | ConvertTo-Json -Depth 5)"
  exit 1
}

Write-Host "OK: $($set.description)"
$info = Invoke-RestMethod "https://api.telegram.org/bot$BotToken/getWebhookInfo"
Write-Host "getWebhookInfo:"
$info.result | ConvertTo-Json -Depth 5
