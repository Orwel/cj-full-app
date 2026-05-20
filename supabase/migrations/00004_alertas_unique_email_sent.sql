-- Una fila de alerta por actuación (evita duplicados al resincronizar)
create unique index if not exists alertas_caso_actuacion_uidx
  on public.alertas (caso_id, actuacion_id)
  where actuacion_id is not null;

-- Control de envío de correo (Sprint 5)
alter table public.alertas
  add column if not exists email_sent_at timestamptz;

comment on column public.alertas.email_sent_at is 'Marca de envío por correo (Resend u otro); evita reenvíos.';
