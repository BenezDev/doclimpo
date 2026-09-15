// Consentimento de cookies/armazenamento local.
//
// O DocLimpo só usa armazenamento local essencial: a sessão de autenticação
// (integrations/supabase/client) e a preferência de tema (hooks/useTheme).
// Não há publicidade nem rastreamento — por isso o aviso é informativo e
// registra o aceite, em vez de oferecer categorias opcionais que não existem.
//
// A lógica de decisão fica separada do acesso ao localStorage para ser
// testável sem navegador, no mesmo estilo de lib/access-flow.ts.

export const CONSENT_STORAGE_KEY = 'doclimpo-consent'

// Suba a versão quando o texto do aviso mudar de forma relevante: aceites
// antigos deixam de valer e o aviso reaparece.
export const CONSENT_VERSION = 1

export interface ConsentRecord {
  v: number
  at: string
}

export function parseConsent(raw: string | null): ConsentRecord | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<ConsentRecord> | null
    if (value && typeof value.v === 'number' && typeof value.at === 'string') {
      return { v: value.v, at: value.at }
    }
    return null
  } catch {
    return null
  }
}

// Mostra o aviso quando não há aceite válido da versão atual guardado.
export function shouldPrompt(raw: string | null): boolean {
  const record = parseConsent(raw)
  return !record || record.v !== CONSENT_VERSION
}

export function buildConsent(now: Date = new Date()): ConsentRecord {
  return { v: CONSENT_VERSION, at: now.toISOString() }
}

export function readStoredConsent(): string | null {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY)
  } catch {
    return null
  }
}

export function persistConsent(record: ConsentRecord = buildConsent()): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record))
  } catch {
    /* O aviso ainda funciona quando o armazenamento do navegador está bloqueado. */
  }
}
