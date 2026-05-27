# Notificaciones por Telegram

Canal único de alertas del Consultorio Jurídico (sustituye correo/Resend). Gratuito para el volumen típico de un consultorio.

---

## Para administradores del sistema

### 1. Crear el bot

1. Abre [@BotFather](https://t.me/BotFather) en Telegram.
2. Envía `/newbot`.
3. Nombre visible, por ejemplo: `Consultorio Jurídico Alertas`.
4. Username terminado en `bot`, por ejemplo: `cj_consultorio_bot`.
5. Guarda el **token** que devuelve BotFather.

### 2. Personalizar el bot (recomendado)

En BotFather:

- `/setdescription` — «Alertas de tus procesos en el Consultorio Jurídico.»
- `/setabouttext` — texto corto igual.
- `/setuserpic` — logo del consultorio.
- `/setcommands`:

```text
start - Vincular tu cuenta con un código del panel
ayuda - Cómo funciona
desvincular - Desconectar mi cuenta
```

### 3. Secrets en Supabase

En **Project Settings → Edge Functions → Secrets**:

| Secret | Ejemplo / notas |
|--------|-----------------|
| `TELEGRAM_BOT_TOKEN` | Token de BotFather |
| `TELEGRAM_BOT_USERNAME` | `cj_consultorio_bot` (sin `@`) |
| `TELEGRAM_WEBHOOK_SECRET` | Cadena aleatoria larga (`openssl rand -hex 32`) |
| `APP_PUBLIC_URL` | `https://tu-app.vercel.app` |
| `CRON_SECRET` | Ya existente para crons HTTP |

En **Vercel** (app Next):

| Variable | Notas |
|----------|--------|
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Mismo username, para enlaces en Perfil |
| `TELEGRAM_BOT_TOKEN` | Sync manual desde Next (o usa Edge vía `CRON_SECRET` en `.env.local`) |
| `CRON_SECRET` | En `.env.local`: respaldo para `telegram-send-pending` si no pones `TELEGRAM_BOT_TOKEN` |
| `NEXT_PUBLIC_APP_URL` | URL pública del panel |

### 4. Migración y despliegue

1. Aplicar `supabase/migrations/00007_telegram_and_subscriptions.sql`.
2. Desplegar Edge Functions:
   - `telegram-webhook`
   - `student-daily-digest`
   - (y las existentes: `sync-tick`, `sync-one-caso`, `health-check`)
3. Eliminar secrets antiguos de Resend si los tenías (`RESEND_*`, `ADMIN_ALERT_EMAIL`).

### 5. Registrar el webhook (una sola vez)

Sustituye `<PROJECT_REF>`, `<TOKEN>` y `<WEBHOOK_SECRET>`:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://<PROJECT_REF>.supabase.co/functions/v1/telegram-webhook?token=<WEBHOOK_SECRET>\",\"allowed_updates\":[\"message\"]}"
```

Verificar:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### 6. Crons

Definidos en **`supabase/migrations/00008_cron_jobs.sql`** (`cron.schedule` + `private.invoke_edge_cron`). Al aplicar la migración aparecen en Integrations → Cron sin crearlos a mano.

| Nombre | Schedule (UTC) | Target |
|--------|----------------|--------|
| `enqueue-due` | `*/5 * * * *` | SQL: `select enqueue_due_sync_jobs(2);` (vencidos + sin sync >2 h en horario hábil) |
| `enqueue-business-hourly` | `15 11-23 * * 1-5` | Mismo encolado (~06:15–18:15 Colombia) |
| `enqueue-daily` | `0 9 * * *` | SQL: `select enqueue_daily_sync_jobs();` (**4:00** Colombia, respaldo + recalc) |
| `sync-tick` | `*/2 * * * *` | Edge `sync-tick` (Bearer desde Vault) |
| `student-daily-digest` | `0 10 * * *` | Edge digest (**5:00** Colombia) |
| `health-check` | `0 13 * * *` | Edge `health-check` (**8:00** Colombia) |

Colombia = **UTC−5**. Una vez: `.\scripts\setup-cron-vault.ps1` (mismo `CRON_SECRET` que Edge Secrets).

Si falta el secret en Vault, los crons HTTP devuelven **401** y la cola queda en `pending`.

**Resumen diario:** se envía **siempre** a cada perfil con Telegram vinculado y al menos un proceso activo (estudiante: sus casos; admin: casos que sigue). Incluye estado del caso, sync, actuaciones nuevas en 24 h y alertas del día, aunque no haya novedades críticas.

### 7. Smoke test

1. Entra a la app → **Perfil** → **Conectar Telegram** → **Iniciar** en el bot.
2. Debe llegar mensaje de bienvenida en Telegram.
3. Sincroniza un caso con alerta crítica; debe llegar aviso inmediato.
4. (Opcional) Ejecuta digest manual:

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/student-daily-digest" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

### 8. Admins y casos ajenos

1. El admin también conecta Telegram en **Perfil**.
2. En la ficha de un caso de un estudiante, pulsa **Seguir notificaciones de este caso**.
3. Recibirá las mismas alertas inmediatas y el resumen diario de esos casos.

---

## Para estudiantes (texto para compartir)

Puedes copiar esto en el grupo del consultorio o mostrarlo en clase:

---

### Recibe alertas de tus procesos por Telegram

1. **Instala Telegram** en el celular o ábrelo en [web.telegram.org](https://web.telegram.org).
2. Entra al panel del Consultorio → **Perfil** → pulsa **Conectar Telegram**.
3. Se abrirá el chat con el bot del consultorio. Pulsa **Iniciar** (o **Start**). Sin ese paso el bot no puede escribirte.
4. Vuelve a **Perfil** y pulsa **Refrescar estado** si hace falta.

**Qué recibirás:**

- Aviso **inmediato** tras sincronizar (varias alertas del mismo caso en **un solo mensaje**).
- Un **resumen cada mañana** con el resto de novedades del día.

**Si cambias de teléfono o quieres desconectar:**

- En el chat del bot escribe `/desvincular`, o usa **Desconectar** en Perfil.

**Si no llegan mensajes:**

- Comprueba que **no bloqueaste** el bot en Telegram.
- Asegúrate de haber pulsado **Iniciar** en el chat.
- El código del panel **expira a los 30 minutos**; genera uno nuevo con **Conectar Telegram**.

---

## Comportamiento técnico (resumen)

| Evento | Canal |
|--------|--------|
| Sync exitoso / recálculo | Telegram inmediato (un mensaje por caso) si hay alertas pendientes (`telegram_sent_at` null); incluye crítica, urgente, atención e informativa |
| Cron 10:00 UTC (5:00 Colombia) | `student-daily-digest`: un mensaje por perfil vinculado (estudiante: todos sus casos activos; admin: casos que sigue) |
| Health-check | Telegram a todos los admins vinculados |

Destinatarios de una alerta de un caso:

- Estudiante asignado (`casos.student_id`) si tiene Telegram vinculado.
- Perfiles en `caso_suscriptores` para ese caso (admins que siguen el caso).

Privacidad en mensajes: número de caso, radicado, título y texto de la alerta (sin datos extra).
