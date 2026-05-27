-- Fiabilidad de sondas: no saltar el día hábil tras sync de madrugada + red de seguridad por antigüedad.

-- ---------------------------------------------------------------------------
-- Horario hábil Colombia (lun–vie 06:00–19:00; sin festivos)
-- ---------------------------------------------------------------------------
create or replace function public.is_business_hours_co(p_ts timestamptz default now())
returns boolean
language sql
stable
as $$
  select
    extract(isodow from timezone('America/Bogota', p_ts)) between 1 and 5
    and extract(hour from timezone('America/Bogota', p_ts))::int >= 6
    and extract(hour from timezone('America/Bogota', p_ts))::int < 19;
$$;

create or replace function public.next_business_open_co(p_from timestamptz default now())
returns timestamptz
language plpgsql
stable
as $$
declare
  v_local timestamp;
  v_dow int;
  v_hour int;
  v_open timestamp;
begin
  v_local := timezone('America/Bogota', p_from);
  v_dow := extract(isodow from v_local)::int;
  v_hour := extract(hour from v_local)::int;

  -- Antes de las 06:00 un día hábil → abrir HOY (no mañana)
  if v_dow between 1 and 5 and v_hour < 6 then
    v_open :=
      date_trunc('day', v_local)
      + interval '6 hours'
      + (random() * interval '20 minutes');
    return v_open at time zone 'America/Bogota';
  end if;

  -- Después de las 19:00 o fin de semana → siguiente día hábil 06:00
  v_open :=
    date_trunc('day', v_local)
    + interval '1 day'
    + interval '6 hours'
    + (random() * interval '20 minutes');

  loop
    v_dow := extract(isodow from v_open)::int;
    exit when v_dow between 1 and 5;
    v_open := v_open + interval '1 day';
  end loop;

  return v_open at time zone 'America/Bogota';
end;
$$;

-- ---------------------------------------------------------------------------
-- Próxima sonda (corrige bug: sync 04:00 CO ya no salta todo el día)
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
  v_today_open timestamptz;
begin
  v_minutes := case p_tier
    when 'alto' then 30
    when 'bajo' then 360
    else 120
  end;

  v_jitter := 0.85 + random() * 0.3;
  v_candidate := p_from + make_interval(mins => (v_minutes * v_jitter)::int);

  if public.is_business_hours_co(v_candidate) then
    return v_candidate;
  end if;

  v_local := timezone('America/Bogota', p_from);
  v_dow := extract(isodow from v_local)::int;
  v_hour := extract(hour from v_local)::int;

  -- Madrugada hábil: programar apertura de HOY 06:00 (mínimo tier desde ahora si ya pasó las 6)
  if v_dow between 1 and 5 and v_hour < 6 then
    v_today_open := (
      date_trunc('day', v_local)
      + interval '6 hours'
      + (random() * interval '20 minutes')
    ) at time zone 'America/Bogota';

    if v_candidate > v_today_open then
      return v_candidate;
    end if;
    return v_today_open;
  end if;

  return public.next_business_open_co(p_from);
end;
$$;

comment on function public.is_business_hours_co(timestamptz) is
  'Lun–vie 06:00–18:59 America/Bogota.';
comment on function public.compute_next_check_at(text, timestamptz) is
  'Siguiente sonda; si es antes de las 06:00 CO el mismo día hábil, abre hoy no mañana.';

-- ---------------------------------------------------------------------------
-- Encolar: vencidos por next_check_at O sin sync exitoso en horario hábil (red de seguridad)
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_due_sync_jobs(
  p_stale_hours numeric default 2
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_due int;
  v_stale int;
  v_stale_interval interval;
begin
  v_stale_interval := make_interval(hours => greatest(1, least(p_stale_hours, 6))::int);

  insert into public.sync_queue (caso_id, scheduled_date, status, job_type, next_attempt_at)
  select
    c.id,
    current_date,
    'pending',
    'full_sync',
    now()
  from public.casos c
  where c.scraping_activo = true
    and (
      c.next_check_at is null
      or c.next_check_at <= now()
    )
    and not exists (
      select 1
      from public.sync_queue sq
      where sq.caso_id = c.id
        and sq.job_type = 'full_sync'
        and sq.status in ('pending', 'running')
    );

  get diagnostics v_due = row_count;

  -- Red de seguridad: en horario hábil, si lleva > N h sin scraping, forzar sonda
  if public.is_business_hours_co(now()) then
    insert into public.sync_queue (caso_id, scheduled_date, status, job_type, next_attempt_at)
    select
      c.id,
      current_date,
      'pending',
      'full_sync',
      now()
    from public.casos c
    where c.scraping_activo = true
      and coalesce(c.fecha_ultimo_scraping, '1970-01-01'::timestamptz) < now() - v_stale_interval
      and not exists (
        select 1
        from public.sync_queue sq
        where sq.caso_id = c.id
          and sq.job_type = 'full_sync'
          and sq.status in ('pending', 'running')
      )
      and not (
        c.next_check_at is null
        or c.next_check_at <= now()
      );

    get diagnostics v_stale = row_count;
  else
    v_stale := 0;
  end if;

  return jsonb_build_object(
    'full_sync_enqueued_due', v_due,
    'full_sync_enqueued_stale', v_stale,
    'business_hours', public.is_business_hours_co(now()),
    'stale_hours', extract(epoch from v_stale_interval) / 3600,
    'at', now()
  );
end;
$$;

-- Reparar casos activos con next_check_at lejano durante horario hábil de hoy
update public.casos c
set next_check_at = public.compute_next_check_at(c.polling_tier, now())
where c.scraping_activo = true
  and public.is_business_hours_co(now())
  and (
    c.next_check_at is null
    or c.next_check_at > now() + interval '4 hours'
  );

revoke all on function public.enqueue_due_sync_jobs() from public;
grant execute on function public.enqueue_due_sync_jobs(numeric) to service_role;

revoke all on function public.is_business_hours_co(timestamptz) from public;
revoke all on function public.next_business_open_co(timestamptz) from public;
grant execute on function public.is_business_hours_co(timestamptz) to service_role;
grant execute on function public.next_business_open_co(timestamptz) to service_role;
