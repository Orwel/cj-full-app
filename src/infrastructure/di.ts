import { createClient } from '@/lib/supabase/server'
import { ListCasosUseCase } from '@/application/casos/list-casos.usecase'
import { GetCasoUseCase } from '@/application/casos/get-caso.usecase'
import { CreateCasoUseCase } from '@/application/casos/create-caso.usecase'
import { UpdateCasoUseCase } from '@/application/casos/update-caso.usecase'
import { DeleteCasoUseCase } from '@/application/casos/delete-caso.usecase'
import { SupabaseCasoRepository } from '@/infrastructure/database/supabase/caso-repository.supabase'

export async function createCasosContext() {
  const supabase = await createClient()
  const casos = new SupabaseCasoRepository(supabase)
  return {
    listCasos: new ListCasosUseCase(casos),
    getCaso: new GetCasoUseCase(casos),
    createCaso: new CreateCasoUseCase(casos),
    updateCaso: new UpdateCasoUseCase(casos),
    deleteCaso: new DeleteCasoUseCase(casos),
  }
}
