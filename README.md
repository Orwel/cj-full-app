# CJ Full App — Monitoreo judicial (Consultorio)

Aplicación para monitorear procesos de la **Rama Judicial de Colombia** por **número de radicado**, con alertas por plazos (`fechaInicial` / `fechaFinal` en actuaciones), patrones de riesgo y novedades del consultorio jurídico.

## Documentación

Índice: [docs/README.md](./docs/README.md)

| Documento | Contenido |
|-----------|------------|
| [docs/SPRINTS.md](./docs/SPRINTS.md) | Roadmap por sprints y checklists de avance |
| [docs/SPEC.md](./docs/SPEC.md) | Visión, roles, alertas, stack, despliegue (app en Vercel u otro host; **jobs en Supabase**), fases |
| [docs/DATABASE.md](./docs/DATABASE.md) | Tablas alineadas con la API, RLS |
| [docs/SCRAPING.md](./docs/SCRAPING.md) | Endpoints GET `:448/api/v2`, cron optimizado, contingencia |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Clean Architecture y rutas Next |

## Integración judicial (MVP)

- **Cliente HTTP** (`src/infrastructure/scraping/RamaJudicialClient.ts`): sin Playwright ni API keys.
- **Base API:** `https://consultaprocesos.ramajudicial.gov.co:448/api/v2` (detalle en `docs/SCRAPING.md`).

## Base de datos

Migraciones en `supabase/migrations/` (aplicar en orden hasta `00006_sync_queue.sql`):

- `00001` — esquema inicial y RLS
- `00002` — trigger perfil al registrarse
- `00003` — RLS profiles sin recursión
- `00004` — `email_sent_at` en alertas
- `00005` — constraint upsert alertas
- `00006` — cola `sync_queue` + funciones enqueue/claim

## Estructura del código

Capas bajo `src/`: `domain/`, `application/`, `infrastructure/`, `presentation/`. Rutas Next en `src/app/` (ver [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)).

## Primer administrador

Tras registrarte en la app (quedas como `student`), en el **SQL Editor** de Supabase:

```sql
update public.profiles
set role = 'admin'
where email = 'tu-correo@ejemplo.com';
```

## Operación en producción (jobs Supabase)

1. Aplicar migraciones (incl. `00006_sync_queue.sql`).
2. Desplegar Edge Functions: `sync-tick`, `sync-one-caso`, `health-check`, `sync-judicial-casos` (solo encola).
3. Secrets en Supabase: `CRON_SECRET`, opcional `RESEND_*`, `APP_PUBLIC_URL`, `HEALTH_STALE_HOURS`, `ADMIN_ALERT_EMAIL`.
4. Crons en **Integrations → Cron** (ver [docs/SCRAPING.md §11](./docs/SCRAPING.md)):
   - SQL diario: `select enqueue_daily_sync_jobs();`
   - HTTP cada 2 min: `POST .../sync-tick` con `Authorization: Bearer CRON_SECRET`
   - HTTP diario: `POST .../health-check` con el mismo Bearer

La sincronización manual sigue en la ficha del caso («Sincronizar con Rama Judicial»).

## Variables de entorno

Configurar `.env.local` (ver [.env.local.example](./.env.local.example)): `NEXT_PUBLIC_SUPABASE_*` para la app, y **`SUPABASE_SERVICE_ROLE_KEY`** solo en el servidor para sincronizar. La URL de la Rama Judicial **no** va en env (constante en código). Crons y secrets de Edge Functions van en **Supabase**, no en Vercel.
