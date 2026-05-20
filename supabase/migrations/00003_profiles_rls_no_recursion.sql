-- Evita "infinite recursion detected in policy for relation profiles" (SQLSTATE 42P17):
-- las políticas no deben hacer EXISTS/SELECT sobre public.profiles desde políticas de profiles
-- ni subconsultas equivalentes que re-evalúen las mismas políticas.
-- Esta función corre como definidor y lee el rol sin aplicar RLS a esa lectura interna.

create or replace function public.auth_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function public.auth_profile_role() from public;
grant execute on function public.auth_profile_role() to authenticated;
grant execute on function public.auth_profile_role() to service_role;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    auth.uid() = id
    or (select public.auth_profile_role()) = 'admin'
  );

-- casos
drop policy if exists casos_select on public.casos;
create policy casos_select on public.casos
  for select using (
    student_id = auth.uid()
    or (select public.auth_profile_role()) = 'admin'
  );

drop policy if exists casos_insert on public.casos;
create policy casos_insert on public.casos
  for insert with check (
    (select public.auth_profile_role()) = 'admin'
    or (
      student_id = auth.uid()
      and (select public.auth_profile_role()) = 'student'
    )
  );

drop policy if exists casos_update on public.casos;
create policy casos_update on public.casos
  for update using (
    (select public.auth_profile_role()) = 'admin'
    or student_id = auth.uid()
  )
  with check (
    (select public.auth_profile_role()) = 'admin'
    or student_id = auth.uid()
  );

drop policy if exists casos_delete on public.casos;
create policy casos_delete on public.casos
  for delete using (
    (select public.auth_profile_role()) = 'admin'
  );

-- actuaciones
drop policy if exists actuaciones_select on public.actuaciones;
create policy actuaciones_select on public.actuaciones
  for select using (
    exists (
      select 1 from public.casos c
      where c.id = actuaciones.caso_id
        and (
          c.student_id = auth.uid()
          or (select public.auth_profile_role()) = 'admin'
        )
    )
  );

-- alertas
drop policy if exists alertas_select on public.alertas;
create policy alertas_select on public.alertas
  for select using (
    exists (
      select 1 from public.casos c
      where c.id = alertas.caso_id
        and (
          c.student_id = auth.uid()
          or (select public.auth_profile_role()) = 'admin'
        )
    )
  );

drop policy if exists alertas_update on public.alertas;
create policy alertas_update on public.alertas
  for update using (
    exists (
      select 1 from public.casos c
      where c.id = alertas.caso_id
        and (
          c.student_id = auth.uid()
          or (select public.auth_profile_role()) = 'admin'
        )
    )
  );

-- scraping_logs
drop policy if exists scraping_logs_select on public.scraping_logs;
create policy scraping_logs_select on public.scraping_logs
  for select using (
    (select public.auth_profile_role()) = 'admin'
  );
