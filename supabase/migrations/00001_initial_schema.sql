-- CJ Full App — esquema inicial (Mayo 2026)
-- Revisar políticas RLS según flujo final de registro (trigger profiles, etc.)

-- ---------------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  email       text not null,
  role        text not null check (role in ('admin', 'student')),
  created_at  timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- casos
-- ---------------------------------------------------------------------------
create table public.casos (
  id                              uuid primary key default gen_random_uuid(),
  numero_caso                     text not null unique,
  radicado_judicial               text not null check (radicado_judicial ~ '^[0-9]{23}$'),
  area                            text not null
    check (area in ('civil', 'laboral', 'penal', 'familia', 'administrativo')),
  student_id                      uuid references public.profiles (id) on delete set null,
  notas                           text,

  id_proceso                      bigint,
  id_conexion                     integer,
  despacho                        text,
  departamento                    text,
  sujetos_procesales              text,
  fecha_proceso                   date,
  fecha_ultima_actuacion_remota   date,
  es_privado                      boolean not null default false,

  id_reg_proceso                  bigint,
  cod_despacho_completo           text,
  ponente                         text,
  tipo_proceso                    text,
  clase_proceso                   text,
  subclase_proceso                text,
  recurso                         text,
  ubicacion                       text,

  estado_critico                  boolean not null default false,
  scraping_activo               boolean not null default true,
  fecha_ultimo_scraping           timestamptz,

  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

create unique index casos_id_proceso_conexion_uidx
  on public.casos (id_proceso, id_conexion)
  where id_proceso is not null and id_conexion is not null;

create index casos_student_id_idx on public.casos (student_id);
create index casos_radicado_idx on public.casos (radicado_judicial);
create index casos_scraping_activo_idx on public.casos (scraping_activo) where scraping_activo;

create trigger casos_set_updated_at
  before update on public.casos
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- actuaciones
-- ---------------------------------------------------------------------------
create table public.actuaciones (
  id                      uuid primary key default gen_random_uuid(),
  caso_id                 uuid not null references public.casos (id) on delete cascade,
  id_reg_actuacion        bigint not null,
  cons_actuacion          integer not null,
  fecha_actuacion         date not null,
  actuacion               text not null,
  anotacion               text,
  fecha_inicio_termino    date,
  fecha_fin_termino       date,
  fecha_registro          date,
  con_documentos          boolean not null default false,
  cod_regla               text,
  severidad               text not null default 'informativa'
    check (severidad in ('critica', 'urgente', 'atencion', 'informativa')),
  es_nueva                boolean not null default true,
  scraped_at              timestamptz not null default now(),

  unique (caso_id, id_reg_actuacion)
);

create index actuaciones_caso_fecha_idx on public.actuaciones (caso_id, fecha_actuacion desc);
create index actuaciones_fin_termino_idx on public.actuaciones (fecha_fin_termino)
  where fecha_fin_termino is not null;

-- ---------------------------------------------------------------------------
-- alertas
-- ---------------------------------------------------------------------------
create table public.alertas (
  id              uuid primary key default gen_random_uuid(),
  caso_id         uuid not null references public.casos (id) on delete cascade,
  actuacion_id    uuid references public.actuaciones (id) on delete set null,
  tipo_alerta     text not null check (tipo_alerta in ('critica', 'urgente', 'atencion', 'informativa')),
  titulo          text not null,
  mensaje         text not null,
  leida           boolean not null default false,
  leida_por       uuid references public.profiles (id),
  leida_at        timestamptz,
  created_at      timestamptz not null default now()
);

create index alertas_caso_leida_created_idx on public.alertas (caso_id, leida, created_at desc);

-- ---------------------------------------------------------------------------
-- scraping_logs
-- ---------------------------------------------------------------------------
create table public.scraping_logs (
  id                  uuid primary key default gen_random_uuid(),
  caso_id             uuid references public.casos (id) on delete set null,
  radicado            text not null,
  status              text not null
    check (status in ('success', 'error', 'not_found', 'invalid_format', 'no_changes')),
  error_message       text,
  actuaciones_nuevas  integer not null default 0,
  duration_ms         integer,
  created_at          timestamptz not null default now()
);

create index scraping_logs_caso_idx on public.scraping_logs (caso_id);
create index scraping_logs_created_idx on public.scraping_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.casos enable row level security;
alter table public.actuaciones enable row level security;
alter table public.alertas enable row level security;
alter table public.scraping_logs enable row level security;

-- profiles: lectura propia o admin
create policy profiles_select on public.profiles
  for select using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id);

create policy profiles_update on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- casos: lectura estudiante dueño o admin
create policy casos_select on public.casos
  for select using (
    student_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- inserción: estudiante solo su caso; admin cualquiera
create policy casos_insert on public.casos
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or (
      student_id = auth.uid()
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'student')
    )
  );

create policy casos_update on public.casos
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or student_id = auth.uid()
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or student_id = auth.uid()
  );

create policy casos_delete on public.casos
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- actuaciones: lectura si el caso es visible
create policy actuaciones_select on public.actuaciones
  for select using (
    exists (
      select 1 from public.casos c
      where c.id = actuaciones.caso_id
        and (
          c.student_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
    )
  );

-- escritura actuaciones: reservada a service role (bypass RLS) desde API Route

-- alertas: misma visibilidad que caso
create policy alertas_select on public.alertas
  for select using (
    exists (
      select 1 from public.casos c
      where c.id = alertas.caso_id
        and (
          c.student_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
    )
  );

create policy alertas_update on public.alertas
  for update using (
    exists (
      select 1 from public.casos c
      where c.id = alertas.caso_id
        and (
          c.student_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
    )
  );

-- scraping_logs: solo admin (lectura); escritura vía service role
create policy scraping_logs_select on public.scraping_logs
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
