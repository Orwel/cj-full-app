import type { ICasoRepository } from '@/domain/repositories/caso-repository'

export class DeleteCasoUseCase {
  constructor(private readonly repo: ICasoRepository) {}

  execute(id: string): Promise<void> {
    return this.repo.delete(id)
  }
}
