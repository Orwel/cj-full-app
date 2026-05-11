import type { Caso } from '@/domain/entities/caso'
import type { ICasoRepository } from '@/domain/repositories/caso-repository'

export class GetCasoUseCase {
  constructor(private readonly repo: ICasoRepository) {}

  execute(id: string): Promise<Caso | null> {
    return this.repo.getById(id)
  }
}
