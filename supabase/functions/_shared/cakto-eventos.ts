// Tradução da Cakto para o que o DocLimpo grava. Lógica pura, sem Deno nem
// rede, para ser testada com node:test (tests/cakto.test.mjs). Checkout,
// webhook, cancelamento e exclusão de conta usam isto para nunca discordarem.
// Contrato: https://docs.cakto.com.br/conceitos/webhooks

import { compararSegredo } from "./seguranca.ts";

export type PlanType = "FREE" | "INDIVIDUAL" | "FAMILIAR" | "MEI";
export type PlanoSlug = "individual" | "familia" | "mei";

export const PLANO_POR_SLUG: Record<PlanoSlug, PlanType> = {
  individual: "INDIVIDUAL",
  familia: "FAMILIAR",
  mei: "MEI",
};

// Id da oferta de cada plano (o mesmo do link pay.cakto.com.br/<id>). Vem do
// ambiente; o cliente manda só o slug e nunca escolhe oferta nem preço.
const OFERTA_ENV: Record<PlanoSlug, string> = {
  individual: "CAKTO_OFFER_INDIVIDUAL",
  familia: "CAKTO_OFFER_FAMILIAR",
  mei: "CAKTO_OFFER_MEI",
};

export function ehPlanoSlug(valor: unknown): valor is PlanoSlug {
  return typeof valor === "string" && Object.hasOwn(OFERTA_ENV, valor);
}

export function ofertaDoPlano(slug: string, env: Record<string, string | undefined>): string | null {
  if (!ehPlanoSlug(slug)) return null;
  return env[OFERTA_ENV[slug]]?.trim() || null;
}

export function planoDaOferta(ofertaId: string | null | undefined, env: Record<string, string | undefined>): PlanType | null {
  if (!ofertaId) return null;
  for (const slug of Object.keys(OFERTA_ENV) as PlanoSlug[]) {
    if (ofertaDoPlano(slug, env) === ofertaId) return PLANO_POR_SLUG[slug];
  }
  return null;
}

// O token volta no webhook em data.callback. Charset da Cakto: letras,
// números e . _ ~ - (fora disso ela descarta o valor).
export function urlCheckout(oferta: string, token: string): string {
  return `https://pay.cakto.com.br/${encodeURIComponent(oferta)}?callback=${encodeURIComponent(token)}`;
}

// Cakto: active/trial dão acesso; late mantém o acesso enquanto a Cakto
// retenta a cobrança. canceled/expired/inactive/paused rebaixam para FREE.
export function assinaturaAtiva(status: string | null | undefined): boolean {
  return status === "active" || status === "trial" || status === "late";
}

// Vocabulário local de subscriptions.status. STATUS_COM_ACESSO é o espelho
// local de assinaturaAtiva, para filtrar no banco.
export const STATUS_COM_ACESSO = ["ACTIVE", "TRIAL", "PAST_DUE"] as const;

export function statusLocal(status: string | null | undefined): string {
  switch (status) {
    case "active": return "ACTIVE";
    case "trial": return "TRIAL";
    case "late": return "PAST_DUE";
    case "canceled": return "CANCELED";
    case "expired": return "EXPIRED";
    case "inactive": return "INACTIVE";
    case "paused": return "PAUSED";
    default: return "UNKNOWN";
  }
}

// Status do pedido → payments.status. null = não é um pagamento a registrar.
export function statusPagamento(status: string | null | undefined): string | null {
  switch (status) {
    case "paid": return "PAID";
    case "refused": return "FAILED";
    case "refunded": return "REFUNDED";
    case "chargedback": return "CHARGEBACK";
    default: return null;
  }
}

// Dinheiro devolvido não pode continuar cobrando nem dando acesso: nesses
// eventos o webhook cancela a assinatura na Cakto antes de sincronizar.
export const EVENTOS_QUE_ENCERRAM = new Set(["refund", "chargeback"]);

// Eventos assinados no webhook (o resto é ignorado com 200).
export const EVENTOS_TRATADOS = new Set([
  "purchase_approved",
  "purchase_refused",
  "refund",
  "chargeback",
  "subscription_created",
  "subscription_renewed",
  "subscription_renewal_refused",
  "subscription_late",
  "subscription_late_recovered",
  "subscription_paused",
  "subscription_resumed",
  "subscription_canceled",
]);

// Subconjunto da "forma de pedido" do webhook que usamos.
export interface PedidoCakto {
  id: string;
  status?: string;
  amount?: number | null;
  paymentMethod?: string;
  callback?: string | null;
  offer?: { id?: string; currency?: string } | null;
  subscription?: string | { id?: string } | null;
}

// Webhook V1 manda um pedido em `data`; o V2, uma lista (pedido principal e
// bumps da mesma cobrança). Aceitamos os dois e descartamos o que não é pedido.
export function pedidosDoEvento(data: unknown): PedidoCakto[] {
  const lista = Array.isArray(data) ? data : [data];
  return lista.filter((item): item is PedidoCakto =>
    typeof item === "object" && item !== null && typeof (item as { id?: unknown }).id === "string" && (item as { id: string }).id !== ""
  );
}

export function assinaturaDoPedido(pedido: PedidoCakto): string | null {
  const sub = pedido.subscription;
  if (!sub) return null;
  if (typeof sub === "string") return sub || null;
  return typeof sub.id === "string" && sub.id ? sub.id : null;
}

// Subconjunto de GET /public_api/subscriptions/{id}/.
export interface AssinaturaCakto {
  id: string;
  status: string;
  next_payment_date?: string | null;
}

export interface ResumoAssinatura {
  caktoSubscriptionId: string;
  plano: PlanType | null;
  ativa: boolean;
  status: string;
  fimPeriodo: string | null;
  autoRenova: boolean;
  // Plano que profiles.plan_type deve assumir.
  planoEfetivo: PlanType;
}

export function resumirAssinatura(sub: AssinaturaCakto, plano: PlanType | null): ResumoAssinatura {
  const ativa = assinaturaAtiva(sub.status);
  return {
    caktoSubscriptionId: sub.id,
    plano,
    ativa,
    status: statusLocal(sub.status),
    fimPeriodo: sub.next_payment_date ?? null,
    autoRenova: ativa,
    planoEfetivo: ativa && plano ? plano : "FREE",
  };
}

// X-Cakto-Signature: "v1=<hex do HMAC-SHA256 de `${timestamp}.${corpo cru}`>",
// com o segredo do webhook. Pode trazer várias versões separadas por vírgula;
// só a v1 conta. Janela de 5 min contra reenvio de payload capturado.
export const TOLERANCIA_ASSINATURA_S = 5 * 60;

export async function assinaturaWebhookValida(
  segredo: string,
  timestamp: string | null,
  corpo: string,
  cabecalho: string | null,
  agoraS = Date.now() / 1000,
): Promise<boolean> {
  if (!segredo || !timestamp || !cabecalho || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(agoraS - Number(timestamp)) > TOLERANCIA_ASSINATURA_S) return false;

  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(`${timestamp}.${corpo}`));
  const esperado = Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");

  return cabecalho.split(",").some((parte) => {
    const [versao, valor] = parte.trim().split("=", 2);
    return versao === "v1" && typeof valor === "string" && compararSegredo(valor, esperado);
  });
}
