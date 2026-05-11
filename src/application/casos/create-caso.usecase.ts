import type { Caso, CreateCasoInput } from '@/domain/entities/caso'
import type { ICasoRepository } from '@/domain/repositories/caso-repository'

export class CreateCasoUseCase {
  constructor(private readonly repo: ICasoRepository) {}

  execute(input: CreateCasoInput): Promise<Caso> {
    return this.repo.create(input)
  }
}
