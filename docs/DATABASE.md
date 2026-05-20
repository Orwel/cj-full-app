# Modelo de datos — Supabase / PostgreSQL

Complemento de [SPEC.md](./SPEC.md). Alineado con la **API real** de consulta procesos y con la migración `supabase/migrations/00001_initial_schema.sql`.

---

## 1. Convenciones

- **IDs internos:** `uuid` con `gen_random_uuid()` salvo `auth.users.id` en `profiles`.
- **IDs remotos:** `bigint` / `integer` según la API (`id_proceso`, `id_reg_actuacion`, etc.).
- **Timestamps:** `timestamptz` con sufijo `_at` donde aplique; fechas “de negocio” del portal como `date`.
- **Nomenclatura SQL:** `snake_case`.

---

## 2. Formato del radicado

- **Regla:** exactamente **23 dígitos** (`^[0-9]{23}$`), columna `radicado_judicial`.
- Coincide con `llaveProceso` de la API.

---

## 3. Tablas

### 3.1 `profiles`

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | `uuid` PK | `REFERENCES auth.users(id) ON DELETE CASCADE` |
| `full_name` | `text` NOT NULL | |
| `email` | `text` NOT NULL | |
| `role` | `text` NOT NULL | `CHECK (role IN ('admin','student'))` |
| `created_at` | `timestamptz` | default `now()` |

---

### 3.2 `casos`

**Origen consultorio:** `numero_caso`, `radicado_judicial`, **`area`** (elegida por el estudiante: `civil` \| `laboral` \| `penal` \| `familia` \| `administrativo`), `student_id`, `notas`.

**Origen API (listado `NumeroRadicacion`):**

| Columna | Tipo | API |
|---------|------|-----|
| `id_proceso` | `bigint` | `idProceso` |
| `id_conexion` | `integer` | `idConexion` |
| `despacho` | `text` | `despacho` (trim) |
| `departamento` | `text` | `departamento` |
| `sujetos_procesales` | `text` | `sujetosProcesales` |
| `fecha_proceso` | `date` | `fechaProceso` |
| `fecha_ultima_actuacion_remota` | `date` | `fechaUltimaActuacion` — optimización cron |
| `es_privado` | `boolean` | `esPrivado` (proceso **reservado** en portal; no “rama privada”) |

**Origen API (`Detalle`):**

| Columna | Tipo | API |
|---------|------|-----|
| `id_reg_proceso` | `bigint` | `idRegProceso` |
| `cod_despacho_completo` | `text` | `codDespachoCompleto` |
| `ponente` | `text` | `ponente` |
| `tipo_proceso` | `text` | `tipoProceso` |
| `clase_proceso` | `text` | `claseProceso` |
| `subclase_proceso` | `text` | `subclaseProceso` |
| `recurso` | `text` | `recurso` |
| `ubicacion` | `text` | `ubicacion` |

**Operativo:**

| Columna | Tipo | Notas |
|---------|------|--------|
| `estado_critico` | `boolean` | default `false`; puede recalcularse con actuaciones/alertas |
| `scraping_activo` | `boolean` | default `true` |
| `fecha_ultimo_scraping` | `timestamptz` | |
| `created_at` / `updated_at` | `timestamptz` | trigger `updated_at` recomendado |

**Restricciones:** `UNIQUE (numero_caso)`; `UNIQUE (id_proceso, id_conexion)` donde ambos no son null (en SQL ver migración: índice único parcial opcional).

**Índices:** `(student_id)`, `(radicado_judicial)`, `(scraping_activo)` parcial.

---

### 3.3 `actuaciones`

| Columna | Tipo | API / notas |
|---------|------|-------------|
| `id` | `uuid` PK | |
| `caso_id` | `uuid` FK | `ON DELETE CASCADE` |
| `id_reg_actuacion` | `bigint` NOT NULL | deduplicación |
| `cons_actuacion` | `integer` NOT NULL | orden dentro del proceso |
| `fecha_actuacion` | `date` NOT NULL | `fechaActuacion` |
| `actuacion` | `text` NOT NULL | `actuacion` (trim) |
| `anotacion` | `text` | `anotacion` |
| `fecha_inicio_termino` | `date` | `fechaInicial` |
| `fecha_fin_termino` | `date` | `fechaFinal` |
| `fecha_registro` | `date` | `fechaRegistro` |
| `con_documentos` | `boolean` | `conDocumentos` |
| `cod_regla` | `text` | `codRegla` (trim) |
| `severidad` | `text` | `CHECK` en `critica`, `urgente`, `atencion`, `informativa` — calculada al insertar/actualizar |
| `es_nueva` | `boolean` | default `true` |
| `scraped_at` | `timestamptz` | |

