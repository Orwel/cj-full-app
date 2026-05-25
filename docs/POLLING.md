# Polling adaptativo — frecuencia de sync

Complemento de [SCRAPING.md](./SCRAPING.md). Describe cómo el consultorio **detecta actuaciones nuevas** con pocas llamadas a la Rama Judicial y sin cambiar el flujo de Telegram.

## Resumen

| Pieza | Frecuencia | Rol |
|--------|------------|-----|
| `enqueue-due` | Cada **5 min** (SQL) | Encola `full_sync` para casos con `next_check_at <= now()` |
| `sync-tick` | Cada **2 min** (HTTP) | Reclama cola, dispara `sync-one-caso`, reaper de jobs colgados |
| `enqueue-daily` | **1×/día** 09:00 UTC (4:00 CO) | Respaldo `full_sync` + `recalc_only` (plazos sin Rama) |
| Sync manual (UI) | On-demand | Igual pipeline; programa `next_check_at` |

**Telegram:** sin cambios. Tras cada sync exitoso o `no_changes`, se envían alertas pendientes (todas las severidades, incluida `informativa` = cualquier actuación nueva).

## Sonda barata (sin cambios)

1. `GET NumeroRadicacion` → comparar `fechaUltimaActuacion`.
2. Si no cambió → log `no_changes`, **sin** `Actuaciones`.
3. Si cambió → detalle + actuaciones paginadas + alertas + Telegram.

## Cadencia por caso (`polling_tier`)

| Tier | Intervalo base | Cuándo |
|------|----------------|--------|
| **alto** | ~30 min | Actuación nueva detectada o `estado_critico` |
| **normal** | ~2 h | Caso activo habitual |
| **bajo** | ~6 h | Sin movimiento > 60 días |

- Jitter ±15 % en cada intervalo.
- **Ventana horaria:** lunes–viernes, **06:00–19:00** hora `America/Bogota`. Fuera de esa ventana la siguiente sonda se programa al próximo día hábil a las 06:00 (sin tabla de festivos: en festivo puede haber 1–2 sondas livianas extra con `no_changes`).
- Tras cada sync (automático o manual), `schedule_next_caso_check` actualiza `next_check_at` y el tier.

## Cola (`sync_queue`)

- Como máximo **un** `full_sync` activo (`pending`/`running`) por caso.
- Como máximo **un** `recalc_only` por caso y día (enqueue diario).
- `reap_stale_running_jobs(15)`: jobs `running` > 15 min vuelven a `pending` o `failed`.

## Migraciones

- `00010_polling_adaptive.sql` — columnas, funciones SQL, índices parciales.
- `00011_cron_enqueue_due.sql` — cron `enqueue-due`.

## Operación

```bash
supabase db push
.\scripts\deploy-edge-functions.ps1
```

Verificar en **Integrations → Cron**: `enqueue-due`, `sync-tick`, `enqueue-daily`.

Snippet manual:

```sql
select public.enqueue_due_sync_jobs();
```

## Referencias

- [SCRAPING.md §11](./SCRAPING.md#11-arquitectura-de-cola-y-crons-fiabilidad)
- [TELEGRAM.md §6](./TELEGRAM.md#6-crons)
