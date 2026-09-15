// Centroides aproximados de municípios (por código IBGE) e das 27 UFs.
// Resolvem a coordenada do usuário a partir do CEP sem geocodificador externo:
// ViaCEP devolve o código IBGE -> aqui vira lat/lng. Precisão a nível de
// município, suficiente para escolher a unidade de renovação mais próxima.
//
// Cobertura inicial: capitais + principais cidades. Municípios fora da lista
// caem no fallback por nome e, por fim, no centroide da UF (lib/endereco.ts).

export interface CentroideMunicipio {
  lat: number
  lng: number
  cidade: string
  uf: string
}

export const municipios: Record<string, CentroideMunicipio> = {
  // Capitais
  '3550308': { lat: -23.5505, lng: -46.6333, cidade: 'São Paulo', uf: 'SP' },
  '3304557': { lat: -22.9068, lng: -43.1729, cidade: 'Rio de Janeiro', uf: 'RJ' },
  '5300108': { lat: -15.7939, lng: -47.8828, cidade: 'Brasília', uf: 'DF' },
  '2927408': { lat: -12.9777, lng: -38.5016, cidade: 'Salvador', uf: 'BA' },
  '2304400': { lat: -3.7319, lng: -38.5267, cidade: 'Fortaleza', uf: 'CE' },
  '3106200': { lat: -19.9167, lng: -43.9345, cidade: 'Belo Horizonte', uf: 'MG' },
  '1302603': { lat: -3.119, lng: -60.0217, cidade: 'Manaus', uf: 'AM' },
  '4106902': { lat: -25.4284, lng: -49.2733, cidade: 'Curitiba', uf: 'PR' },
  '2611606': { lat: -8.0476, lng: -34.877, cidade: 'Recife', uf: 'PE' },
  '5208707': { lat: -16.6869, lng: -49.2648, cidade: 'Goiânia', uf: 'GO' },
  '1501402': { lat: -1.4558, lng: -48.4902, cidade: 'Belém', uf: 'PA' },
  '4314902': { lat: -30.0346, lng: -51.2177, cidade: 'Porto Alegre', uf: 'RS' },
  '2111300': { lat: -2.5307, lng: -44.3068, cidade: 'São Luís', uf: 'MA' },
  '2704302': { lat: -9.6498, lng: -35.7089, cidade: 'Maceió', uf: 'AL' },
  '2408102': { lat: -5.7945, lng: -35.211, cidade: 'Natal', uf: 'RN' },
  '5002704': { lat: -20.4697, lng: -54.6201, cidade: 'Campo Grande', uf: 'MS' },
  '2211001': { lat: -5.0892, lng: -42.8019, cidade: 'Teresina', uf: 'PI' },
  '2507507': { lat: -7.1195, lng: -34.845, cidade: 'João Pessoa', uf: 'PB' },
  '5103403': { lat: -15.6014, lng: -56.0979, cidade: 'Cuiabá', uf: 'MT' },
  '2800308': { lat: -10.9472, lng: -37.0731, cidade: 'Aracaju', uf: 'SE' },
  '4205407': { lat: -27.5949, lng: -48.5482, cidade: 'Florianópolis', uf: 'SC' },
  '3205309': { lat: -20.3155, lng: -40.3128, cidade: 'Vitória', uf: 'ES' },
  '1100205': { lat: -8.7619, lng: -63.9039, cidade: 'Porto Velho', uf: 'RO' },
  '1600303': { lat: 0.0349, lng: -51.0694, cidade: 'Macapá', uf: 'AP' },
  '1200401': { lat: -9.9754, lng: -67.8249, cidade: 'Rio Branco', uf: 'AC' },
  '1400100': { lat: 2.8235, lng: -60.6758, cidade: 'Boa Vista', uf: 'RR' },
  '1721000': { lat: -10.184, lng: -48.3336, cidade: 'Palmas', uf: 'TO' },

  // Regiões metropolitanas / grandes cidades
  '3518800': { lat: -23.4543, lng: -46.5337, cidade: 'Guarulhos', uf: 'SP' },
  '3509502': { lat: -22.9099, lng: -47.0626, cidade: 'Campinas', uf: 'SP' },
  '3548708': { lat: -23.6914, lng: -46.5646, cidade: 'São Bernardo do Campo', uf: 'SP' },
  '3547809': { lat: -23.6639, lng: -46.5383, cidade: 'Santo André', uf: 'SP' },
  '3534401': { lat: -23.5329, lng: -46.7916, cidade: 'Osasco', uf: 'SP' },
  '3552205': { lat: -23.5015, lng: -47.4526, cidade: 'Sorocaba', uf: 'SP' },
  '3543402': { lat: -21.1775, lng: -47.8103, cidade: 'Ribeirão Preto', uf: 'SP' },
  '3549904': { lat: -23.1896, lng: -45.8841, cidade: 'São José dos Campos', uf: 'SP' },
  '3548500': { lat: -23.9608, lng: -46.3336, cidade: 'Santos', uf: 'SP' },
  '3304904': { lat: -22.8268, lng: -43.0634, cidade: 'São Gonçalo', uf: 'RJ' },
  '3301702': { lat: -22.7856, lng: -43.3117, cidade: 'Duque de Caxias', uf: 'RJ' },
  '3303302': { lat: -22.8832, lng: -43.1034, cidade: 'Niterói', uf: 'RJ' },
  '3303500': { lat: -22.7561, lng: -43.4508, cidade: 'Nova Iguaçu', uf: 'RJ' },
  '3170206': { lat: -18.9186, lng: -48.2772, cidade: 'Uberlândia', uf: 'MG' },
  '3118601': { lat: -19.932, lng: -44.0539, cidade: 'Contagem', uf: 'MG' },
  '4113700': { lat: -23.3045, lng: -51.1696, cidade: 'Londrina', uf: 'PR' },
  '4209102': { lat: -26.3044, lng: -48.8487, cidade: 'Joinville', uf: 'SC' },
  '2910800': { lat: -12.2664, lng: -38.9663, cidade: 'Feira de Santana', uf: 'BA' },
  '2607901': { lat: -8.1128, lng: -35.0148, cidade: 'Jaboatão dos Guararapes', uf: 'PE' },
}

