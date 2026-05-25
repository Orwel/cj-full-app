-- Gestión admin de estudiantes: is_active + vista de resumen

alter table public.profiles
  add column if not exists is_active boolean not null default true;

comment on column public.profiles.is_active is
  'Si false, el perfil queda inactivo (sin borrar auth.users). Solo admin vía service role.';

create or replace view public.vw_students_overview
with (security_invoker = true)
as
select
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.is_active,
  p.created_at,
  (p.telegram_chat_id is not null) as telegram_conectado,
  p.last_telegram_digest_at,
  coalesce(c.casos_count, 0)::int as casos_activos,
  coalesce(c.casos_criticos, 0)::int as casos_criticos,
  coalesce(a.alertas_pendientes, 0)::int as alertas_pendientes
from public.profiles p
left join (
  select
    student_id,
    count(*)::int as casos_count,
    count(*) filter (where estado_critico)::int as casos_criticos
  from public.casos
  where student_id is not null
  group by student_id
) c on c.student_id = p.id
left join (
  select
    cas.student_id,
    count(al.id)::int as alertas_pendientes
  from public.alertas al
  inner join public.casos cas on cas.id = al.caso_id
  where al.leida = false
    and cas.student_id is not null
  group by cas.student_id
) a on a.student_id = p.id;

comment on view public.vw_students_overview is
  'Resumen por perfil para panel admin de estudiantes. Respeta RLS (security invoker).';

grant select on public.vw_students_overview to authenticated;
