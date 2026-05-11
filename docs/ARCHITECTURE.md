# Arquitectura de carpetas

Alinea la estructura del repo con la **Clean Architecture** de [SPEC.md](./SPEC.md).

---

## Principio

- **`domain`:** reglas y contratos puros. Sin Next, Supabase ni `fetch` a terceros.
- **`application`:** casos de uso; depende solo de `domain`.
- **`infrastructure`:** Supabase, cliente HTTP judicial, notificaciones.
- **`presentation`:** UI y rutas Next.js.

La dependencia fluye hacia `domain`. Las implementaciones se **inyectan** en los casos de uso.

**Contrato judicial:** en `domain/services/` (o equivalente) definir algo como `IJudicialConsultaService` con métodos `buscarPorRadicado`, `detalle`, `actuaciones`. La implementación por defecto es `RamaJudicialHttpClient` en `infrastructure/scraping/`; una futura `PlaywrightJudicialService` cumpliría el mismo contrato sin cambiar `application/`.

---

## Árbol relevante

```text
.
├── docs/
│   ├── SPEC.md
│   ├── DATABASE.md
│   ├── SCRAPING.md
│   ├── ARCHITECTURE.md
│   └── samples/
│       └── api-rama-judicial/   ← fixtures JSON anonimizados
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   ├── repositories/
│   │   └── services/            ← IJudicialConsultaService (`judicial-consulta.service.ts`)
│   ├── application/
│   │   ├── casos/
│   │   ├── scraping/
│   │   └── alertas/
│   ├── infrastructure/
│   │   ├── database/supabase/
│   │   ├── scraping/
│   │   │   ├── types.ts
│   │   │   ├── RamaJudicialClient.ts
│   │   │   └── parsers/         ← vacío en MVP HTTP; reservado si hubiera HTML
│   │   └── notifications/
│   └── presentation/
│       ├── components/
│       └── README.md
├── supabase/
│   └── migrations/
│       └── 00001_initial_schema.sql
├── .env.local.example
└── README.md
```

---

## Next.js App Router

Las rutas deben vivir en **`src/app/`** cuando se inicialice Next.js.

| Ubicación | Rol |
|-----------|-----|
| `src/app/**/page.tsx`, `route.ts`, `layout.tsx` | Presentación: delgado; llama casos de uso |
| `src/presentation/components/**` | UI reutilizable |

Preferir un **composition root** (`src/infrastructure/di.ts` o similar) que construya repositorios + `RamaJudicialClient` y los pase a los casos de uso, en lugar de importar `infrastructure` desde cada `page.tsx`.

---

## Casos de uso

- Sufijo `.usecase.ts` (ej. `SincronizarCasoJudicial.usecase.ts`).

---

## Migraciones

Versionadas en `supabase/migrations/`. Esquema canónico descrito en [DATABASE.md](./DATABASE.md).
