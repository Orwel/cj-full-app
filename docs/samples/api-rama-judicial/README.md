# Fixtures — API Rama Judicial (`:448/api/v2`)

Archivos opcionales para tests de contrato (mock de `fetch`):

| Archivo sugerido | Endpoint |
|------------------|----------|
| `numero-radicacion-ok.json` | `GET .../Procesos/Consulta/NumeroRadicacion?...` |
| `detalle-ok.json` | `GET .../Proceso/Detalle/{idProceso}` |
| `actuaciones-ok.json` | `GET .../Proceso/Actuaciones/{idProceso}?pagina=1` |

Al generar fixtures, reemplazar nombres en `sujetosProcesales` y anotaciones por `REDACTED` o texto ficticio.
