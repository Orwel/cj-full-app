-- Cola de sincronización judicial (un trabajo por caso y tipo de job por día)

create table public.sync_queue (
  id              uuid primary key default gen_random_uuid(),
  caso_id         uuid not null references public.casos (id) on delete cascade,
  scheduled_date  date not null default current_date,
  job_type        text not null default 'full_sync'
    check (job_type in ('full_sync', 'recalc_only')),
  status          text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'failed')),
  attempts        integer not null default 0,
  max_attempts    integer not null default 5,
  next_attempt_at timestamptz not null default now(),
  last_error      text,
  locked_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (caso_id, scheduled_date, job_type)
);

create index sync_queue_claim_idx on public.sync_queue (next_attempt_at)
  where status in ('pending', 'failed');

create index sync_queue_caso_idx on public.sync_queue (caso_id, scheduled_date desc);

create trigger sync_queue_set_updated_at
  before update on public.sync_queue
  for each row execute procedure public.set_updated_at();

alter table public.sync_queue enable row level security;

create policy sync_queue_select_admin on public.sync_queue
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Claim atómico para el worker (service role)
create or replace function public.claim_sync_queue(p_limit int default 5)
returns setof public.sync_queue
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.sync_queue q
  set
    status = 'running',
    locked_at = now(),
    updated_at = now()
  from (
    select sq.id
    from public.sync_queue sq
    where sq.status in ('pending', 'failed')
      and sq.next_attempt_at <= now()
      and sq.attempts < sq.max_attempts
    order by sq.next_attempt_at asc
    limit greatest(1, least(p_limit, 50))
    for update skip locked
  ) sub
  where q.id = sub.id
  returning q.*;
end;
$$;

-- Encolar sync completo + recálculo diario (sin Rama) por cada caso activo
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
  insert into public.sync_queue (caso_id, scheduled_date, status, job_type)
  select id, current_date, 'pending', 'full_sync'
  from public.casos
  where scraping_activo = true
  on conflict (caso_id, scheduled_date, job_type) do nothing;
  get diagnostics v_full = row_count;

  insert into public.sync_queue (caso_id, scheduled_date, status, job_type)
  select id, current_date, 'pending', 'recalc_only'
  from public.casos
  where scraping_activo = true
  on conflict (caso_id, scheduled_date, job_type) do nothing;
  get diagnostics v_recalc = row_count;

  return jsonb_build_object(
    'full_sync_enqueued', v_full,
    'recalc_enqueued', v_recalc,
    'scheduled_date', current_date
  );
end;
$$;

revoke all on function public.claim_sync_queue(int) from public;
revoke all on function public.enqueue_daily_sync_jobs() from public;
grant execute on function public.claim_sync_queue(int) to service_role;
grant execute on function public.enqueue_daily_sync_jobs() to service_role;
