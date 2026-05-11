import type { Caso } from '@/domain/entities/caso'
import type { ICasoRepository } from '@/domain/repositories/caso-repository'

export class ListCasosUseCase {
  constructor(private readonly repo: ICasoRepository) {}

  execute(): Promise<Caso[]> {
    return this.repo.list()
  }
}
