// Catálogo único dos tipos de documento do cliente: cadastro, onboarding, painel
// e validação leem daqui. O espelho no servidor é `LABELS` em
// supabase/functions/_shared/notificacoes.ts (rótulos próprios, para o texto do
// e-mail); tests/tipos-documento.test.mjs garante que os ids são os mesmos.
// O banco é a autoridade (ver migration 20260911120000_seguranca_constraints.sql).

export interface TipoInfo {
  id: string
  label: string
  description: string
  // Só faz sentido para a empresa: aparece apenas no plano MEI.
  empresarial?: boolean
}

export const TIPOS = [
  { id: 'cnh', label: 'CNH', description: 'Carteira de motorista' },
  { id: 'crlv', label: 'CRLV', description: 'Documento do veículo' },
  { id: 'ipva', label: 'IPVA', description: 'Imposto do veículo' },
  { id: 'multa', label: 'Multa de trânsito', description: 'Defesa, desconto ou recurso' },
  { id: 'passaporte', label: 'Passaporte', description: 'Documento de viagem' },
  { id: 'rg', label: 'RG', description: 'Identidade' },
  { id: 'seguro', label: 'Seguro auto', description: 'Apólice do veículo' },
  { id: 'plano_saude', label: 'Plano de saúde', description: 'Plano médico' },
  { id: 'carteira_trabalho', label: 'Carteira de trabalho', description: 'CTPS' },
  { id: 'garantia', label: 'Garantia', description: 'Produto ou serviço' },
  { id: 'contrato', label: 'Contrato', description: 'Aluguel ou prestação' },
  { id: 'exame', label: 'Exame periódico', description: 'ASO ou atestado' },
  { id: 'alvara', label: 'Alvará', description: 'Funcionamento da empresa', empresarial: true },
  { id: 'certidao', label: 'Certidão negativa', description: 'Receita, FGTS, trabalhista', empresarial: true },
  { id: 'das_mei', label: 'DAS-MEI', description: 'Guia mensal do MEI', empresarial: true },
  { id: 'outro', label: 'Outro', description: 'Outro documento' },
] as const satisfies readonly TipoInfo[]

export type TipoDocumento = (typeof TIPOS)[number]['id']

// Tupla não vazia, como o z.enum exige; o `map` perde a forma de tupla.
export const TIPOS_DOCUMENTO = TIPOS.map(tipo => tipo.id) as unknown as readonly [TipoDocumento, ...TipoDocumento[]]

const ROTULOS: Record<string, string> = Object.fromEntries(TIPOS.map(tipo => [tipo.id, tipo.label]))

// Rótulo de um tipo vindo do banco; tipo desconhecido volta como está.
export const rotuloDoTipo = (id: string) => ROTULOS[id] ?? id

// Tipos que o plano pode cadastrar: os empresariais ficam só para o MEI.
export const tiposDisponiveis = (empresarial: boolean): readonly TipoInfo[] => {
  const todos: readonly TipoInfo[] = TIPOS
  return todos.filter(tipo => empresarial || !tipo.empresarial)
}
