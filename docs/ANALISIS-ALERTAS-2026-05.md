# Análisis de alertas y estados — Mayo 2026

**Fuente:** consultas SQL en Supabase (proyecto `tiodnudjbwouwhffboam`) + revisión de código (`alert-severity.ts`, `recompute.ts`).

**Muestra actual:** 72 actuaciones, 3 casos sincronizados (Alimentos, Civil, Constitucional).

---

## 1. Hallazgos principales

### 1.1 El caso de la captura (“Vencido 115d”, Crítica)

Corresponde al caso **Civil** (`id_proceso` 220961860), actuación **#4 — Fijación estado**:

| Campo | Valor |
|-------|--------|
| `fecha_actuacion` | 2026-01-23 |
| `fecha_fin_termino` | 2026-01-26 |
| `severidad` actual | `critica` |
| Días vencido (hoy) | ~119 |
| ¿Hay actuaciones posteriores? | **Sí** (#5–#8) |

El expediente **siguió** (envío a CSA, constancia, recepción de memoriales). La última actuación es **#8 Recepción memorial** (sin plazo). El caso en API tiene `ubicacion = **Archivo**`.

**Conclusión:** la alerta crítica es un falso positivo: plazo histórico ya “atendido” por actuaciones posteriores, en un proceso que además está en archivo según el portal.

### 1.2 Las 3 actuaciones `critica` de la base

| Caso | Cons. | Actuación | Plazo vencido | Posterior | Última del expediente |
|------|-------|-----------|---------------|-----------|------------------------|
| Civil | 1 | Radicación de Proceso | Sí (mismo día) | Sí | No |
| Civil | 4 | Fijación estado | Sí (~119d) | Sí | No |
| Constitucional | 1 | Radicación de Proceso | Sí (~4d) | Sí | No |

**100%** de plazos vencidos en la muestra tienen actuación posterior. Con la regla propuesta `atendido`, **ninguna** seguiría siendo crítica por plazo.

### 1.3 `estado_critico` del caso vs realidad

| Caso | `estado_critico` | Última actuación | `ubicacion` (API) |
|------|------------------|------------------|-------------------|
| Civil | `true` | Recepción memorial (informativa) | **Archivo** |
| Constitucional | `true` | Recepción memorial (informativa) | Secretaria - Términos |
| Alimentos | `false` | Aud. reparación integral (informativa) | Sin Ubicacion |

`estado_critico` queda encendido por actuaciones **antiguas** con plazo vencido, no por la situación actual del expediente.

### 1.4 Patrones de texto vs última actuación

En Civil, **#3 Demanda rechazada** está en `informativa` aunque el SPEC la marca como crítica, porque hoy los patrones solo se evalúan en `cons_actuacion = maxCons` (última = #8). Es un segundo bug de diseño: eventos graves en el medio del expediente no generan severidad por patrón.

### 1.5 Distribución de `cod_regla`

| `cod_regla` | Total | Casos | Texto ejemplo | Notas |
|-------------|-------|-------|---------------|--------|
| `00` | 69 | 3 | Al despacho, Radicación, Fijación estado, etc. | Casi todo el catálogo real |
| `01` | 3 | 1 (Alimentos) | `---` | Fechas `1970-01-01` — **dato basura de la API** |

Solo **2** códigos distintos en la muestra; `cod_regla` **no discrimina** tipos de actuación en lo sincronizado hoy. Las reglas deben apoyarse en:

1. `casos.ubicacion` (abierto / archivo / secretaría),
2. Texto normalizado de `actuacion` + `anotacion`,
3. Relación entre actuaciones (posterior / última),
4. `fecha_fin_termino` solo cuando el término sigue **abierto**.

Cuando haya más casos, conviene repetir el `GROUP BY cod_regla` y contrastar con una descarga cruda de la API (timeout en prueba manual).

### 1.6 Plazos en la muestra

| Métrica | Cantidad |
|---------|----------|
| Con `fecha_fin_termino` | 3 |
| Sin plazo | 69 |
| Plazo vencido | 3 |
| Plazo vigente (futuro) | 0 |

La Rama Judicial **casi nunca** envía `fechaFinal` en esta muestra; los únicos plazos aparecen en radicación (mismo día) y fijación de estado.

### 1.7 Tipos de actuación más frecuentes (texto)

Penal / alimentos domina: audiencias (Art. 103, 355, 339…), envíos entre grupos, recepción memorial. Civil/tutela: radicación, fijación estado, demanda rechazada, auto admite tutela, apelación.

---

## 2. Modelo propuesto (alineado con “abierto / archivado primero”)

### 2.1 Estado del **proceso** (`casos.estado_proceso`)

Derivado al recalcular, prioridad:

1. **Archivado** — `ubicacion` ILIKE `%archivo%` (ya existe en Civil) **o** última actuación con patrón de cierre (archivo, ejecutoria, terminación, etc.).
2. **Abierto** — en despacho / secretaría / términos / sin ubicación de archivo.
3. **Indeterminado** — sin sync o sin ubicación.

Mientras el proceso esté **archivado**, no se elevan alertas por plazos vencidos históricos (solo informativas o archivo).

### 2.2 Estado del **término** por actuación (`actuaciones.estado_termino`)

| Estado | Regla |
|--------|--------|
| `sin_termino` | `fecha_fin_termino` IS NULL |
| `vigente` | Plazo ≥ hoy y es la actuación con término **abierto** más reciente del caso (sin posterior que lo cierre) |
| `por_vencer` | Subconjunto de vigente con ≤ N días hábiles |
| `vencido_sin_respuesta` | Plazo &lt; hoy, sin actuación posterior, proceso **abierto** |
| `atendido` | Plazo &lt; hoy pero existe `cons_actuacion` mayor |
| `cerrado_proceso` | Proceso archivado o actuación histórica en expediente archivado |

### 2.3 Severidad de alerta (solo donde importa)

- **Crítica:** `vencido_sin_respuesta` en proceso abierto, o patrón crítico en la **última** actuación o en actuación sin posterior en los últimos X días.
- **Urgente / Atención:** plazos próximos o patrones medios en actuación “viva”.
- **Informativa:** `atendido`, `cerrado_proceso`, `sin_termino` sin patrón.

`estado_critico` del caso = existe alerta crítica **no leída** o actuación con `estado_termino = vencido_sin_respuesta` en proceso abierto.

---

## 3. Impacto en la muestra actual (simulación)

| Antes | Después (propuesto) |
|-------|---------------------|
| 3 actuaciones `critica` | 0 por plazo; revisar #3 “Demanda rechazada” si se evalúan patrones en actuaciones no últimas |
| 2 casos `estado_critico = true` | Civil → `false` (archivo + términos atendidos); Constitucional → revisar solo si hay plazo abierto en última |
| 3 alertas `critica` en tabla `alertas` | Deberían bajar a `informativa` tras `recalc_only` |

---

## 4. Plan de implementación (Fase B)

1. **Migración:** `casos.estado_proceso`, `actuaciones.estado_termino` (+ índices).
2. **Dominio:** extender `alert-severity.ts` con `estadoProceso`, `estadoTermino`, `severidadActuacion` nueva firma; espejo en `severidad.ts` (Edge).
3. **`recompute.ts`:** calcular estados antes de severidad; no marcar crítico si `estado_termino = atendido` o `estado_proceso = archivado`.
4. **UI:** badge de estado de proceso + sustituir “Vencido Nd” por “Plazo atendido” / “Histórico” cuando aplique.
5. **Catálogo:** tabla `actuacion_patrones` (regex + severidad + cierra_termino) alimentada con los textos de §1.7; `cod_regla` como refuerzo cuando la API aporte más códigos.
6. **Opcional:** días hábiles CO (`festivos_co`) en migración posterior.

---

## 5. Consultas SQL de referencia (repetibles)

```sql
-- Distribución cod_regla
SELECT cod_regla, COUNT(*) AS total, MIN(TRIM(actuacion)) AS ejemplo
FROM actuaciones
GROUP BY cod_regla ORDER BY total DESC;

-- Plazos vencidos vs atendidos por posterior
WITH vencidas AS (
  SELECT id, caso_id, cons_actuacion FROM actuaciones
  WHERE fecha_fin_termino < CURRENT_DATE
)
SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM actuaciones p
         WHERE p.caso_id = v.caso_id AND p.cons_actuacion > v.cons_actuacion
       )) AS con_posterior
FROM vencidas v;

-- Última actuación por caso + ubicacion
SELECT c.numero_caso, c.ubicacion, c.estado_critico,
       ult.cons_actuacion, ult.actuacion, ult.severidad, ult.fecha_fin_termino
FROM casos c
JOIN LATERAL (
  SELECT * FROM actuaciones a WHERE a.caso_id = c.id
  ORDER BY cons_actuacion DESC LIMIT 1
) ult ON true;
```

---

## 6. Próximo paso recomendado

Implementar migración + lógica de `estado_proceso` / `estado_termino` y ejecutar `recalc_only` en los 3 casos para validar que Civil deja de mostrar “Crítica” en Fijación estado y que `estado_critico` refleja el expediente abierto/archivado.
