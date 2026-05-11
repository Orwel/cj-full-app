import type { Caso, UpdateCasoInput } from '@/domain/entities/caso'
import type { ICasoRepository } from '@/domain/repositories/caso-repository'

export class UpdateCasoUseCase {
  constructor(private readonly repo: ICasoRepository) {}

  execute(id: string, input: UpdateCasoInput): Promise<Caso> {
    return this.repo.update(id, input)
  }
}
