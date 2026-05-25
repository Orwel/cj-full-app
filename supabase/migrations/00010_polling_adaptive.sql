-- Polling adaptativo: sondas frecuentes sin duplicar jobs activos.
-- Mantiene enqueue_daily_sync_jobs (respaldo diario + recalc_only).

-- ---------------------------------------------------------------------------
-- Casos: cuándo volver a encolar full_sync
-- ---------------------------------------------------------------------------
alter table public.casos
  add column if not exists polling_tier text not null default 'normal'
    check (polling_tier in ('bajo', 'normal', 'alto')),
  add column if not exists next_check_at timestamptz,
  add column if not exists last_movement_at timestamptz;

comment on column public.casos.polling_tier is
  'Cadencia de sonda: alto ~30 min, normal ~2 h, bajo ~6 h (horario hábil Colombia).';
comment on column public.casos.next_check_at is
  'Próximo momento en que enqueue_due_sync_jobs puede encolar full_sync.';
comment on column public.casos.last_movement_at is
  'Última vez que fecha_ultima_actuacion_remota cambió o hubo actuaciones nuevas.';

-- Reparto inicial para no encolar todos a la vez
update public.casos
set
  next_check_at = coalesce(
    next_check_at,
    now() + (random() * interval '45 minutes')
  ),
  polling_tier = coalesce(nullif(polling_tier, ''), 'normal')
where scraping_activo = true;

-- ---------------------------------------------------------------------------
-- Cola: un solo full_sync activo (pending|running) por caso
-- ---------------------------------------------------------------------------
alter table public.sync_queue
  drop constraint if exists sync_queue_caso_id_scheduled_date_job_type_key;

create unique index if not exists sync_queue_one_active_full_sync_uidx
  on public.sync_queue (caso_id)
  where job_type = 'full_sync' and status in ('pending', 'running');

create unique index if not exists sync_queue_one_active_recalc_uidx
  on public.sync_queue (caso_id)
  where job_type = 'recalc_only' and status in ('pending', 'running');

-- Recalc sigue siendo uno por día (enqueue_daily)
create unique index if not exists sync_queue_recalc_per_day_uidx
  on public.sync_queue (caso_id, scheduled_date)
  where job_type = 'recalc_only';

-- ---------------------------------------------------------------------------
-- Reaper: jobs running colgados (Edge timeout, etc.)
-- ---------------------------------------------------------------------------
create or replace function public.reap_stale_running_jobs(p_max_age_minutes int default 15)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.sync_queue q
  set
    status = case
      when q.attempts + 1 >= q.max_attempts then 'failed'
      else 'pending'
    end,
    attempts = q.attempts + 1,
    locked_at = null,
    last_error = 'stale running job reaped',
    next_attempt_at = case
      when q.attempts + 1 >= q.max_attempts then q.next_attempt_at
      else now()
    end,
    updated_at = now()
  where q.status = 'running'
    and q.locked_at is not null
    and q.locked_at < now() - make_interval(mins => greatest(1, p_max_age_minutes));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Siguiente sonda (America/Bogota, lun–vie 06:00–19:00; sin tabla de festivos)
-- ---------------------------------------------------------------------------
create or replace function public.compute_next_check_at(
  p_tier text,
  p_from timestamptz default now()
)
returns timestamptz
language plpgsql
stable
as $$
declare
  v_minutes int;
  v_jitter float;
  v_candidate timestamptz;
  v_local timestamp;
  v_dow int;
  v_hour int;
  v_next_open timestamptz;
begin
  v_minutes := case p_tier
    when 'alto' then 30
    when 'bajo' then 360
    else 120
  end;

  v_jitter := 0.85 + random() * 0.3;
  v_candidate := p_from + make_interval(mins => (v_minutes * v_jitter)::int);

  v_local := timezone('America/Bogota', v_candidate);
  v_dow := extract(isodow from v_local)::int;
  v_hour := extract(hour from v_local)::int;

  if v_dow between 1 and 5 and v_hour >= 6 and v_hour < 19 then
    return v_candidate;
  end if;

  -- Próximo día hábil 06:00 Colombia + jitter 0–25 min
  v_next_open := (
    date_trunc('day', v_local)
    + interval '1 day'
    + interval '6 hours'
    + (random() * interval '25 minutes')
  ) at time zone 'America/Bogota';

  while extract(isodow from timezone('America/Bogota', v_next_open)) not between 1 and 5 loop
    v_next_open := v_next_open + interval '1 day';
  end loop;

  return v_next_open;
