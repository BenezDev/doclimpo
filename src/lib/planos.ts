// Catálogo de planos e regras de limite. Lógica pura, espelho da função SQL
// `plano_efetivo()` e da trigger `enforce_plan_limits` (migration
// 20260915120000_planos_e_familia.sql). O banco é a autoridade; isto é UX +
// defesa em profundidade. Preços aqui são só exibição — o valor cobrado vem do
// price do Stripe resolvido no servidor (create-checkout), nunca do cliente.

export const PLAN_TYPES = ['FREE', 'INDIVIDUAL', 'FAMILIAR', 'MEI'] as const
export type PlanType = (typeof PLAN_TYPES)[number]
export type PlanoPago = Exclude<PlanType, 'FREE'>

export const PLANO_SLUGS = ['individual', 'familia', 'mei'] as const
export type PlanoSlug = (typeof PLANO_SLUGS)[number]

export interface Plano {
  id: PlanoPago
  slug: PlanoSlug
  nome: string
  precoCentavos: number
  pessoas: number
  descricao: string
  beneficios: string[]
  destaque?: boolean
}

export const LIMITE_DOCUMENTOS_FREE = 1

// Canais de aviso. E-mail em todo plano; push e WhatsApp só nos pagos — o
// gate vale no servidor (send-pending-notifications) e aqui só para a UI.
export const CANAIS = ['EMAIL', 'PUSH', 'WHATSAPP'] as const
export type Canal = (typeof CANAIS)[number]
export const CANAIS_PAGOS: readonly Canal[] = ['PUSH', 'WHATSAPP']
export const ROTULO_CANAL: Record<Canal, string> = { EMAIL: 'E-mail', PUSH: 'Notificação no navegador', WHATSAPP: 'WhatsApp' }

// Interruptor de lançamento do WhatsApp (padrão de `legalPublished`). Só vira
// true quando o número e os templates estiverem aprovados na Meta e os
// segredos WHATSAPP_* configurados — antes disso a cópia não promete o canal.
export const WHATSAPP_DISPONIVEL = false

export function canaisDoPlano(plano: PlanType): Canal[] {
  const canais: Canal[] = ['EMAIL']
  if (!ehPago(plano)) return canais
  canais.push('PUSH')
  if (WHATSAPP_DISPONIVEL) canais.push('WHATSAPP')
  return canais
}

// Espelho de ALERT_DAYS em check-expiring-documents: dias antes do vencimento
// em que cada aviso sai. Mudou lá, muda aqui.
export const JANELAS_ALERTA = [90, 30, 7, 1] as const
export const LIMITE_PESSOAS_FAMILIA = 4

export const PLANOS: Plano[] = [
  {
    id: 'INDIVIDUAL',
    slug: 'individual',
    nome: 'Individual',
    precoCentavos: 990,
    pessoas: 1,
    destaque: true,
    descricao: 'Para quem cuida dos próprios documentos.',
    beneficios: ['Documentos ilimitados', 'Alertas por e-mail e notificações no navegador em 90, 30, 7 e 1 dia', 'Onde renovar e roteiro por documento'],
  },
  {
    id: 'MEI',
    slug: 'mei',
    nome: 'MEI',
    precoCentavos: 1989,
    pessoas: 1,
    descricao: 'Para o microempreendedor: documentos seus e da empresa.',
    beneficios: ['Tudo do Individual', 'Tipos empresariais: alvará, certidão negativa e DAS-MEI', 'Prazos da empresa no mesmo painel'],
  },
  {
    id: 'FAMILIAR',
    slug: 'familia',
    nome: 'Família',
    precoCentavos: 2989,
    pessoas: LIMITE_PESSOAS_FAMILIA,
    descricao: 'Até 4 pessoas, cada uma com a própria conta.',
    beneficios: ['Tudo do Individual, para até 4 pessoas', 'Cada pessoa com login, documentos e alertas próprios', 'Convide por e-mail e remova quando quiser'],
  },
]

export function normalizarPlano(valor: unknown): PlanType {
  return typeof valor === 'string' && (PLAN_TYPES as readonly string[]).includes(valor) ? (valor as PlanType) : 'FREE'
}

export function ehPago(plano: PlanType): boolean {
  return plano !== 'FREE'
}

// Espelho de enforce_plan_limits: FREE monitora 1 documento ativo.
export function podeAdicionarDocumento(plano: PlanType, documentosAtivos: number): boolean {
  return ehPago(plano) || documentosAtivos < LIMITE_DOCUMENTOS_FREE
}

export function planoPorSlug(slug: string): Plano | undefined {
  return PLANOS.find(plano => plano.slug === slug)
}

export function planoPorId(id: PlanType): Plano | undefined {
  return PLANOS.find(plano => plano.id === id)
}

export function rotuloPlano(plano: PlanType): string {
  return plano === 'FREE' ? 'Plano gratuito' : `Plano ${planoPorId(plano)?.nome ?? plano}`
}

export function formatarPreco(centavos: number): string {
  const reais = Math.floor(centavos / 100)
  const resto = (centavos % 100).toString().padStart(2, '0')
  return `R$ ${reais},${resto}`
}

// A URL de Checkout/Portal vem da nossa Edge Function, mas só seguimos para o
// Stripe: se algo no caminho for comprometido, o navegador não é redirecionado
// para um host arbitrário.
export function urlStripeSegura(url: unknown): string | null {
  if (typeof url !== 'string') return null
  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    return parsed.protocol === 'https:' && (host === 'stripe.com' || host.endsWith('.stripe.com')) ? url : null
  } catch {
    return null
  }
}
