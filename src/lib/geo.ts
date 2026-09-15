// Geometria de superfície — distância entre coordenadas e ordenação por proximidade.
// Lógica pura, testável sem navegador (padrão de lib/access-flow.ts).

export interface Coordenada {
  lat: number
  lng: number
}

const RAIO_TERRA_KM = 6371

function grausParaRad(graus: number): number {
  return (graus * Math.PI) / 180
}

// Distância do grande círculo (Haversine) em quilômetros.
export function haversineKm(a: Coordenada, b: Coordenada): number {
  const dLat = grausParaRad(b.lat - a.lat)
  const dLng = grausParaRad(b.lng - a.lng)
  const seno =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(grausParaRad(a.lat)) * Math.cos(grausParaRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * RAIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(seno)))
}

// Ordena os itens pela distância até a origem e devolve os `n` mais próximos,
// cada um anotado com `distanciaKm`.
export function maisProximas<T extends Coordenada>(
  origem: Coordenada,
  itens: readonly T[],
  n = 1,
): Array<T & { distanciaKm: number }> {
  return itens
    .map((item) => ({ ...item, distanciaKm: haversineKm(origem, item) }))
    .sort((a, b) => a.distanciaKm - b.distanciaKm)
    .slice(0, n)
}
