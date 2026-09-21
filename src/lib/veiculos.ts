// Placa do veículo: normalização, validação e formatação. Espelho do CHECK de
// public.veiculos (migration 20260926120000_multas_e_veiculos.sql) e do
// trigger enforce_veiculos_limit. Lógica pura, testável com node:test.

// Mercosul AAA0A00 ou antiga AAA0000 (5º caractere letra ou dígito), sempre
// em maiúsculas e sem hífen — é assim que a placa fica gravada.
export const PLACA_RE = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/

export const LIMITE_VEICULOS = 5

export interface Veiculo {
  id: string
  placa: string
  uf: string
  apelido: string | null
}

export function normalizarPlaca(entrada: string): string {
  return entrada.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function placaValida(placa: string): boolean {
  return PLACA_RE.test(placa)
}

// Antiga ganha o hífen de sempre ("ABC-1234"); Mercosul fica como impressa.
export function formatarPlaca(placa: string): string {
  return /^[A-Z]{3}[0-9]{4}$/.test(placa) ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa
}
