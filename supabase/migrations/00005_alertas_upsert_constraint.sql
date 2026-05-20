-- PostgREST/Supabase upsert (onConflict) requiere UNIQUE CONSTRAINT, no solo índice parcial.
drop index if exists public.alertas_caso_actuacion_uidx;

alter table public.alertas
  drop constraint if exists alertas_caso_actuacion_key;

alter table public.alertas
  add constraint alertas_caso_actuacion_key unique (caso_id, actuacion_id);
