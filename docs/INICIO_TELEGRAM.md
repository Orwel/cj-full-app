# Inicio rápido — Telegram (después de migraciones y secrets)

## Estado (2026-05-21)

| Paso | Estado |
|------|--------|
| Webhook + vinculación Perfil | ✅ Verificado |
| Sync manual → Telegram agrupado por caso | ✅ Verificado |
| Cron `student-daily-digest` (informe diario por proceso) | ⏳ Verificar header Bearer + desplegar función actualizada |
| Cron `sync-tick` (cola → sync + Telegram) | ⚠️ Corregir 401: Bearer = `CRON_SECRET` en Cron |

## 1. Verificar tablas (si 00007 falló con "casos does not exist")

En **SQL Editor** ejecuta [`supabase/sql/verify_schema.sql`](../supabase/sql/verify_schema.sql).

Si falta `casos`, ejecuta en orden **en el mismo proyecto**:

`00001` → `00002` → `00003` → `00004` → `00005` → `00006` → `00007`

O en terminal (proyecto enlazado):

```bash
supabase link --project-ref TU_REF
supabase db push
```

## 2. Desplegar Edge Functions

Incluye `telegram-send-pending` (envío tras sync manual desde Next).

```powershell
cd c:\Users\User\Documents\Proyectos\cj-full-app
.\scripts\deploy-edge-functions.ps1
```

En **`.env.local`** (desarrollo), al menos una de estas dos rutas para alertas tras **Sincronizar**:

- `TELEGRAM_BOT_TOKEN` (mismo que Supabase), o
- `CRON_SECRET` + `NEXT_PUBLIC_SUPABASE_URL` (llama a `telegram-send-pending` en Edge).

## 3. Registrar webhook (una vez)

Mismo `TELEGRAM_BOT_TOKEN` y `TELEGRAM_WEBHOOK_SECRET` que en Supabase Secrets:

```powershell
.\scripts\register-telegram-webhook.ps1 -ProjectRef "TU_REF" -BotToken "..." -WebhookSecret "..."
```

## 4. Crons en Supabase

Los HTTP que llaman functions deben llevar header:

```http
Authorization: Bearer <CRON_SECRET>
```

(`CRON_SECRET` = el valor en **Edge Functions → Secrets**, no en BotFather.)

| Cron | Schedule UTC | URL |
|------|----------------|-----|
| `enqueue-daily` | `0 9 * * *` | SQL: `select enqueue_daily_sync_jobs();` (4:00 Colombia) |
| `sync-tick` | `*/2 * * * *` | `.../functions/v1/sync-tick` |
| `student-daily-digest` | `0 10 * * *` | `.../functions/v1/student-daily-digest` (5:00 Colombia) |
| `health-check` | `0 13 * * *` | `.../functions/v1/health-check` |

## 5. Cómo iniciar conversación con el bot (estudiantes y admins)

**No basta** con buscar el bot en Telegram y escribir hola.

1. Entra al panel → **Perfil**.
2. Pulsa **Conectar Telegram** (genera un código de 30 min).
3. Se abre `https://t.me/TU_BOT?start=CODIGO` → pulsa **Iniciar** / **Start**.
4. El bot responde que quedaste vinculado.
5. En Perfil → **Refrescar estado** → debe decir conectado.

Comandos en el chat:

- `/ayuda` — instrucciones
- `/desvincular` — desconectar

Sin el paso **Iniciar** con el código del panel, Telegram no permite que el bot te escriba.

## 6. Vercel (solo UI)

- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (sin `@`)

Listo: crons + vinculación en Perfil.
