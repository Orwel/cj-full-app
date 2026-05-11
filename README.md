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

- [00001_initial_schema.sql](./supabase/migrations/00001_initial_schema.sql) — tablas y RLS
- [00002_auth_profile_trigger.sql](./supabase/migrations/00002_auth_profile_trigger.sql) — perfil al registrarse (rol `student`)

## Estructura del código

Capas bajo `src/`: `domain/`, `application/`, `infrastructure/`, `presentation/`. Rutas Next en `src/app/` (ver [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)).

## Primer administrador

Tras registrarte en la app (quedas como `student`), en el **SQL Editor** de Supabase:

```sql
update public.profiles
set role = 'admin'
where email = 'tu-correo@ejemplo.com';
```

## Próximo paso

Seguir [docs/SPRINTS.md](./docs/SPRINTS.md): Sprint 3 (motor de alertas y UI). La sincronización on-demand con la Rama ya está en la ficha de cada caso (`Sincronizar con Rama Judicial`).

## Variables de entorno

Configurar `.env.local` (ver [.env.local.example](./.env.local.example)): `NEXT_PUBLIC_SUPABASE_*` para la app, y **`SUPABASE_SERVICE_ROLE_KEY`** solo en el servidor para la acción «Sincronizar con Rama Judicial» (escritura de `actuaciones` y `scraping_logs`). La URL de la Rama Judicial **no** va en env (constante en código). El **cron recurrente** y sus secrets se configuran **en Supabase** (Edge Function programada, etc.), no en Vercel.