**UNIQUE:** `(caso_id, id_reg_actuacion)`.

**Índices:** `(caso_id, fecha_actuacion DESC)`; índice parcial en `fecha_fin_termino` donde no es null (alertas por plazo).

---

### 3.4 `alertas`

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | `uuid` PK | |
| `caso_id` | `uuid` FK | |
| `actuacion_id` | `uuid` FK | nullable `ON DELETE SET NULL` |
| `tipo_alerta` | `text` | `critica` \| `urgente` \| `atencion` \| `informativa` |
| `titulo` | `text` NOT NULL | |
| `mensaje` | `text` NOT NULL | |
| `leida` | `boolean` | default `false` |
| `leida_por` | `uuid` FK → `profiles` | |
| `leida_at` | `timestamptz` | |
| `created_at` | `timestamptz` | |

---

### 3.5 `scraping_logs`

| Columna | Tipo | `status` |
|---------|------|----------|
| `id` | `uuid` PK | |
| `caso_id` | `uuid` FK | nullable |
| `radicado` | `text` NOT NULL | |
| `status` | `text` | `success` \| `error` \| `not_found` \| `invalid_format` \| **`no_changes`** |
| `error_message` | `text` | |
| `actuaciones_nuevas` | `int` | default `0` |
| `duration_ms` | `int` | |
| `created_at` | `timestamptz` | |

---

### 3.6 `sync_queue`

Cola de trabajos de sincronización (un registro por caso, día y tipo de job).

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | `uuid` PK | |
| `caso_id` | `uuid` FK → `casos` | `ON DELETE CASCADE` |
| `scheduled_date` | `date` | Día del lote (default `current_date`) |
| `job_type` | `text` | `full_sync` \| `recalc_only` |
| `status` | `text` | `pending` \| `running` \| `done` \| `failed` |
| `attempts` | `int` | Reintentos consumidos |
| `max_attempts` | `int` | default `5` |
| `next_attempt_at` | `timestamptz` | Backoff entre reintentos |
| `last_error` | `text` | Último mensaje de error |
| `locked_at` | `timestamptz` | Claim del worker |
| `created_at` / `updated_at` | `timestamptz` | |

**UNIQUE:** `(caso_id, scheduled_date, job_type)`.

**Funciones SQL (service role):**

- `enqueue_daily_sync_jobs()` — encola `full_sync` + `recalc_only` para casos con `scraping_activo`.
- `claim_sync_queue(p_limit)` — reclama filas `pending`/`failed` con `FOR UPDATE SKIP LOCKED`.

**RLS:** lectura solo admin; escritura vía service role (Edge Functions).

---

## 4. Row Level Security (RLS)

Políticas mínimas (detalle en migración):

1. **`profiles`:** cada usuario lee/actualiza su fila; admin puede leer todas.
2. **`casos`:** estudiante `SELECT`/`UPDATE` donde `student_id = auth.uid()`; admin `ALL` (o `SELECT` global + políticas de escritura según producto).
3. **`actuaciones` / `alertas`:** acceso vía `EXISTS` al caso permitido para ese `auth.uid()`.
4. **`scraping_logs`:** lectura admin; inserción preferible con **service role** desde el worker de scraping (p. ej. **Supabase Edge Function** del job programado), no desde el cliente.
5. **`sync_queue`:** lectura admin; escritura y claim vía **service role** desde Edge Functions (`sync-tick`, `sync-one-caso`).

---

## 5. Triggers

- `updated_at` en `casos` en cada `UPDATE`.

---

## 6. Variables de entorno

Ver [README.md](../README.md) y `.env.local.example`. La Rama Judicial **no** usa variables propias (URL fija en código).
