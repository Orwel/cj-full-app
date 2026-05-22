# Variables, MCP y dónde va cada cosa

## MCP de Supabase en Cursor (plugin)

- Vive **solo en Cursor** (Settings → Tools & MCP → supabase, 29 tools).
- **No aparece en Vercel** ni en Supabase Dashboard: es para que el asistente consulte BD, logs y functions.
- No reemplaza configurar crons ni secrets en Supabase.

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
