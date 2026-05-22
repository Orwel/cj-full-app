# Roadmap por sprints — CJ Full App

**Leyenda:** `[x]` hecho · `[ ]` pendiente · `[~]` en curso (opcional)

**Última revisión:** 2026-05-19  
**Alineado con:** [SPEC.md](./SPEC.md) (fases 0–5 + fiabilidad operativa)

Al cerrar trabajo, cambiar `[ ]` → `[x]`. Opcional: añadir al final una sección **Changelog** con fecha y PR.

---

## Sprint 0 — Documentación y cimientos de datos / API

**Objetivo:** Spec cerrado, modelo BD, contrato scraping, spike API.

- [x] SPEC, DATABASE, SCRAPING, ARCHITECTURE
- [x] Migración esquema inicial (`profiles`, `casos`, `actuaciones`, `alertas`, `scraping_logs`, RLS)
- [x] Cliente HTTP de referencia (`RamaJudicialClient`, tipos en `src/infrastructure/scraping/`)
- [x] Arquitectura de jobs documentada: cron en **Supabase** (no dependencia de cron en Vercel)

---

## Sprint 1 — Fundación producto (Next + Auth + CRUD casos)

**Objetivo:** App usable por admin y estudiante con casos persistidos (campos del consultorio).

- [x] Proyecto Next (App Router, TypeScript, Tailwind) en el repo
- [x] Integración Supabase (cliente servidor / navegador, middleware de sesión)
- [x] Pantallas login y registro
- [x] Perfil al crear usuario: migración `00002_auth_profile_trigger.sql` + políticas RLS existentes
- [x] CRUD casos en UI (listado, alta, edición, borrado solo admin)
- [x] Validación en formulario (radicado 23 dígitos, área, asignación estudiante para admin)
- [x] Casos de uso + repositorio Supabase + `createCasosContext()` (composition root mínimo)
- [x] Guía explícita “primer usuario admin” en README (SQL en Supabase)
- [ ] Tests automatizados de auth / CRUD — *opcional según prioridad del equipo*

**Nota:** Los campos de `casos` que vienen de la API se completan al **sincronizar** (Sprint 2), no en el alta manual.

---

## Sprint 2 — Integración judicial (API → persistencia)

**Objetivo:** Radicado válido implica datos de la Rama en BD, actuaciones y logs de scraping.

- [x] Contrato `IJudicialConsultaService` en `domain` + implementación `RamaJudicialConsultaService`
- [x] Caso de uso: validar formato → `NumeroRadicacion` → error claro si `procesos.length === 0`
- [x] Persistir respuesta de listado + `Detalle` en `casos` (mapeo según [DATABASE.md](./DATABASE.md))
- [x] `Actuaciones` con paginación completa; deduplicación por `id_reg_actuacion` (solo inserta nuevas)
- [x] Escribir `scraping_logs` (`success`, `error`, `not_found`, `invalid_format`, `no_changes`)
- [x] UI: acción «Sincronizar con Rama Judicial» en ficha del caso + tabla de actuaciones
- [x] Normalización de fechas API → columnas `DATE` (`src/infrastructure/scraping/date-judicial.ts`)
- [ ] Tests con fixtures en [samples/api-rama-judicial/](./samples/api-rama-judicial/) — *recomendado*

---

## Sprint 3 — Alertas

**Objetivo:** Severidad `max(plazo, patrón)` y experiencia en el dashboard.

- [x] Cálculo por plazo (días hábiles Colombia; MVP puede arrancar con días corridos y refinar)
- [x] Patrones en texto de actuación / anotación (lista viva en código)
- [x] Inserción o actualización de `alertas` y severidad en `actuaciones`
- [x] UI de alertas y marcar como leída (coherente con RLS)
- [x] Campo `estado_critico` en `casos` (derivado o actualizado tras sync / job)

---

## Sprint 4 — Automatización (solo Supabase)

**Objetivo:** Job programado en Supabase, sin cron en Vercel.

