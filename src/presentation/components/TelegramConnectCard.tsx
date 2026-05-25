'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { TelegramLinkState } from '@/lib/telegram/links'
import { buildTelegramDeepLink } from '@/lib/telegram/links'
import {
  desconectarTelegramAction,
  generarLinkCodeAction,
} from '@/app/(dashboard)/dashboard/perfil/telegram-actions'
import { Card } from '@/presentation/components/ui/Card'

type Props = {
  state: TelegramLinkState
  botUsername: string | null
  fullName: string
}

export function TelegramConnectCard({ state, botUsername, fullName }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [deepLink, setDeepLink] = useState<string | null>(
    state.pendingCode && botUsername
      ? buildTelegramDeepLink(botUsername, state.pendingCode)
      : null,
  )

  const handleConnect = () => {
    setError(null)
    start(async () => {
      const res = await generarLinkCodeAction()
      if (!res.ok) {
        setError(res.message)
        return
      }
      setDeepLink(res.deepLink)
      window.open(res.deepLink, '_blank', 'noopener,noreferrer')
      router.refresh()
    })
  }

  const handleDisconnect = () => {
    setError(null)
    start(async () => {
      const res = await desconectarTelegramAction()
      if (!res.ok) {
        setError(res.message ?? 'No se pudo desconectar.')
        return
      }
      setDeepLink(null)
      router.refresh()
    })
  }

  return (
    <Card variant="default" className="mt-6">
      <h2 className="text-lg font-semibold text-app-text">Notificaciones por Telegram</h2>
      <p className="mt-2 text-sm text-app-secondary">
        Recibe alertas inmediatas de tus procesos y un resumen diario. Es gratuito y más rápido
        que el correo.
      </p>

      {state.blocked && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Parece que bloqueaste el bot. Desbloquéalo en Telegram o reconecta desde aquí.
        </p>
      )}

      {state.linked ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-app-text">
            Conectado como{' '}
            <span className="font-medium">
              {state.username ? `@${state.username}` : 'usuario de Telegram'}
            </span>
            {state.linkedAt && (
              <span className="text-app-muted-text">
                {' '}
                · desde{' '}
                {new Date(state.linkedAt).toLocaleDateString('es-CO', {
                  dateStyle: 'medium',
                })}
              </span>
            )}
          </p>
          <p className="text-sm text-app-secondary">
            Hola {fullName}: te avisaremos aquí las novedades de tus procesos (un mensaje por caso)
            y cada mañana un resumen del día.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={handleDisconnect}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {pending ? '…' : 'Desconectar Telegram'}
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-app-secondary">
            <li>
              Instala Telegram o ábrelo en{' '}
              <a
                href="https://web.telegram.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 hover:underline"
              >
                web.telegram.org
              </a>
              .
            </li>
            <li>Pulsa <strong className="text-app-text">Conectar Telegram</strong> y luego{' '}
              <strong className="text-app-text">Iniciar</strong> en el chat del bot.
            </li>
            <li>Vuelve aquí y pulsa <strong className="text-app-text">Refrescar estado</strong>.</li>
          </ol>

          {!botUsername && (
            <p className="text-sm text-red-700">
              El bot no está configurado en el servidor (variable{' '}
              <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code>
              ).
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !botUsername}
              onClick={handleConnect}
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {pending ? 'Generando enlace…' : 'Conectar Telegram'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => router.refresh()}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              Refrescar estado
            </button>
          </div>

          {deepLink && (
            <p className="text-sm">
              <Link
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-700 hover:underline"
              >
                Abrir chat del bot de nuevo →
              </Link>
              <span className="text-app-muted-text"> (código válido 30 min)</span>
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <details className="mt-6 text-sm text-app-secondary">
        <summary className="cursor-pointer font-medium text-app-text">
          Problemas frecuentes
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Sin pulsar Iniciar en el bot, Telegram no permite que te escribamos.</li>
          <li>Si bloqueaste el bot, desbloquéalo o escribe /desvincular y vuelve a conectar.</li>
          <li>El código expira a los 30 minutos; genera uno nuevo si hace falta.</li>
        </ul>
      </details>
    </Card>
  )
}
