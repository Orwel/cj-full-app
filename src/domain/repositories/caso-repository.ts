import type { Caso, CreateCasoInput, UpdateCasoInput } from '@/domain/entities/caso'

export interface ICasoRepository {
  list(): Promise<Caso[]>
  getById(id: string): Promise<Caso | null>
  create(input: CreateCasoInput): Promise<Caso>
  update(id: string, input: UpdateCasoInput): Promise<Caso>
  delete(id: string): Promise<void>
}
