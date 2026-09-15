// CEP: normalização, validação e consulta ao ViaCEP (gratuito, com CORS —
// pode ser chamado direto do navegador). A resolução de coordenadas NÃO usa o
// ViaCEP; usa o código IBGE do município que ele devolve (ver lib/endereco.ts).

export interface CepResultado {
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  uf: string
  ibge: string
}

export function normalizarCep(valor: string): string {
  return (valor ?? '').replace(/\D/g, '').slice(0, 8)
}

export function cepValido(valor: string): boolean {
  return normalizarCep(valor).length === 8
}

// Formata "01310100" -> "01310-100" para exibição.
export function formatarCep(valor: string): string {
  const d = normalizarCep(valor)
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

interface ViaCepResposta {
  cep?: string
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
  ibge?: string
  erro?: boolean
}

// Retorna o endereço do CEP, ou null quando o CEP é inválido, não existe ou a
// consulta falha. Quem chama decide o fallback (entrada manual).
export async function buscarCep(valor: string): Promise<CepResultado | null> {
  const cep = normalizarCep(valor)
  if (cep.length !== 8) return null

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    if (!resposta.ok) return null
    const dados = (await resposta.json()) as ViaCepResposta
    if (dados.erro) return null

    return {
      cep,
      logradouro: dados.logradouro ?? '',
      bairro: dados.bairro ?? '',
      cidade: dados.localidade ?? '',
      uf: dados.uf ?? '',
      ibge: dados.ibge ?? '',
    }
  } catch {
    return null
  }
}
