import { CasoAccionesPanel } from '@/presentation/components/CasoAccionesPanel'

type Props = {
  casoId: string
  isAdmin: boolean
  isOwner: boolean
  adminSubscribed: boolean
  ownerHasTelegram?: boolean
}

/** Panel de acciones del expediente (sync, Telegram, editar). */
export function CasoNotificacionesActions(props: Props) {
  return <CasoAccionesPanel {...props} />
}
