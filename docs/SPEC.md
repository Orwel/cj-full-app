# SPEC: Sistema de Monitoreo Judicial — Consultorio Jurídico

**Versión:** 1.1.0  
**Última actualización:** Mayo 2026  
**Estado:** Spec cerrado — listo para Fase 1 (implementación)

---

## 1. Resumen ejecutivo

Dashboard web para monitoreo automatizado de procesos judiciales radicados en la Rama Judicial de Colombia. El sistema consume la **API JSON pública** del portal de consulta (`consultaprocesos.ramajudicial.gov.co:448`) por **número de radicado**, detecta novedades y genera **alertas** orientadas a plazos (incluyendo `fechaInicial` / `fechaFinal` de actuaciones cuando existan), desistimientos tácitos y otras novedades procesales relevantes para el consultorio.

### Objetivo principal

> Garantizar que los procesos asignados queden monitoreados de forma continua, con alertas oportunas ante actuaciones y plazos críticos, reduciendo sorpresas procesales.

---

## 2. Alcance inicial

| Incluido (MVP) | Fuera de alcance inicial |
|----------------|--------------------------|
| Consulta por radicado vía API oficial (sin browser) | Playwright / VPS (solo contingencia documentada en [SCRAPING.md](./SCRAPING.md)) |
| Áreas elegidas por el estudiante al registrar el caso | Inferir `area` desde el nombre del juzgado |
| Datos de juzgado, departamento y sujetos desde la API (solo lectura / enriquecimiento) | OCR de PDFs adjuntos |
| Roles admin y estudiante | — |
| Job programado (Supabase cron) + consulta on-demand (botón) | App móvil nativa |
| Notificaciones por **Telegram** (inmediatas + resumen diario) | — |
| Admin: ver todos los casos y filtrar/agrupar por `area` | — |

---

## 3. Usuarios y roles

### 3.1 Admin (profesores / directores)

- Ver **todos** los casos del consultorio; filtrar y agrupar por **`area`** (civil, laboral, penal, familia, administrativo).
- Crear, editar y asignar casos a estudiantes.
- Gestionar usuarios (alta de estudiantes vía Supabase Auth + `profiles`).
- Ver alertas globales y logs de scraping (auditoría).
- Exportación básica (CSV/Excel en fase posterior si se requiere).

### 3.2 Estudiante

- Ver solo casos donde `student_id` = su usuario.
- **Define `area`** al registrar el caso (obligatorio en el formulario); no se infiere desde el despacho.
- Ingresa el **radicado** (23 dígitos): el sistema valida formato y llama a la API; si `procesos.length === 0`, no se persiste el caso (o se muestra error claro según UX acordada).
- Marcar alertas como leídas / atendidas (según RLS en [DATABASE.md](./DATABASE.md)).
- Ver historial de actuaciones, despacho, sujetos procesales y datos de detalle devueltos por la API.

---

## 4. Reglas de negocio — alertas

La severidad final es **`max(severidad_por_plazo, severidad_por_patron)`** con orden: `critica` > `urgente` > `atencion` > `informativa`.

### 4.1 Por plazo (`fechaFinal` de la actuación en API → `fecha_fin_termino` en DB)

| Severidad | Criterio (días **hábiles** entre hoy y `fecha_fin_termino`) |
|-----------|-------------------------------------------------------------|
| **Crítica** | Término ya vencido (`< 0`) o ≤ 3 días hábiles |
| **Urgente** | ≤ 7 días hábiles |
| **Atención** | > 7 días hábiles pero existe término definido |
| **Informativa** | Sin `fecha_fin_termino` (null) |

> **Nota implementación:** “días hábiles” en Colombia excluye sábados, domingos y festivos nacionales; el MVP puede arrancar con días corridos y refinar con calendario de festivos.

### 4.2 Por patrón (texto en `actuacion` + `anotacion`)

Ejemplos (lista viva en código; ver [SCRAPING.md](./SCRAPING.md)):

| Patrón (regex / contiene) | Severidad base | Ejemplo |
|---------------------------|----------------|---------|
| demanda rechazada | crítica | Reposición / subsanación |
| desistimiento tácito | crítica | Impulso procesal |
| sentencia, fallo | urgente | Apelación |
| nulidad | urgente | Revisión |
| apelación | atención | Estado del recurso |
| traslado | atención | Plazo del auto |
| auto admisorio | atención | Notificación |
| ejecutoria | atención | Cumplimiento |

---

## 5. Flujo de alto nivel

1. Estudiante (o admin) ingresa **radicado**, **área** y datos de asignación.
2. **Validación de formato** (23 dígitos — [DATABASE.md](./DATABASE.md)).
3. **GET** `NumeroRadicacion` → si no hay procesos, error “no encontrado”.
4. **GET** `Detalle/{idProceso}` y **GET** `Actuaciones/{idProceso}` (paginado) → persistir caso + actuaciones; deduplicar por `id_reg_actuacion`.
5. Motor de alertas sobre actuaciones nuevas o con término próximo.
6. **Polling adaptativo** (Supabase `pg_cron`): `enqueue-due` cada 5 min encola sondas según `next_check_at`; `sync-tick` procesa la cola. Por caso: **GET** `NumeroRadicacion`; si `fechaUltimaActuacion` no cambió, **omitir** `Actuaciones`; si cambió, sincronizar y alertar. Respaldo diario + `recalc_only` vía `enqueue-daily`. Detalle: [POLLING.md](./POLLING.md).
7. **On-demand:** mismo pipeline que el job, disparado desde UI (“Actualizar”).
8. Dashboard: casos por área (admin), timeline de actuaciones, alertas pendientes.

