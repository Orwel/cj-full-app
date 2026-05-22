-- Ejecutar UNA VEZ en SQL Editor (o: .\scripts\setup-cron-vault.ps1)
-- Mismo valor que CRON_SECRET en Edge Functions → Secrets y en .env.local
--
-- Si ya existe, actualiza con vault.update_secret o borra y vuelve a crear.

select vault.create_secret(
  'PEGAR_AQUI_EL_CRON_SECRET',
  'CRON_SECRET',
  'Bearer para crons HTTP (sync-tick, student-daily-digest, health-check)'
);
