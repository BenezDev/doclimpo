import type { PostgrestError } from '@supabase/supabase-js'

export type FalhaAoSalvar =
  | { tipo: 'limite_plano' }
  | { tipo: 'duplicado' }
  | { tipo: 'generico'; mensagem: string }

export function interpretarErro(error: PostgrestError | Error | null): FalhaAoSalvar | null {
  if (!error) return null

  const mensagem = error.message ?? ''

  if (mensagem.includes('PLAN_LIMIT')) return { tipo: 'limite_plano' }
  if (mensagem.includes('DUPLICATE_DOCUMENT') || mensagem.includes('duplicate key')) {
    return { tipo: 'duplicado' }
  }

  return { tipo: 'generico', mensagem: 'Não foi possível salvar agora. Tente de novo em instantes.' }
}

export function textoDaFalha(falha: FalhaAoSalvar): string {
  switch (falha.tipo) {
    case 'limite_plano':
      return 'O plano gratuito monitora 1 documento. Faça upgrade para adicionar mais.'
    case 'duplicado':
      return 'Você já monitora esse documento.'
    case 'generico':
      return falha.mensagem
  }
}
