import { redirect } from 'next/navigation'
import { getMyProfile, getSessionUser } from '@/lib/auth/session'
import { getMyTelegramState } from '@/lib/telegram/profile.server'
import { TelegramConnectCard } from '@/presentation/components/TelegramConnectCard'

export default async function PerfilPage() {
  const user = await getSessionUser()
  const profile = await getMyProfile()
  if (!user || !profile) redirect('/login')

  const telegram = await getMyTelegramState(user.id)
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() ?? null

  return (
    <div>
      <h1 className="text-xl font-bold text-app-text sm:text-2xl">Perfil</h1>
      <p className="mt-1 text-app-secondary">
        {profile.full_name} · {profile.email} ·{' '}
        {profile.role === 'admin' ? 'Administrador' : 'Estudiante'}
      </p>

      <TelegramConnectCard
        state={telegram}
        botUsername={botUsername}
        fullName={profile.full_name}
      />

      {profile.role === 'admin' && (
        <div className="mt-6 rounded-lg border border-app-border bg-slate-50 p-4 text-sm text-app-secondary">
          <p className="font-medium text-app-text">Administradores</p>
          <p className="mt-2">
            Conecta Telegram igual que un estudiante. Para recibir alertas de casos de otros
            estudiantes, abre la ficha del caso y pulsa <strong>Seguir notificaciones</strong>.
          </p>
        </div>
      )}
    </div>
  )
}
