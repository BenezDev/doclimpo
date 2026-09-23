import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { aplicarAssinatura, buscarAssinatura, cancelarAssinatura } from "../_shared/cakto.ts";
import {
  assinaturaDoPedido,
  assinaturaWebhookValida,
  EVENTOS_QUE_ENCERRAM,
  EVENTOS_TRATADOS,
  pedidosDoEvento,
  PLANO_POR_SLUG,
  planoDaOferta,
  resumirAssinatura,
  statusPagamento,
  type PedidoCakto,
  type PlanoSlug,
  type PlanType,
} from "../_shared/cakto-eventos.ts";

// Fonte de verdade do plano. A Cakto chama servidor-a-servidor: não há CORS nem
// JWT — o HMAC de X-Cakto-Signature É a autenticação (verify_jwt = false no
// config.toml). Idempotente por evento + pedido. O estado da assinatura vem
// sempre da API da Cakto, não do nome do evento: entrega atrasada ou reenviada
// não ressuscita um cancelamento.

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const segredo = Deno.env.get("CAKTO_WEBHOOK_SECRET");
  if (!segredo) return json({ error: "Webhook não configurado" }, 500);

  const corpo = await req.text();
  const valida = await assinaturaWebhookValida(
    segredo,
    req.headers.get("x-cakto-timestamp"),
    corpo,
    req.headers.get("x-cakto-signature"),
  );
  if (!valida) return json({ error: "Assinatura inválida" }, 401);

  let payload: { event?: unknown; data?: unknown };
  try {
    payload = JSON.parse(corpo);
  } catch {
    return json({ error: "Corpo inválido" }, 400);
  }
  const evento = typeof payload.event === "string" ? payload.event : "";
  if (!EVENTOS_TRATADOS.has(evento)) return json({ received: true, ignorado: true });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const env = Deno.env.toObject();

  for (const pedido of pedidosDoEvento(payload.data)) {
    // Idempotência: a Cakto reenvia sem 2xx; o segundo processamento é um no-op.
    const chave = `${evento}:${pedido.id}`;
    const { error: registro } = await supabase.from("cakto_events").insert({ id: chave, tipo: evento });
    if (registro) {
      if (registro.code === "23505") continue;
      console.error("cakto_events:", registro.message);
      return json({ error: "Falha ao registrar evento" }, 500);
    }
    try {
      await processar(supabase, env, evento, pedido);
    } catch (erro) {
      // Sem 2xx a Cakto reenvia; apagamos o registro para o reenvio não cair na idempotência.
      await supabase.from("cakto_events").delete().eq("id", chave);
      console.error("cakto-webhook:", erro);
      return json({ error: "Falha ao processar evento" }, 500);
    }
  }
  return json({ received: true });
});

async function processar(supabase: SupabaseClient, env: Record<string, string>, evento: string, pedido: PedidoCakto) {
  const assinaturaId = assinaturaDoPedido(pedido);
  const vinculo = await usuarioDoPedido(supabase, pedido, assinaturaId);
  if (!vinculo) {
    console.warn("Pedido Cakto sem usuário identificável:", pedido.id);
    return;
  }

  const statusPago = statusPagamento(pedido.status);
  if (statusPago) {
    const { error } = await supabase.from("payments").upsert(
      {
        usuario_id: vinculo.usuarioId,
        amount: typeof pedido.amount === "number" ? pedido.amount : 0,
        currency: pedido.offer?.currency ?? "BRL",
        payment_method: pedido.paymentMethod ?? null,
        status: statusPago,
        cakto_order_id: pedido.id,
        invoice_url: null,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "cakto_order_id" },
    );
    if (error) throw new Error(`payments: ${error.message}`);
  }

  if (!assinaturaId) return;
  if (EVENTOS_QUE_ENCERRAM.has(evento)) await cancelarAssinatura(assinaturaId);
  const assinatura = await buscarAssinatura(assinaturaId);
  if (!assinatura) {
    console.warn("Assinatura Cakto não encontrada na API:", assinaturaId);
    return;
  }
  // O plano é o da oferta efetivamente paga; o registrado antes é o reserva.
  const plano = planoDaOferta(pedido.offer?.id, env) ?? vinculo.plano;
  await aplicarAssinatura(supabase, vinculo.usuarioId, resumirAssinatura(assinatura, plano));
}

// A assinatura já conhecida manda (renovações nem sempre trazem o callback);
// na primeira venda, o token do checkout que o próprio DocLimpo gerou.
async function usuarioDoPedido(
  supabase: SupabaseClient,
  pedido: PedidoCakto,
  assinaturaId: string | null,
): Promise<{ usuarioId: string; plano: PlanType | null } | null> {
  if (assinaturaId) {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("usuario_id, plan_type")
      .eq("cakto_subscription_id", assinaturaId)
      .maybeSingle();
    if (error) throw new Error(`subscriptions: ${error.message}`);
    if (data) return { usuarioId: data.usuario_id, plano: data.plan_type === "FREE" ? null : data.plan_type };
  }
  if (pedido.callback) {
    const { data, error } = await supabase.from("cakto_checkouts").select("usuario_id, plano").eq("token", pedido.callback).maybeSingle();
    if (error) throw new Error(`cakto_checkouts: ${error.message}`);
    if (data) return { usuarioId: data.usuario_id, plano: PLANO_POR_SLUG[data.plano as PlanoSlug] ?? null };
  }
  return null;
}
