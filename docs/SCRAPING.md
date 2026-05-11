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

## 3. Optimización del job diario

1. **GET** `NumeroRadicacion` para el radicado del caso.
2. Comparar `fechaUltimaActuacion` (fecha del API) con `casos.fecha_ultima_actuacion_remota`.
3. Si son **iguales** → registrar log `no_changes` y **no** llamar a `Actuaciones`.
4. Si **cambió** → **GET** `Actuaciones` (todas las páginas hasta `cantidadPaginas`), insertar solo `id_reg_actuacion` nuevos, ejecutar alertas, actualizar `fecha_ultima_actuacion_remota` y `fecha_ultimo_scraping`.

Al **registrar** caso nuevo: llamar `Detalle` + `Actuaciones` al menos una vez (y opcionalmente no repetir `Detalle` en cada cron si los datos estáticos no requieren refresco diario).

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

- Llamadas a la API judicial **solo desde servidor**: en el MVP el **job recurrente corre en Supabase** (p. ej. Edge Function programada con `fetch` a la Rama y cliente Supabase con **service role** para escribir en DB). La UI puede disparar **on-demand** vía Next (Server Action / Route Handler) con el usuario autenticado y RLS, sin exponer la API judicial al navegador.
- Si el job se invoca por HTTP interno (`pg_net` → Edge Function), proteger con **secret** en cabecera o mecanismo recomendado por Supabase; no usar un cron en Vercel como único planificador.
- No loguear cuerpos JSON completos en producción si contienen datos personales; truncar en debug.

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

- Tipos y cliente: `src/infrastructure/scraping/types.ts`, `src/infrastructure/scraping/RamaJudicialClient.ts`
