# Guarda CRON_SECRET en Supabase Vault (una vez). Lee .env.local.
# Requiere: supabase link + CRON_SECRET en .env.local

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env.local"
if (-not (Test-Path $envFile)) {
  Write-Error "No existe .env.local"
}

$secret = $null
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*CRON_SECRET=(.+)$') {
    $secret = $matches[1].Trim().Trim('"').Trim("'")
  }
}
if (-not $secret) {
  Write-Error "CRON_SECRET no encontrado en .env.local"
}

$escaped = $secret -replace "'", "''"
$sql = @"
do `$`$
begin
  if exists (select 1 from vault.secrets where name = 'CRON_SECRET') then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'CRON_SECRET' limit 1),
      '$escaped',
      'CRON_SECRET',
      'Bearer para crons HTTP'
    );
  else
    perform vault.create_secret(
      '$escaped',
      'CRON_SECRET',
      'Bearer para crons HTTP'
    );
  end if;
end;
`$`$;
"@

Write-Host "Guardando CRON_SECRET en Vault..."
$tmp = Join-Path $env:TEMP "vault_cron_secret_setup.sql"
[System.IO.File]::WriteAllText($tmp, $sql)
supabase db query --linked -f $tmp
Remove-Item $tmp -Force
Write-Host "Listo. Crons en 00008_cron_jobs.sql (ya aplicada si hiciste db push / MCP)."
