import { z } from 'zod'
import { AREAS } from '@/domain/entities/caso'

const radicadoRegex = /^[0-9]{23}$/

export const casoFormSchema = z.object({
  numeroCaso: z.string().trim().min(1, 'Requerido'),
  radicadoJudicial: z
    .string()
    .trim()
    .regex(radicadoRegex, 'Debe tener exactamente 23 dígitos'),
  area: z.enum(AREAS),
  notas: z.string().trim().optional().nullable(),
  studentId: z.string().uuid().optional().nullable(),
})

export type CasoFormValues = z.infer<typeof casoFormSchema>
