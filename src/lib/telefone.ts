// Celular para WhatsApp em E.164. Cópia do normalizador do servidor
// (supabase/functions/_shared/notificacoes.ts); o teste garante que os dois
// concordam. O servidor revalida antes de gravar.

export const E164_RE = /^\+[1-9][0-9]{7,14}$/

// Aceita "(11) 99999-9999", "11999999999", "+55 11 99999 9999". Sem DDI, assume Brasil.
export function normalizarE164(entrada: string): string | null {
  const digitos = entrada.replace(/\D/g, '')
  if (!digitos) return null
  const comDdi = entrada.trim().startsWith('+') || (digitos.length > 11 && digitos.startsWith('55')) ? digitos : `55${digitos}`
  const numero = `+${comDdi}`
  return E164_RE.test(numero) ? numero : null
}

// "+5511999999999" → "+55 11 •••••-9999"
export function mascararTelefone(e164: string): string {
  if (!E164_RE.test(e164)) return e164
  const fim = e164.slice(-4)
  const inicio = e164.startsWith('+55') && e164.length === 14 ? `+55 ${e164.slice(3, 5)}` : e164.slice(0, 4)
  return `${inicio} •••••-${fim}`
}