end;
$$;

create or replace function public.schedule_next_caso_check(
  p_caso_id uuid,
  p_had_movement boolean default false
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text;
  v_critico boolean;
  v_last_mov timestamptz;
  v_next timestamptz;
begin
  select
    c.polling_tier,
    c.estado_critico,
    c.last_movement_at
  into v_tier, v_critico, v_last_mov
  from public.casos c
  where c.id = p_caso_id;

  if not found then
    return null;
  end if;

  if p_had_movement then
    v_last_mov := now();
    v_tier := 'alto';
  elsif v_critico then
    v_tier := 'alto';
  elsif v_last_mov is not null and v_last_mov < now() - interval '60 days' then
    v_tier := 'bajo';
  elsif v_last_mov is not null and v_last_mov < now() - interval '14 days' then
    v_tier := 'normal';
  else
    v_tier := coalesce(v_tier, 'normal');
  end if;

  v_next := public.compute_next_check_at(v_tier, now());

  update public.casos
  set
    polling_tier = v_tier,
    last_movement_at = case when p_had_movement then v_last_mov else last_movement_at end,
    next_check_at = v_next
  where id = p_caso_id;

  return v_next;
end;
$$;

-- ---------------------------------------------------------------------------
-- Encolar sondas vencidas (cron cada 5 min)
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_due_sync_jobs()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enqueued int;
begin
  insert into public.sync_queue (caso_id, scheduled_date, status, job_type, next_attempt_at)
  select
    c.id,
    current_date,
    'pending',
    'full_sync',
    now()
  from public.casos c
  where c.scraping_activo = true
    and (c.next_check_at is null or c.next_check_at <= now())
    and not exists (
      select 1
      from public.sync_queue sq
      where sq.caso_id = c.id
        and sq.job_type = 'full_sync'
        and sq.status in ('pending', 'running')
    )
  ;

  get diagnostics v_enqueued = row_count;

  return jsonb_build_object(
    'full_sync_enqueued', v_enqueued,
    'at', now()
  );
end;
$$;

revoke all on function public.reap_stale_running_jobs(int) from public;
revoke all on function public.schedule_next_caso_check(uuid, boolean) from public;
revoke all on function public.enqueue_due_sync_jobs() from public;
revoke all on function public.compute_next_check_at(text, timestamptz) from public;

grant execute on function public.reap_stale_running_jobs(int) to service_role;
grant execute on function public.schedule_next_caso_check(uuid, boolean) to service_role;
grant execute on function public.enqueue_due_sync_jobs() to service_role;

-- enqueue_daily: compatible con índices parciales (respaldo diario + recalc)
create or replace function public.enqueue_daily_sync_jobs()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full int;
  v_recalc int;
begin
  insert into public.sync_queue (caso_id, scheduled_date, status, job_type, next_attempt_at)
  select c.id, current_date, 'pending', 'full_sync', now()
  from public.casos c
  where c.scraping_activo = true
    and not exists (
      select 1
      from public.sync_queue sq
      where sq.caso_id = c.id
        and sq.job_type = 'full_sync'
        and sq.status in ('pending', 'running')
    );
  get diagnostics v_full = row_count;

  insert into public.sync_queue (caso_id, scheduled_date, status, job_type)
  select c.id, current_date, 'pending', 'recalc_only'
  from public.casos c
  where c.scraping_activo = true
    and not exists (
      select 1
      from public.sync_queue sq
      where sq.caso_id = c.id
        and sq.job_type = 'recalc_only'
        and sq.scheduled_date = current_date
    );
  get diagnostics v_recalc = row_count;

  return jsonb_build_object(
    'full_sync_enqueued', v_full,
    'recalc_enqueued', v_recalc,
    'scheduled_date', current_date
  );
end;
$$;
