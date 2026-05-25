-- Cron: encolar sondas vencidas cada 5 min (complementa sync-tick cada 2 min).

do $$
declare
  r record;
begin
  for r in
    select jobid
    from cron.job
    where jobname = 'enqueue-due'
      or command ilike '%enqueue_due_sync_jobs%'
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'enqueue-due',
  '*/5 * * * *',
  $$select public.enqueue_due_sync_jobs();$$
);
