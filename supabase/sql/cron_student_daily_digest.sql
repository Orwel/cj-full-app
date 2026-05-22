-- Los 4 crons se definen en supabase/migrations/00008_cron_jobs.sql (pg_cron).
-- Este archivo es solo referencia manual / prueba puntual:

select private.invoke_edge_cron('student-daily-digest');
