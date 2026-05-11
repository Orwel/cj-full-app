# Capa de presentación

Aquí vive la interfaz de usuario y los **Server/Client Components** de Next.js.

## Convención con Next.js

Al inicializar Next.js con la carpeta `src/`, las rutas deben estar en **`src/app/`** (requisito del framework). Esa carpeta forma parte de la capa de presentación:

- `src/app/` — rutas, layouts, API routes (`route.ts`)
- `src/presentation/components/` — componentes compartidos (opcional; también puede usarse `src/components` si se prefiere convención Next común)

Los `page.tsx` deben mantenerse delgados: validación de entrada, llamada al caso de uso en `application/`, y renderizado.
