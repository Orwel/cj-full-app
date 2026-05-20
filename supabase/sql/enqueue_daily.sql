-- Cron SQL Snippet (Integrations → Cron): encolar sync + recálculo del día
select public.enqueue_daily_sync_jobs();
