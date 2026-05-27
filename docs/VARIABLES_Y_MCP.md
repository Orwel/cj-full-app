# Variables, MCP y dónde va cada cosa

## MCP de Supabase en Cursor (proyecto Consultorio)

Proyecto Supabase: **`tiodnudjbwouwhffboam`**  
URL API: `https://tiodnudjbwouwhffboam.supabase.co`

### Configuración en el repo

El archivo [`.cursor/mcp.json`](../.cursor/mcp.json) enlaza el asistente **solo** a ese proyecto (modo `project_ref`). Plantilla: [`.cursor/mcp.json.example`](../.cursor/mcp.json.example).

Primera vez en Cursor:

1. Abre **Settings → Tools & MCP** y confirma que el servidor **supabase** aparece activo.
2. Si pide login, autoriza con la cuenta de Supabase que tiene acceso al proyecto del consultorio.
3. Recarga la ventana (`Ctrl+Shift+P` → *Reload Window*) si no ves las herramientas.

Comprobar: pide al asistente «lista las tablas de la base de datos con MCP».

### Qué hace y qué no

- Vive **solo en Cursor**: consulta BD, logs, Edge Functions y migraciones desde el chat.
- **No aparece en Vercel** ni sustituye secrets/crons en Supabase Dashboard.
- Con `project_ref` el MCP no puede ver otros proyectos de tu cuenta.

## Tres lugares para la URL pública

| Lugar | Variable | Valor producción |
|-------|----------|------------------|
| **Vercel** (Next.js) | `NEXT_PUBLIC_APP_URL` | `https://cj-full-app.vercel.app` |
| **Supabase Edge Secrets** | `APP_PUBLIC_URL` | `https://cj-full-app.vercel.app` |
| **Local** `.env.local` | ambas (si pruebas Telegram local) | localhost o la de Vercel |

Los mensajes de Telegram generados en **Edge Functions** usan `APP_PUBLIC_URL` (no leen Vercel).

## Crons HTTP (lo que MCP detectó roto)

Logs actuales: `POST sync-tick` → **401** cada 2 min.

En **Supabase → Integrations → Cron**, en cada job HTTP:

- URL: `https://tiodnudjbwouwhffboam.supabase.co/functions/v1/<nombre>`
- Header: `Authorization` = `Bearer <CRON_SECRET>`
- `<CRON_SECRET>` = **Edge Functions → Secrets**, no el token del bot.

Probar en terminal:

```powershell
$env:CRON_SECRET = "..."   # desde Edge Secrets
.\scripts\test-cron-functions.ps1
```

`sync-tick` debe responder **200** con `"claimed": 1` (o más).

## Checklist rápido

1. Vercel: `NEXT_PUBLIC_APP_URL=https://cj-full-app.vercel.app`
2. Supabase Secrets: `APP_PUBLIC_URL=https://cj-full-app.vercel.app`
3. Crons HTTP: header Bearer con `CRON_SECRET`
4. Estudiantes: Perfil → Conectar Telegram
5. Redeploy ya hecho: `student-daily-digest` (informe diario por proceso)
