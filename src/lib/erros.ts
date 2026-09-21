import type { PostgrestError } from '@supabase/supabase-js'

export type FalhaAoSalvar =
  | { tipo: 'limite_plano' }
  | { tipo: 'limite_veiculos' }
  | { tipo: 'duplicado' }
  | { tipo: 'data_invalida' }
  | { tipo: 'ja_resolvido' }
  | { tipo: 'generico'; mensagem: string }

export function interpretarErro(error: PostgrestError | Error | null): FalhaAoSalvar | null {
  if (!error) return null

  const mensagem = error.message ?? ''

  if (mensagem.includes('PLAN_LIMIT')) return { tipo: 'limite_plano' }
  if (mensagem.includes('VEICULO_LIMIT')) return { tipo: 'limite_veiculos' }
  if (mensagem.includes('DATA_INVALIDA')) return { tipo: 'data_invalida' }
  if (mensagem.includes('JA_RESOLVIDO')) return { tipo: 'ja_resolvido' }
  if (mensagem.includes('DUPLICATE_DOCUMENT') || mensagem.includes('duplicate key')) {
    return { tipo: 'duplicado' }
  }

  return { tipo: 'generico', mensagem: 'Não foi possível salvar agora. Tente de novo em instantes.' }
}

export function textoDaFalha(falha: FalhaAoSalvar): string {
  switch (falha.tipo) {
    case 'limite_plano':
      return 'O plano gratuito monitora 1 documento. Faça upgrade para adicionar mais.'
    case 'limite_veiculos':
      return 'Você pode cadastrar até 5 veículos. Remova um para adicionar outro.'
    case 'duplicado':
      return 'Você já monitora esse documento.'
    case 'data_invalida':
      return 'A nova data precisa ser hoje ou depois.'
    case 'ja_resolvido':
      return 'Esse documento já foi resolvido. Cadastre um novo prazo pelo painel.'
    case 'generico':
      return falha.mensagem
  }
}