// Centro geográfico aproximado de cada UF — fallback quando o município não
// está na tabela acima.
export const ufCentroides: Record<string, { lat: number; lng: number }> = {
  AC: { lat: -9.02, lng: -70.81 },
  AL: { lat: -9.57, lng: -36.55 },
  AP: { lat: 1.41, lng: -51.77 },
  AM: { lat: -3.9, lng: -63.34 },
  BA: { lat: -12.47, lng: -41.71 },
  CE: { lat: -5.2, lng: -39.53 },
  DF: { lat: -15.78, lng: -47.93 },
  ES: { lat: -19.57, lng: -40.34 },
  GO: { lat: -15.98, lng: -49.86 },
  MA: { lat: -5.42, lng: -45.44 },
  MT: { lat: -12.68, lng: -55.92 },
  MS: { lat: -20.51, lng: -54.54 },
  MG: { lat: -18.1, lng: -44.38 },
  PA: { lat: -4.28, lng: -52.29 },
  PB: { lat: -7.24, lng: -36.78 },
  PR: { lat: -24.62, lng: -51.62 },
  PE: { lat: -8.38, lng: -37.86 },
  PI: { lat: -7.72, lng: -42.73 },
  RJ: { lat: -22.25, lng: -42.66 },
  RN: { lat: -5.81, lng: -36.59 },
  RS: { lat: -30.03, lng: -53.09 },
  RO: { lat: -10.83, lng: -63.34 },
  RR: { lat: 2.05, lng: -61.4 },
  SC: { lat: -27.24, lng: -50.22 },
  SP: { lat: -22.19, lng: -48.79 },
  SE: { lat: -10.57, lng: -37.45 },
  TO: { lat: -9.46, lng: -48.26 },
}
