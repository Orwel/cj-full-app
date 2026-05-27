-- Refuerzo horario hábil Colombia: enqueue-due cada 5 min + barrido cada hora 11–23 UTC (6–18 h CO).

do $$
declare
  r record;
begin
  for r in
    select jobid
    from cron.job
    where jobname in ('enqueue-due', 'enqueue-business-hourly')
      or command ilike '%enqueue_due_sync_jobs%'
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'enqueue-due',
  '*/5 * * * *',
  $$select public.enqueue_due_sync_jobs(2);$$
);

-- Lun–vie, cada hora :15 entre 11:00 y 23:00 UTC ≈ 06:15–18:15 Colombia
select cron.schedule(
  'enqueue-business-hourly',
  '15 11-23 * * 1-5',
  $$select public.enqueue_due_sync_jobs(2);$$
);
