# CJ Full App — Monitoreo judicial (Consultorio)

Aplicación para monitorear procesos de la **Rama Judicial de Colombia** por **número de radicado**, con alertas por plazos (`fechaInicial` / `fechaFinal` en actuaciones), patrones de riesgo y novedades del consultorio jurídico.

## Documentación

Índice: [docs/README.md](./docs/README.md)

| Documento | Contenido |
|-----------|------------|
| [docs/SPRINTS.md](./docs/SPRINTS.md) | Roadmap por sprints y checklists de avance |
| [docs/SPEC.md](./docs/SPEC.md) | Visión, roles, alertas, stack, despliegue |
| [docs/DATABASE.md](./docs/DATABASE.md) | Tablas alineadas con la API, RLS |
| [docs/SCRAPING.md](./docs/SCRAPING.md) | Endpoints GET `:448/api/v2`, cron optimizado |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Clean Architecture y rutas Next |
| [docs/TELEGRAM.md](./docs/TELEGRAM.md) | **Setup del bot, webhook y guía para estudiantes** |

## Integración judicial (MVP)

- **Cliente HTTP** (`src/infrastructure/scraping/RamaJudicialClient.ts`): sin Playwright ni API keys.
- **Base API:** `https://consultaprocesos.ramajudicial.gov.co:448/api/v2` (detalle en `docs/SCRAPING.md`).

## Notificaciones por Telegram

- Alertas de inmediato tras cada sincronización (agrupadas por caso en Telegram).
- **Resumen diario** (~7:00 a.m. Colombia) con el resto de novedades.
- Los estudiantes (y admins) vinculan su cuenta en **Perfil → Conectar Telegram**.
- Los admins pueden **seguir casos** concretos desde la ficha del expediente.

Guía completa: [docs/TELEGRAM.md](./docs/TELEGRAM.md).

## Base de datos

Migraciones en `supabase/migrations/` (aplicar en orden hasta `00007_telegram_and_subscriptions.sql`):

- `00001` — esquema inicial y RLS
- `00002` — trigger perfil al registrarse
- `00003` — RLS profiles sin recursión
- `00004` — histórico `email_sent_at` (sustituido en `00007`)
- `00005` — constraint upsert alertas
- `00006` — cola `sync_queue` + funciones enqueue/claim
- `00007` — Telegram en `profiles`, `caso_suscriptores`, `telegram_sent_at`

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

1. Aplicar migraciones (incl. `00007_telegram_and_subscriptions.sql`).
2. Crear bot en Telegram y configurar secrets (ver [docs/TELEGRAM.md](./docs/TELEGRAM.md)).
3. Desplegar Edge Functions: `sync-tick`, `sync-one-caso`, `health-check`, `telegram-webhook`, `student-daily-digest`, `sync-judicial-casos` (solo encola).
4. Secrets en Supabase: `CRON_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`, `APP_PUBLIC_URL`, `HEALTH_STALE_HOURS`, `HEALTH_UNREAD_CRITICAL_HOURS`.
5. Registrar webhook de Telegram (una vez, ver guía).
6. Crons en **Integrations → Cron** (ver [docs/SCRAPING.md §11](./docs/SCRAPING.md)):
   - SQL diario: `select enqueue_daily_sync_jobs();`
   - HTTP cada 2 min: `POST .../sync-tick` con `Authorization: Bearer CRON_SECRET`
   - HTTP diario: `POST .../functions/v1/student-daily-digest` (resumen Telegram)
   - HTTP diario: `POST .../health-check` con el mismo Bearer

La sincronización manual sigue en la ficha del caso («Sincronizar con Rama Judicial»).

## Variables de entorno

Configurar `.env.local` (ver [.env.local.example](./.env.local.example)): `NEXT_PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`, opcional `TELEGRAM_BOT_TOKEN` y `NEXT_PUBLIC_APP_URL` para sync manual con notificaciones. **`SUPABASE_SERVICE_ROLE_KEY`** solo en servidor. Crons y secrets de Edge Functions van en **Supabase**, no en Vercel.
