# Roadmap por sprints — CJ Full App

**Leyenda:** `[x]` hecho · `[ ]` pendiente · `[~]` en curso (opcional)

**Última revisión:** 2026-05-11  
**Alineado con:** [SPEC.md](./SPEC.md) (fases 0–5)

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

- [ ] Cálculo por plazo (días hábiles Colombia; MVP puede arrancar con días corridos y refinar)
- [ ] Patrones en texto de actuación / anotación (lista viva en código)
- [ ] Inserción o actualización de `alertas` y severidad en `actuaciones`
- [ ] UI de alertas y marcar como leída (coherente con RLS)
- [ ] Campo `estado_critico` en `casos` (derivado o actualizado tras sync / job)

---

## Sprint 4 — Automatización (solo Supabase)

**Objetivo:** Job diario programado y ejecutado en Supabase, sin cron en Vercel.

- [ ] Worker (p. ej. **Edge Function**) con `fetch` a la API judicial y escritura con **service role**
- [ ] Programación: Scheduled Edge Functions y/o `pg_cron` (y `pg_net` si aplica al diseño)
- [ ] Optimización: comparar `fechaUltimaActuacion` con `fecha_ultima_actuacion_remota` antes de paginar actuaciones
- [ ] Reintentos con backoff, pausa entre radicados, timeouts
- [ ] Secretos del job únicamente en Supabase

---

## Sprint 5 — Notificaciones (opcional)

**Objetivo:** Correo en alertas críticas y/o resumen diario.

- [ ] Integración proveedor (p. ej. Resend) y plantillas mínimas
- [ ] Disparo desde el job o tras creación de alertas relevantes
- [ ] Controles básicos (no duplicar envíos innecesarios)

---

## Changelog (ejemplo de uso)

| Fecha | Cambio |
|-------|--------|
| 2026-05-11 | Creado `SPRINTS.md`; enlaces en `docs/README.md` y README raíz; guía primer admin en README; Sprint 0 y Sprint 1 al día según repo. |
| 2026-05-11 | Sprint 2: `IJudicialConsultaService`, `SincronizarCasoJudicialUseCase`, service role para `actuaciones`/`scraping_logs`, botón sincronizar, `ActuacionesTable`, `.env.local.example`. Pendiente: tests con fixtures. |
