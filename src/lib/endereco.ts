// Orquestra endereço do usuário -> coordenada -> unidade de renovação mais próxima.
// Puro: NÃO fala com o Supabase (os componentes leem/gravam o profile direto,
// como o resto do app já faz). Assim continua testável com node:test.

import { maisProximas, type Coordenada } from './geo.ts'
import { autoridadePara, linkMapaFallback, type Autoridade, type TipoDocumento } from './renovacao.ts'
import { municipios, ufCentroides } from '../data/municipios-centroides.ts'
import { unidades as unidadesCuradas, type Unidade } from '../data/unidades-renovacao.ts'

// Subconjunto de campos do profile que descrevem a residência.
export interface PerfilEndereco {
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
  ibge?: string | null
  latitude?: number | null
  longitude?: number | null
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
}

// Resolve a coordenada do município: código IBGE -> nome (cidade+UF) -> centro da UF.
export function resolverCoordenada(dados: {
  ibge?: string | null
  cidade?: string | null
  uf?: string | null
}): Coordenada | null {
  const { ibge, cidade, uf } = dados

  if (ibge && municipios[ibge]) {
    const m = municipios[ibge]
    return { lat: m.lat, lng: m.lng }
  }

  if (cidade && uf) {
    const alvo = normalizar(cidade)
    const ufAlvo = uf.toUpperCase()
    for (const m of Object.values(municipios)) {
      if (m.uf === ufAlvo && normalizar(m.cidade) === alvo) return { lat: m.lat, lng: m.lng }
    }
  }

  if (uf && ufCentroides[uf.toUpperCase()]) {
    return ufCentroides[uf.toUpperCase()]
  }

  return null
}

// Coordenada do usuário: a persistida no profile tem prioridade; senão, deriva
// do IBGE/cidade/UF.
export function coordenadaDoUsuario(perfil: PerfilEndereco | null | undefined): Coordenada | null {
  if (perfil?.latitude != null && perfil?.longitude != null) {
    return { lat: perfil.latitude, lng: perfil.longitude }
  }
  if (!perfil) return null
  return resolverCoordenada({ ibge: perfil.ibge, cidade: perfil.cidade, uf: perfil.uf })
}

export function temEndereco(perfil: PerfilEndereco | null | undefined): boolean {
  return Boolean(perfil && (perfil.cidade || (perfil.latitude != null && perfil.longitude != null)))
}

// Deve abrir o pop-up: só quando não há endereço e o usuário não pediu para adiar.
export function precisaPedirEndereco(perfil: PerfilEndereco | null | undefined, adiado: boolean): boolean {
  return !temEndereco(perfil) && !adiado
}

// Resumo curto para exibição: "Rua X, 100 — Bairro · Cidade/UF".
export function resumoEndereco(perfil: PerfilEndereco | null | undefined): string {
  if (!perfil) return ''
  const linha1 = [perfil.logradouro, perfil.numero].filter(Boolean).join(', ')
  const linha2 = [perfil.bairro, [perfil.cidade, perfil.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ')
  return [linha1, linha2].filter(Boolean).join(' — ')
}

export interface ResultadoRenovacao {
  autoridade: Autoridade
  unidades: Array<Unidade & { distanciaKm: number }>
  linkMapa: string
}

// Raio para considerar uma unidade curada "perto o suficiente" para ser nomeada.
// Redes regionais (ex.: Poupatempo, só em SP) não devem aparecer para quem está
// longe — nesse caso a interface usa o fallback do mapa. Unidades na mesma UF
// passam mesmo além do raio (estados grandes).
const RAIO_UNIDADE_KM = 100

// Para um tipo de documento + endereço do usuário, decide o que mostrar:
// unidades curadas mais próximas (quando há órgão público e coordenada) e
// sempre um link de mapa de fallback.
export function melhorRenovacao(tipo: string, perfil: PerfilEndereco | null | undefined): ResultadoRenovacao {
  const autoridade = autoridadePara(tipo)
  const coord = coordenadaDoUsuario(perfil)

  let unidades: Array<Unidade & { distanciaKm: number }> = []
  if (!autoridade.privado && coord) {
    const uf = perfil?.uf?.toUpperCase()
    const candidatas = unidadesCuradas.filter((u) => u.atende.includes(tipo as TipoDocumento))
    unidades = maisProximas(coord, candidatas, 3)
      .filter((u) => (uf && u.uf === uf) || u.distanciaKm <= RAIO_UNIDADE_KM)
      .slice(0, 2)
  }

  const termo = autoridade.termoBusca || autoridade.orgao
  const linkMapa = linkMapaFallback(termo, { cidade: perfil?.cidade, uf: perfil?.uf })

  return { autoridade, unidades, linkMapa }
}
