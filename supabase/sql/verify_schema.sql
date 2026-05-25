-- Ejecutar en SQL Editor para ver qué migraciones base faltan antes de 00007
select
  t.table_name,
  case when t.table_name is not null then 'ok' else 'falta' end as estado
from (
  values
    ('profiles'),
    ('casos'),
    ('actuaciones'),
    ('alertas'),
    ('scraping_logs'),
    ('sync_queue')
) as expected(name)
left join information_schema.tables t
  on t.table_schema = 'public'
  and t.table_name = expected.name
order by expected.name;

select case
  when exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'auth_profile_role'
  ) then 'auth_profile_role: ok'
  else 'auth_profile_role: falta (ejecuta 00003)'
end as funcion_rls;
