import type { Rede, TipoDocumento } from '../lib/renovacao.ts'

// Base curada de unidades de renovação, com coordenadas a nível de cidade/região.
// O endereço exato e o horário vêm do link do mapa na interface — aqui guardamos
// só o que dá para afirmar com segurança (rede, cidade/UF e uma referência de
// região), sem inventar números de rua.
//
// COBERTURA INICIAL (honesta, expansível):
//   • Poupatempo — Estado de SP (atende RG, CNH, CRLV)
//   • Polícia Federal — postos de passaporte nas principais capitais
// Fora disso, a interface cai no link de busca no mapa + portal oficial.

export interface Unidade {
  id: string
  rede: Rede
  nome: string
  cidade: string
  uf: string
  regiao?: string
  lat: number
  lng: number
  atende: TipoDocumento[]
}

const POUPATEMPO_ATENDE: TipoDocumento[] = ['rg', 'cnh', 'crlv']

export const unidades: Unidade[] = [
  // ---- Poupatempo (SP) ----
  { id: 'pt-se', rede: 'poupatempo', nome: 'Poupatempo Sé', cidade: 'São Paulo', uf: 'SP', regiao: 'Centro (Sé)', lat: -23.5505, lng: -46.6339, atende: POUPATEMPO_ATENDE },
  { id: 'pt-lapa', rede: 'poupatempo', nome: 'Poupatempo Lapa', cidade: 'São Paulo', uf: 'SP', regiao: 'Lapa', lat: -23.528, lng: -46.705, atende: POUPATEMPO_ATENDE },
  { id: 'pt-itaquera', rede: 'poupatempo', nome: 'Poupatempo Itaquera', cidade: 'São Paulo', uf: 'SP', regiao: 'Itaquera (zona leste)', lat: -23.543, lng: -46.461, atende: POUPATEMPO_ATENDE },
  { id: 'pt-santo-amaro', rede: 'poupatempo', nome: 'Poupatempo Santo Amaro', cidade: 'São Paulo', uf: 'SP', regiao: 'Santo Amaro (zona sul)', lat: -23.654, lng: -46.708, atende: POUPATEMPO_ATENDE },
  { id: 'pt-guarulhos', rede: 'poupatempo', nome: 'Poupatempo Guarulhos', cidade: 'Guarulhos', uf: 'SP', lat: -23.4543, lng: -46.5337, atende: POUPATEMPO_ATENDE },
  { id: 'pt-campinas', rede: 'poupatempo', nome: 'Poupatempo Campinas', cidade: 'Campinas', uf: 'SP', lat: -22.9099, lng: -47.0626, atende: POUPATEMPO_ATENDE },
  { id: 'pt-santos', rede: 'poupatempo', nome: 'Poupatempo Santos', cidade: 'Santos', uf: 'SP', lat: -23.9608, lng: -46.3336, atende: POUPATEMPO_ATENDE },
  { id: 'pt-sorocaba', rede: 'poupatempo', nome: 'Poupatempo Sorocaba', cidade: 'Sorocaba', uf: 'SP', lat: -23.5015, lng: -47.4526, atende: POUPATEMPO_ATENDE },
  { id: 'pt-rib-preto', rede: 'poupatempo', nome: 'Poupatempo Ribeirão Preto', cidade: 'Ribeirão Preto', uf: 'SP', lat: -21.1775, lng: -47.8103, atende: POUPATEMPO_ATENDE },
  { id: 'pt-sjc', rede: 'poupatempo', nome: 'Poupatempo São José dos Campos', cidade: 'São José dos Campos', uf: 'SP', lat: -23.1896, lng: -45.8841, atende: POUPATEMPO_ATENDE },

  // ---- Polícia Federal — passaporte (capitais) ----
  { id: 'pf-sp', rede: 'pf', nome: 'Polícia Federal', cidade: 'São Paulo', uf: 'SP', lat: -23.5505, lng: -46.6333, atende: ['passaporte'] },
  { id: 'pf-rj', rede: 'pf', nome: 'Polícia Federal', cidade: 'Rio de Janeiro', uf: 'RJ', lat: -22.9068, lng: -43.1729, atende: ['passaporte'] },
  { id: 'pf-df', rede: 'pf', nome: 'Polícia Federal', cidade: 'Brasília', uf: 'DF', lat: -15.7939, lng: -47.8828, atende: ['passaporte'] },
  { id: 'pf-mg', rede: 'pf', nome: 'Polícia Federal', cidade: 'Belo Horizonte', uf: 'MG', lat: -19.9167, lng: -43.9345, atende: ['passaporte'] },
  { id: 'pf-pr', rede: 'pf', nome: 'Polícia Federal', cidade: 'Curitiba', uf: 'PR', lat: -25.4284, lng: -49.2733, atende: ['passaporte'] },
  { id: 'pf-rs', rede: 'pf', nome: 'Polícia Federal', cidade: 'Porto Alegre', uf: 'RS', lat: -30.0346, lng: -51.2177, atende: ['passaporte'] },
  { id: 'pf-ba', rede: 'pf', nome: 'Polícia Federal', cidade: 'Salvador', uf: 'BA', lat: -12.9777, lng: -38.5016, atende: ['passaporte'] },
  { id: 'pf-pe', rede: 'pf', nome: 'Polícia Federal', cidade: 'Recife', uf: 'PE', lat: -8.0476, lng: -34.877, atende: ['passaporte'] },
  { id: 'pf-ce', rede: 'pf', nome: 'Polícia Federal', cidade: 'Fortaleza', uf: 'CE', lat: -3.7319, lng: -38.5267, atende: ['passaporte'] },
  { id: 'pf-am', rede: 'pf', nome: 'Polícia Federal', cidade: 'Manaus', uf: 'AM', lat: -3.119, lng: -60.0217, atende: ['passaporte'] },
  { id: 'pf-pa', rede: 'pf', nome: 'Polícia Federal', cidade: 'Belém', uf: 'PA', lat: -1.4558, lng: -48.4902, atende: ['passaporte'] },
  { id: 'pf-go', rede: 'pf', nome: 'Polícia Federal', cidade: 'Goiânia', uf: 'GO', lat: -16.6869, lng: -49.2648, atende: ['passaporte'] },
  { id: 'pf-es', rede: 'pf', nome: 'Polícia Federal', cidade: 'Vitória', uf: 'ES', lat: -20.3155, lng: -40.3128, atende: ['passaporte'] },
  { id: 'pf-sc', rede: 'pf', nome: 'Polícia Federal', cidade: 'Florianópolis', uf: 'SC', lat: -27.5949, lng: -48.5482, atende: ['passaporte'] },
  { id: 'pf-ma', rede: 'pf', nome: 'Polícia Federal', cidade: 'São Luís', uf: 'MA', lat: -2.5307, lng: -44.3068, atende: ['passaporte'] },
  { id: 'pf-pb', rede: 'pf', nome: 'Polícia Federal', cidade: 'João Pessoa', uf: 'PB', lat: -7.1195, lng: -34.845, atende: ['passaporte'] },
  { id: 'pf-rn', rede: 'pf', nome: 'Polícia Federal', cidade: 'Natal', uf: 'RN', lat: -5.7945, lng: -35.211, atende: ['passaporte'] },
  { id: 'pf-al', rede: 'pf', nome: 'Polícia Federal', cidade: 'Maceió', uf: 'AL', lat: -9.6498, lng: -35.7089, atende: ['passaporte'] },
  { id: 'pf-ms', rede: 'pf', nome: 'Polícia Federal', cidade: 'Campo Grande', uf: 'MS', lat: -20.4697, lng: -54.6201, atende: ['passaporte'] },
  { id: 'pf-mt', rede: 'pf', nome: 'Polícia Federal', cidade: 'Cuiabá', uf: 'MT', lat: -15.6014, lng: -56.0979, atende: ['passaporte'] },
]
