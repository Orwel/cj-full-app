-- Sprint 7: Telegram (reemplaza Resend) + suscripciones admin a casos
-- Requiere: public.profiles, public.casos, public.alertas y función auth_profile_role (migración 00003).

-- ---------------------------------------------------------------------------
-- Comprobación de dependencias (mensaje claro si falta el esquema base)
-- ---------------------------------------------------------------------------
do $$
declare
  missing text[] := array[]::text[];
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    missing := array_append(missing, 'public.profiles');
  end if;
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'casos'
  ) then
    missing := array_append(missing, 'public.casos');
  end if;
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'alertas'
  ) then
    missing := array_append(missing, 'public.alertas');
  end if;
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'auth_profile_role'
  ) then
    missing := array_append(missing, 'función public.auth_profile_role (migración 00003)');
  end if;

  if array_length(missing, 1) is not null then
    raise exception
      'Migración 00007 abortada. Falta: %. Ejecuta en orden 00001 → 00002 → 00003 → 00004 → 00005 → 00006 en el MISMO proyecto Supabase (SQL Editor o supabase db push).',
      array_to_string(missing, ', ');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Vinculación Telegram en profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists telegram_chat_id        bigint,
  add column if not exists telegram_username       text,
  add column if not exists telegram_link_code      text,
  add column if not exists telegram_link_code_at   timestamptz,
  add column if not exists telegram_linked_at      timestamptz,
  add column if not exists telegram_blocked_at     timestamptz,
  add column if not exists last_telegram_digest_at timestamptz;

create unique index if not exists profiles_telegram_chat_uidx
  on public.profiles (telegram_chat_id)
  where telegram_chat_id is not null;

create unique index if not exists profiles_telegram_link_code_uidx
  on public.profiles (telegram_link_code)
  where telegram_link_code is not null;

-- ---------------------------------------------------------------------------
-- Suscripciones perfil ↔ caso (admins siguen casos)
-- ---------------------------------------------------------------------------
create table if not exists public.caso_suscriptores (
  caso_id     uuid not null references public.casos (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (caso_id, profile_id)
);

create index if not exists caso_suscriptores_profile_idx
  on public.caso_suscriptores (profile_id);

alter table public.caso_suscriptores enable row level security;

drop policy if exists caso_suscriptores_select on public.caso_suscriptores;
create policy caso_suscriptores_select on public.caso_suscriptores
  for select using (
    profile_id = auth.uid()
    or (select public.auth_profile_role()) = 'admin'
  );

drop policy if exists caso_suscriptores_admin_write on public.caso_suscriptores;
create policy caso_suscriptores_admin_write on public.caso_suscriptores
  for all using (
    (select public.auth_profile_role()) = 'admin'
  )
  with check (
    (select public.auth_profile_role()) = 'admin'
  );

-- ---------------------------------------------------------------------------
-- Marca de envío Telegram en alertas
-- ---------------------------------------------------------------------------
alter table public.alertas
  add column if not exists telegram_sent_at timestamptz;

comment on column public.alertas.telegram_sent_at is
  'Marca de envío por Telegram; evita reenvíos inmediatos.';

alter table public.alertas
  drop column if exists email_sent_at;

grant select, insert, delete on public.caso_suscriptores to authenticated;
grant all on public.caso_suscriptores to service_role;