- [x] Worker Edge con `fetch` a la API judicial y escritura con **service role**
- [x] `pg_cron` + `pg_net` habilitados; cron HTTP en Integrations → Cron
- [x] Optimización `fechaUltimaActuacion` vs `fecha_ultima_actuacion_remota`
- [x] Reintentos con backoff en cola (Sprint 6); batch monolítico sustituido
- [x] Secretos del job en Supabase (`CRON_SECRET`, Resend opcional)

**Nota:** El cron HTTP de Supabase limita el **timeout de espera** del cliente a **5000 ms**; el diseño por cola (`sync-tick` + `sync-one-caso`) evita ese cuello de botella. Ver [SCRAPING.md §11](./SCRAPING.md).

---

## Sprint 5 — Notificaciones (Resend, sustituido)

**Objetivo:** ~~Correo~~ — reemplazado por Sprint 7 (Telegram).

- [x] Integración Resend (histórico; retirado en `00007`)
- [x] Disparo tras sync y health-check (histórico)

---

## Sprint 7 — Telegram + suscripciones admin

**Objetivo:** Notificaciones gratuitas por Telegram; admins siguen casos puntuales.

**Estado:** ✅ Implementación completada (2026-05-21). Smoke manual OK (vinculación + sync + mensaje agrupado).

- [x] Migración `00007`: `profiles` (Telegram), `caso_suscriptores`, `telegram_sent_at`
- [x] `_shared/telegram.ts`, `telegram-webhook`, `student-daily-digest`, `telegram-send-pending`
- [x] `sync-one-caso` y `health-check` usan Telegram (sin Resend)
- [x] Sync manual desde Next: todas las severidades, **un mensaje por caso**
- [x] UI `/dashboard/perfil`, toggle suscripción en ficha de caso
- [x] Documentación [TELEGRAM.md](./TELEGRAM.md), [INICIO_TELEGRAM.md](./INICIO_TELEGRAM.md)
- [ ] **QA pendiente:** resumen automático vía cron `student-daily-digest` (`0 10 * * *` UTC = 5:00 Colombia)
- [ ] **QA opcional:** `sync-tick` encola y `sync-one-caso` envía Telegram sin pulsar botón

---

## Sprint 6 — Fiabilidad operativa

**Objetivo:** Cola por caso, recálculo sin Rama, alarma de salud; escalar sin perder plazos.

- [x] Migración `00006_sync_queue` + funciones `enqueue_daily_sync_jobs`, `claim_sync_queue`
- [x] `_shared` unificado en `supabase/functions/_shared/`
- [x] Edge Functions: `sync-one-caso`, `sync-tick`, `health-check`
- [x] `sync-judicial-casos` deprecado → solo encola
- [x] Jobs `recalc_only` en cola (plazos sin depender de la Rama)
- [x] Documentación: [SCRAPING.md §11](./SCRAPING.md), [DATABASE.md §3.6](./DATABASE.md), crons recomendados
- [x] `.env.local.example` + README operación
- [ ] UI admin `/dashboard/admin/sync-queue` — *opcional*
- [ ] Días hábiles Colombia en `alert-severity.ts` — *refinar*
- [ ] Tests fixtures Sprint 2 / auth — *opcional*

---

## Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-05-11 | Creado `SPRINTS.md`; enlaces en `docs/README.md` y README raíz; guía primer admin en README; Sprint 0 y Sprint 1 al día según repo. |
| 2026-05-11 | Sprint 2: `IJudicialConsultaService`, `SincronizarCasoJudicialUseCase`, service role, botón sincronizar, `ActuacionesTable`, `.env.local.example`. |
| 2026-05-14 | Sprints 3–5: motor alertas, UI `/dashboard/alertas`, migraciones `00004`/`00005`, Edge `sync-judicial-casos`, Resend opcional. |
| 2026-05-19 | Sprint 6: cola `sync_queue`, `sync-tick`/`sync-one-caso`/`health-check`, recálculo `recalc_only`, docs y crons actualizados. |
| 2026-05-21 | Sprint 7: Telegram reemplaza Resend; webhook, digest diario, suscripciones admin, guía TELEGRAM.md. |
| 2026-05-21 | Sprint 7 cerrado en código: alertas inmediatas agrupadas (todas las severidades); smoke manual OK; pendiente QA digest automático. |
