# Integración judicial — API Consulta Procesos (Rama Judicial)

Complemento de [SPEC.md](./SPEC.md). Contrato **cerrado por spike** (Mayo 2026): integración vía **HTTP JSON** sin navegador headless en el MVP.

**Portal UI:** [https://consultaprocesos.ramajudicial.gov.co/Procesos/NumeroRadicacion](https://consultaprocesos.ramajudicial.gov.co/Procesos/NumeroRadicacion)  
**Base API:** `https://consultaprocesos.ramajudicial.gov.co:448/api/v2`

---

## 1. Endpoints confirmados

Todas las peticiones son **GET**, respuesta **`application/json`**, **`access-control-allow-origin: *`**, sin token ni cookie obligatoria en el spike.

### 1.1 Búsqueda por número de radicado

```
GET /api/v2/Procesos/Consulta/NumeroRadicacion?numero={radicado}&SoloActivos=false&pagina={n}
```

- **`SoloActivos=false`:** equivale a “consulta completa” en la UI (incluye no activos).
- **`pagina`:** paginación (`paginacion` en el JSON).
- Respuesta incluye `procesos[]` con al menos: `idProceso`, `idConexion`, `llaveProceso`, `fechaProceso`, `fechaUltimaActuacion`, `despacho`, `departamento`, `sujetosProcesales`, `esPrivado`, `cantFilas`.

### 1.2 Detalle del proceso

```
GET /api/v2/Proceso/Detalle/{idProceso}
```

- **`{idProceso}`:** el mismo entero que devuelve el listado (ej. `220961860`), **no** `idRegProceso` del cuerpo de detalle.
- Enriquece: `tipoProceso`, `claseProceso`, `subclaseProceso`, `ponente`, `codDespachoCompleto`, `ubicacion`, `recurso`, `fechaConsulta`, `ultimaActualizacion`, etc.

### 1.3 Actuaciones (paginado)

```
GET /api/v2/Proceso/Actuaciones/{idProceso}?pagina={n}
```

- Cada ítem incluye: `idRegActuacion`, `consActuacion`, `fechaActuacion`, `actuacion`, `anotacion`, `fechaInicial`, `fechaFinal`, `fechaRegistro`, `codRegla`, `conDocumentos`, `cant`, `llaveProceso`.

---

## 2. Mapeo a persistencia

| API | Columna sugerida (`casos` o `actuaciones`) |
|-----|---------------------------------------------|
| `fechaUltimaActuacion` | `fecha_ultima_actuacion_remota` (date) — optimización cron |
| `sujetosProcesales` | `sujetos_procesales` (text) |
| `despacho`, `departamento` | mismos nombres; **trim** espacios finales en `despacho` |
| `idRegActuacion` | `id_reg_actuacion` + **UNIQUE (`caso_id`, `id_reg_actuacion`)** |
| `fechaInicial` / `fechaFinal` | `fecha_inicio_termino` / `fecha_fin_termino` (date, nullable) |
| `actuacion` | `actuacion` (text; **trim**; a veces viene con espacio inicial) |
| `codRegla` | `cod_regla` (**trim**; suele venir con espacios) |
| Fechas ISO sin zona (`...T00:00:00`) | Normalizar a **DATE** en zona Colombia (documentar en código) |

---

## 3. Optimización del sync por caso

Por cada trabajo `full_sync` en cola (un caso):

1. **GET** `NumeroRadicacion` para el radicado del caso.
2. Comparar `fechaUltimaActuacion` (fecha del API) con `casos.fecha_ultima_actuacion_remota`.
3. Si son **iguales** → registrar log `no_changes`, **recalcular** severidad/alertas (el plazo sigue corriendo) y **no** llamar a `Actuaciones`.
4. Si **cambió** → **GET** `Actuaciones` (todas las páginas hasta `cantidadPaginas`), insertar solo `id_reg_actuacion` nuevos, ejecutar alertas, actualizar `fecha_ultima_actuacion_remota` y `fecha_ultimo_scraping`.

Trabajos `recalc_only` en cola: solo recálculo de severidad/alertas/`estado_critico` **sin** llamar a la Rama (garantía si la API judicial falla).

Al **registrar** caso nuevo: sincronizar on-demand desde la UI; el cron `enqueue-due` encolará la primera sonda según `next_check_at`.

**Polling adaptativo:** ver [POLLING.md](./POLLING.md). Entre sondas solo se usa `NumeroRadicacion` si no hubo cambio; la cadencia depende de `polling_tier` y horario hábil Colombia (lun–vie 6–19 h).

---

## 4. Casos de respuesta y `scraping_logs.status`

| Situación | `status` | Acción |
|-----------|----------|--------|
| Radicado con formato inválido | `invalid_format` | No llamar API |
| `procesos.length === 0` | `not_found` | Error de producto al usuario |
| HTTP 5xx / timeout / JSON inválido | `error` | Reintento con backoff; log mensaje |
| Sincronización OK con nuevas actuaciones | `success` | `actuaciones_nuevas` > 0 si aplica |
| Sin cambios (`fechaUltimaActuacion` igual) | `no_changes` | Sin llamada a Actuaciones |

---

## 5. Deduplicación

- **Clave natural:** `id_reg_actuacion` por caso (`UNIQUE (caso_id, id_reg_actuacion)`).
- No hace falta hash de fila si la API garantiza ids estables.

---

## 6. Rate limiting y buenas prácticas

- Pausa configurable entre radicados en el job (p. ej. 2–5 s).
- Timeout por request (p. ej. 30 s).
- `User-Agent` identificable (p. ej. nombre del proyecto + contacto técnico).
- Respetar `cantidadPaginas` en actuaciones.

---

## 7. Seguridad operativa

- Llamadas a la API judicial **solo desde servidor**: jobs en **Supabase Edge Functions** con **service role**; la UI sincroniza on-demand vía Next (Server Action) con usuario autenticado.
- Todas las funciones programadas exigen `Authorization: Bearer CRON_SECRET` (`verify_jwt = false` en [`supabase/config.toml`](../supabase/config.toml)).
- No usar cron en Vercel como planificador principal.
- No loguear cuerpos JSON completos en producción si contienen datos personales.

**Edge Functions:**

| Función | Rol |
|---------|-----|
| `sync-judicial-casos` | Solo encola (`enqueue_daily_sync_jobs`); compatibilidad cron antiguo |
| `sync-tick` | Reclama cola y dispara `sync-one-caso` (respuesta &lt; 5 s) |
| `sync-one-caso` | Un caso: `full_sync` o `recalc_only` |
| `health-check` | Alarma de salud por Telegram a admins |
| `telegram-webhook` | Vinculación `/start <código>` (público, `?token=`) |
| `student-daily-digest` | Resumen diario por Telegram |

**Secrets Supabase:** `CRON_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`, `APP_PUBLIC_URL`, opcional `HEALTH_STALE_HOURS`, `HEALTH_UNREAD_CRITICAL_HOURS`.

---

## 8. Pruebas

- Fixtures JSON anonimizados en [samples/api-rama-judicial/](./samples/api-rama-judicial/).
- Tests de contrato: mock `fetch` con respuestas guardadas.
- Prueba manual periódica con radicado de ejemplo acordado con el consultorio.

---

## 9. Contingencia (no MVP)

Si la API deja de ser accesible desde la red de salida del entorno donde corre el job (p. ej. Supabase Edge), introduce auth por IP, o rompe el contrato JSON:

1. Reintentar y alertar a admin.
2. Valorar **Playwright** en worker (Railway/Fly/VPS) o **Browserless**, implementando el mismo contrato `IJudicialConsultaService` en `infrastructure/`.

---

## 10. Referencia de implementación en repo

- Tipos y cliente (Next): `src/infrastructure/scraping/types.ts`, `src/infrastructure/scraping/RamaJudicialClient.ts`
- Edge compartido: `supabase/functions/_shared/`
- Cola SQL: `supabase/migrations/00006_sync_queue.sql`, snippet `supabase/sql/enqueue_daily.sql`

---

## 11. Arquitectura de cola y crons (fiabilidad)

```text
enqueue-due (SQL cada 5 min)
  → full_sync para casos con next_check_at vencido (sin job activo)

enqueue_daily (SQL, 09:00 UTC ≈ 4:00 Colombia)
  → respaldo full_sync + recalc_only por caso activo

sync-tick (HTTP cada 2 min, timeout panel 5000 ms OK)
  → reap_stale_running_jobs(15)
  → claim_sync_queue(5)
  → POST sync-one-caso (pausa ~800 ms entre casos)

sync-one-caso
  → Rama (si full_sync) + recompute + schedule_next_caso_check
  → Telegram alertas pendientes + sync_queue done | failed

student-daily-digest (HTTP 10:00 UTC ≈ 5:00 Colombia)
  → resumen Telegram por perfil vinculado

health-check (HTTP diario)
  → Telegram a admins si casos stale o críticas sin leer
```

### Crons (migración `supabase/migrations/00008_cron_jobs.sql`)

Aplicar con `supabase db push` o MCP. Una vez: `.\scripts\setup-cron-vault.ps1` (guarda `CRON_SECRET` en Vault).

### Crons recomendados (referencia)

| Nombre | Tipo | Schedule (UTC) | Target |
|--------|------|----------------|--------|
| `enqueue-due` | SQL Snippet | `*/5 * * * *` | `select enqueue_due_sync_jobs();` |
| `enqueue-daily` | SQL Snippet | `0 9 * * *` | `select enqueue_daily_sync_jobs();` (4:00 Colombia) |
| `sync-tick` | HTTP POST | `*/2 * * * *` | `.../functions/v1/sync-tick` + Bearer `CRON_SECRET` |
| `student-daily-digest` | HTTP POST | `0 10 * * *` | `.../functions/v1/student-daily-digest` + Bearer (5:00 Colombia) |
| `health-check` | HTTP POST | `0 13 * * *` | `.../functions/v1/health-check` + Bearer |

Timeout HTTP del cron de Supabase: **máx. 5000 ms** en el panel. `sync-tick` solo encola invocaciones y responde al instante; el trabajo pesado ocurre en `sync-one-caso` (límite Edge ~150 s en plan Free).

### Reintentos (cola)

Backoff tras fallo transitorio: 5 min → 30 min → 2 h → 6 h → 24 h. Errores permanentes (`invalid_format`, `not_found`) no reintentan.

### Deuda técnica

Reglas de severidad duplicadas en `src/domain/services/alert-severity.ts` y `supabase/functions/_shared/severidad.ts`; mantener alineadas al cambiar patrones o plazos.
