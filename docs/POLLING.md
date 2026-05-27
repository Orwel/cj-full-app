# Polling adaptativo — frecuencia de sync

Complemento de [SCRAPING.md](./SCRAPING.md). Describe cómo el consultorio **detecta actuaciones nuevas** con pocas llamadas a la Rama Judicial y sin cambiar el flujo de Telegram.

## Resumen

| Pieza | Frecuencia | Rol |
|--------|------------|-----|
| `enqueue-due` | Cada **5 min** | Casos con `next_check_at` vencido + **red de seguridad** (sin sync > 2 h en horario hábil) |
| `enqueue-business-hourly` | **:15** de 11–23 UTC, lun–vie | Mismo encolado (~06:15–18:15 Colombia) |
| `sync-tick` | Cada **2 min** (HTTP) | Reclama cola, dispara `sync-one-caso`, reaper de jobs colgados |
| `enqueue-daily` | **1×/día** 09:00 UTC (4:00 CO) | Respaldo `full_sync` + `recalc_only` |
| Sync manual (UI) | On-demand | Igual pipeline; programa `next_check_at` |

**Telegram:** sin cambios. Destinatarios = estudiante con bot vinculado + admins en `caso_suscriptores`.

## Fiabilidad (migración `00012`)

1. **Sync de madrugada (04:00 CO):** si el cron diario corre antes de las 06:00, la próxima sonda se programa para **hoy a las 06:00**, no para mañana (evita perder todo el día hábil).
2. **Red de seguridad:** en horario hábil, si `fecha_ultimo_scraping` tiene más de **2 horas**, se encola `full_sync` aunque `next_check_at` siga en el futuro.
3. **Barrido horario:** cron extra en horas laborales Colombia.

## Sonda barata

1. `GET NumeroRadicacion` → comparar `fechaUltimaActuacion`.
2. Si no cambió → log `no_changes`, **sin** `Actuaciones`.
3. Si cambió → detalle + actuaciones + alertas + Telegram.

> La Rama a veces publica actuaciones antes de actualizar `fechaUltimaActuacion`. Por eso la red de seguridad re-consulta cada pocas horas en horario hábil.

## Cadencia por caso (`polling_tier`)

| Tier | Intervalo base | Cuándo |
|------|----------------|--------|
| **alto** | ~30 min | Actuación nueva o `estado_critico` |
| **normal** | ~2 h | Caso activo habitual |
| **bajo** | ~6 h | Sin movimiento > 60 días |

Ventana: lun–vie **06:00–19:00** `America/Bogota` (sin tabla de festivos).

## Migraciones

- `00010` — columnas y cola
- `00011` — cron `enqueue-due`
- `00012` — `is_business_hours_co`, fix `compute_next_check_at`, `enqueue_due` con stale
- `00013` — cron `enqueue-business-hourly`

## Operación

```bash
supabase db push
```

```sql
select public.enqueue_due_sync_jobs(2);
select public.is_business_hours_co(now());
```

## Referencias

- [SCRAPING.md §11](./SCRAPING.md#11-arquitectura-de-cola-y-crons-fiabilidad)
- [TELEGRAM.md §6](./TELEGRAM.md#6-crons)
