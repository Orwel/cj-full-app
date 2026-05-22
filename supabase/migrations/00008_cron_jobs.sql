-- Crons vía pg_cron (misma tabla que Integrations → Cron en el panel).
-- Requiere una vez: secret CRON_SECRET en Vault (ver supabase/sql/vault_cron_secret.sql).
-- Horarios en UTC (Colombia = UTC−5).

create schema if not exists private;

-- Bearer para Edge Functions invocadas desde cron (lee Vault, no va en git).
create or replace function private.get_cron_secret()
returns text
language sql
stable
security definer
set search_path = public, vault, extensions
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'CRON_SECRET'
  limit 1;
$$;

create or replace function private.invoke_edge_cron(edge_path text)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_base text := 'https://tiodnudjbwouwhffboam.supabase.co/functions/v1/';
  v_request_id bigint;
begin
  v_secret := private.get_cron_secret();
  if v_secret is null or btrim(v_secret) = '' then
    raise exception
      'CRON_SECRET no está en Vault. Ejecuta supabase/sql/vault_cron_secret.sql una vez (mismo valor que Edge Secrets).';
  end if;

  select net.http_post(
    url := v_base || edge_path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb
  )
  into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function private.get_cron_secret() from public, anon, authenticated;
revoke all on function private.invoke_edge_cron(text) from public, anon, authenticated;

-- Quitar jobs previos (panel o migración anterior) para no duplicar.
do $$
declare
  r record;
begin
  for r in
    select jobid
    from cron.job
    where jobname in (
        'enqueue-daily',
        'sync-tick',
        'student-daily-digest',
        'health-check'
      )
      or command ilike '%enqueue_daily_sync_jobs%'
      or command ilike '%/sync-tick%'
      or command ilike '%student-daily-digest%'
      or command ilike '%/health-check%'
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'enqueue-daily',
  '0 9 * * *',
  $$select public.enqueue_daily_sync_jobs();$$
);

select cron.schedule(
  'sync-tick',
  '*/2 * * * *',
  $$select private.invoke_edge_cron('sync-tick');$$
);

select cron.schedule(
  'student-daily-digest',
  '0 10 * * *',
  $$select private.invoke_edge_cron('student-daily-digest');$$
);

select cron.schedule(
  'health-check',
  '0 13 * * *',
  $$select private.invoke_edge_cron('health-check');$$
);
