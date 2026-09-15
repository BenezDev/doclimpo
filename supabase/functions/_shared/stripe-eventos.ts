// Tradução de objetos do Stripe para o que o DocLimpo grava. Lógica pura, sem
// Deno nem rede, para ser testada com node:test (tests/stripe-eventos.test.mjs).
// O webhook e o check-subscription usam isto para nunca discordarem.

export type PlanType = "FREE" | "INDIVIDUAL" | "FAMILIAR" | "MEI";
export type PlanoSlug = "individual" | "familia" | "mei";

export const PLANO_POR_SLUG: Record<PlanoSlug, PlanType> = {
  individual: "INDIVIDUAL",
  familia: "FAMILIAR",
  mei: "MEI",
};

// price_… (Stripe) → plano. Os price IDs vêm das variáveis de ambiente; o
// cliente nunca escolhe um price, só o slug do plano.
export type MapaPrecos = Record<string, PlanType>;

export function mapaDePrecos(env: Record<string, string | undefined>): MapaPrecos {
  const mapa: MapaPrecos = {};
  const pares: Array<[string, PlanType]> = [
    ["STRIPE_PRICE_INDIVIDUAL", "INDIVIDUAL"],
    ["STRIPE_PRICE_FAMILIAR", "FAMILIAR"],
    ["STRIPE_PRICE_MEI", "MEI"],
  ];
  for (const [chave, plano] of pares) {
    const price = env[chave]?.trim();
    if (price) mapa[price] = plano;
  }
  return mapa;
}

export function priceDoPlano(slug: string, env: Record<string, string | undefined>): string | null {
  const chave: Record<string, string> = {
    individual: "STRIPE_PRICE_INDIVIDUAL",
    familia: "STRIPE_PRICE_FAMILIAR",
    mei: "STRIPE_PRICE_MEI",
  };
  const nome = chave[slug];
  const price = nome ? env[nome]?.trim() : undefined;
  return price || null;
}

export function planoDoPrice(priceId: string | null | undefined, mapa: MapaPrecos): PlanType | null {
  if (!priceId) return null;
  return mapa[priceId] ?? null;
}

// Stripe: active/trialing dão acesso; past_due mantém o acesso enquanto o
// Stripe tenta cobrar de novo (política padrão). O resto rebaixa para FREE.
export function assinaturaAtiva(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

// Vocabulário local da tabela subscriptions.status.
export function statusLocal(status: string | null | undefined): string {
  switch (status) {
    case "active": return "ACTIVE";
    case "trialing": return "TRIAL";
    case "past_due": return "PAST_DUE";
    case "canceled": return "CANCELED";
    case "unpaid": return "UNPAID";
    case "incomplete": return "INCOMPLETE";
    case "incomplete_expired": return "EXPIRED";
    case "paused": return "PAUSED";
    default: return "UNKNOWN";
  }
}

// Subconjunto do objeto Subscription do Stripe que usamos.
export interface AssinaturaStripe {
  id: string;
  customer: string | { id: string };
  status: string;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string> | null;
  items: { data: Array<{ price: { id: string }; current_period_end?: number }> };
  // Versões antigas da API expõem no topo; as novas, por item.
  current_period_end?: number;
}

export interface ResumoAssinatura {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  usuarioIdMetadata: string | null;
  planoDoPreco: PlanType | null;
  ativa: boolean;
  status: string;
  fimPeriodo: string | null;
  autoRenova: boolean;
  // Plano que profiles.plan_type deve assumir.
  planoEfetivo: PlanType;
}

export function resumirAssinatura(sub: AssinaturaStripe, mapa: MapaPrecos): ResumoAssinatura {
  const item = sub.items?.data?.[0];
  const planoDoPreco = planoDoPrice(item?.price?.id, mapa);
  const ativa = assinaturaAtiva(sub.status);
  const fim = item?.current_period_end ?? sub.current_period_end;
  return {
    stripeSubscriptionId: sub.id,
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    usuarioIdMetadata: sub.metadata?.user_id ?? null,
    planoDoPreco,
    ativa,
    status: statusLocal(sub.status),
    fimPeriodo: fim ? new Date(fim * 1000).toISOString() : null,
    autoRenova: !sub.cancel_at_period_end,
    planoEfetivo: ativa && planoDoPreco ? planoDoPreco : "FREE",
  };
}

// Subconjunto do objeto Invoice do Stripe.
export interface FaturaStripe {
  id: string;
  customer: string | { id: string };
  amount_paid?: number;
  amount_due?: number;
  currency?: string;
  status?: string | null;
  hosted_invoice_url?: string | null;
  subscription?: string | { id: string } | null;
}

export interface ResumoFatura {
  stripePaymentId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  valor: number;
  moeda: string;
  status: "PAID" | "FAILED" | "OPEN";
  urlFatura: string | null;
}

export function resumirFatura(invoice: FaturaStripe, evento: "invoice.paid" | "invoice.payment_failed"): ResumoFatura {
  const pago = evento === "invoice.paid";
  const centavos = pago ? invoice.amount_paid ?? 0 : invoice.amount_due ?? 0;
  const assinatura = invoice.subscription;
  return {
    stripePaymentId: invoice.id,
    stripeCustomerId: typeof invoice.customer === "string" ? invoice.customer : invoice.customer.id,
    stripeSubscriptionId: !assinatura ? null : typeof assinatura === "string" ? assinatura : assinatura.id,
    valor: Math.round(centavos) / 100,
    moeda: (invoice.currency ?? "brl").toUpperCase(),
    status: pago ? "PAID" : "FAILED",
    urlFatura: invoice.hosted_invoice_url ?? null,
  };
}

// Origem permitida para redirecionos do Checkout/Portal: só o app (APP_URL) e
// o dev local. Nunca refletimos a origem do request sem checar — seria um
// open redirect assinado pelo Stripe.
export function origemPermitida(origin: string | null, appUrl: string): string {
  const permitidas = new Set([appUrl, "http://localhost:5173", "http://127.0.0.1:5173"]);
  return origin && permitidas.has(origin) ? origin : appUrl;
}