---

## 6. Stack y despliegue

| Capa | Tecnología |
|------|------------|
| Frontend / BFF | Next.js (App Router), TypeScript — **Vercel** |
| UI | Tailwind CSS + componentes (p. ej. shadcn/ui) |
| Datos / Auth | **Supabase** (PostgreSQL, Auth, RLS) |
| Integración judicial | **`fetch` HTTP** a API pública `https://consultaprocesos.ramajudicial.gov.co:448/api/v2/...` (sin API key; CORS `*` confirmado en spike) |
| Jobs | **Supabase** (p. ej. **Scheduled Edge Functions**, `pg_cron`, o `pg_net` hacia una Edge Function del mismo proyecto). Lógica de sincronización y uso de **service role** viven en Supabase, no en un cron de Vercel. |
| Notificaciones | **Telegram Bot API** (webhook + crons Edge) |
| Validación | Zod |

### 6.1 Despliegue (cerrado en spike)

- **App y rutas API en Vercel.** No se requiere VPS ni servicio de browser para el MVP.
- **Variables de entorno (app Next):** credenciales Supabase públicas/anon para el cliente. **Secrets del job** (p. ej. service role para escritura desde Edge Function) se configuran en el panel de Supabase, no en Vercel por el cron. La base URL de la Rama Judicial es **constante en código** (no es secreto).
- **Contingencia:** si la API deja de ser accesible desde servidor o cambia el contrato, valorar Playwright en worker externo; la interfaz `IJudicialConsultaService` en `domain` permite sustituir implementación sin tocar casos de uso (ver [ARCHITECTURE.md](./ARCHITECTURE.md)).

---

## 7. Arquitectura de código (Clean Architecture)

Estructura bajo `src/`:

- **`domain/`** — Entidades y contratos (p. ej. `IJudicialConsultaService`). Sin dependencias de frameworks.
- **`application/`** — Casos de uso. Depende solo de `domain/`.
- **`infrastructure/`** — `RamaJudicialHttpClient`, repositorios Supabase, email.
- **`presentation/`** — `src/app` (Next), componentes UI.

Las dependencias apuntan **hacia dentro**: `presentation` → `application` → `domain`; `infrastructure` implementa contratos de `domain`.

```text
[presentation] → [application] → [domain]
                      ↑
              [infrastructure]
```

---

## 8. Fases de implementación

### Fase 0 — Documentación y estructura

**Completada:** docs, spike de API, migración inicial en repo, cliente HTTP de referencia.

### Fase 1 — Fundación

- `create-next-app` + Supabase: auth, `profiles`, RLS, CRUD casos (persistir campos API + área del estudiante).

### Fase 2 — Integración judicial

- Caso de uso: validar radicado → consulta → persistencia; paginación de actuaciones; logs `scraping_logs` incl. `no_changes`.

### Fase 3 — Alertas

- Cálculo `max(plazo, patrón)`; UI de alertas; `estado_critico` derivado o actualizado por job.

### Fase 4 — Automatización

- Programación y ejecución del job **en Supabase** (Edge Function + cron y/o `pg_cron`); reintentos; pausa entre radicados en lote.

### Fase 5 — Notificaciones por Telegram

- Bot de Telegram: vinculación desde **Perfil** (`/start <código>`).
- Alertas **críticas/urgentes** inmediatas tras cada sync.
- **Resumen diario** (`student-daily-digest`) con el resto de severidades.
- Admins: suscripción manual por caso (`caso_suscriptores`).
- Guía operativa: [TELEGRAM.md](./TELEGRAM.md).

---

## 9. Referencias cruzadas

- Modelo de datos: [DATABASE.md](./DATABASE.md)
- Contrato API y flujos: [SCRAPING.md](./SCRAPING.md)
- Carpetas y capas: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Fixtures JSON anonimizados: [samples/api-rama-judicial/](./samples/api-rama-judicial/)
- Raíz del repo: [README.md](../README.md)

---

## 10. Glosario

- **Radicado (`llaveProceso`):** 23 dígitos; identificador del proceso en consulta pública.
- **`idProceso`:** entero devuelto por la API; va en URL de `Detalle` y `Actuaciones` (no confundir con `idRegProceso` del JSON de detalle).
- **Actuación:** fila de la API con `idRegActuacion`, fechas y textos; puede incluir `fechaInicial` / `fechaFinal` de término.
- **Caso (interno):** registro del consultorio: radicado, **área elegida por estudiante**, `student_id`, más columnas enriquecidas desde la API.
- **`esPrivado` (API):** indica si el proceso es **reservado** en el portal; **no** significa “rama privada” del derecho.
