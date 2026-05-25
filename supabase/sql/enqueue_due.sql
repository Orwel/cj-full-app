-- Cron SQL (Integrations → Cron): encolar sondas judiciales vencidas
select public.enqueue_due_sync_jobs();
