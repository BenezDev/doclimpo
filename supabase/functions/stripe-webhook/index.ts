import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  mapaDePrecos,
  resumirAssinatura,
  resumirFatura,
  type AssinaturaStripe,
  type FaturaStripe,
  type ResumoAssinatura,
  type ResumoFatura,
} from "../_shared/stripe-eventos.ts";

// Fonte de verdade do plano. O Stripe chama esta função servidor-a-servidor:
// não há CORS nem JWT — a assinatura `stripe-signature` É a autenticação
// (verify_jwt = false no config.toml). Idempotente por event.id.

const cryptoProvider = Stripe.createSubtleCryptoProvider();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!webhookSecret || !stripeKey) return json({ error: "Webhook não configurado" }, 500);

  const assinatura = req.headers.get("stripe-signature");
  if (!assinatura) return json({ error: "Assinatura ausente" }, 400);

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const corpo = await req.text();

  let evento: Stripe.Event;
  try {
    evento = await stripe.webhooks.constructEventAsync(corpo, assinatura, webhookSecret, undefined, cryptoProvider);
  } catch {
    return json({ error: "Assinatura inválida" }, 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // Idempotência: o Stripe reenvia eventos; o segundo processamento é um no-op.
  const { error: registro } = await supabase.from("stripe_events").insert({ id: evento.id, tipo: evento.type });
  if (registro) {
    if (registro.code === "23505") return json({ received: true, duplicado: true });
    console.error("stripe_events:", registro.message);
    return json({ error: "Falha ao registrar evento" }, 500);
  }

  const mapa = mapaDePrecos(Deno.env.toObject());

  try {
    switch (evento.type) {
      case "checkout.session.completed": {
        const sessao = evento.data.object as Stripe.Checkout.Session;
        if (sessao.mode !== "subscription" || !sessao.subscription) break;
        const sub = await stripe.subscriptions.retrieve(String(sessao.subscription));
        const usuarioId = sessao.client_reference_id ?? sessao.metadata?.user_id ?? null;
        await aplicarAssinatura(supabase, stripe, mapa, resumirAssinatura(sub as unknown as AssinaturaStripe, mapa), usuarioId);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = evento.data.object as unknown as AssinaturaStripe;
        await aplicarAssinatura(supabase, stripe, mapa, resumirAssinatura(sub, mapa), null);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const fatura = evento.data.object as unknown as FaturaStripe;
        await aplicarFatura(supabase, resumirFatura(fatura, evento.type));
        break;
      }
      default:
        // Outros eventos não interessam ao DocLimpo.
        break;
    }
    return json({ received: true });
  } catch (erro) {
    // Sem 2xx o Stripe reenvia; apagamos o registro para o reenvio não cair na idempotência.
    await supabase.from("stripe_events").delete().eq("id", evento.id);
    console.error("stripe-webhook:", erro);
    return json({ error: "Falha ao processar evento" }, 500);
  }
});

async function usuarioDoCustomer(supabase: SupabaseClient, customerId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  return data?.user_id ?? null;
}

async function aplicarAssinatura(
  supabase: SupabaseClient,
  stripe: Stripe,
  mapa: ReturnType<typeof mapaDePrecos>,
  resumo: ResumoAssinatura,
  usuarioIdDaSessao: string | null,
) {
  const usuarioId = usuarioIdDaSessao ?? resumo.usuarioIdMetadata ?? await usuarioDoCustomer(supabase, resumo.stripeCustomerId);
  if (!usuarioId) {
    console.warn("Assinatura sem usuário identificável:", resumo.stripeSubscriptionId);
    return;
  }

  // Troca de plano cria uma assinatura nova e cancela a antiga; o "deleted" da
  // antiga não pode rebaixar quem ainda tem outra ativa.
  let efetivo = resumo;
  if (!resumo.ativa) {
    const ativas = await stripe.subscriptions.list({ customer: resumo.stripeCustomerId, status: "active", limit: 1 });
    if (ativas.data.length > 0) efetivo = resumirAssinatura(ativas.data[0] as unknown as AssinaturaStripe, mapa);
  }

  const { error: erroPerfil } = await supabase
    .from("profiles")
    .update({ plan_type: efetivo.planoEfetivo, stripe_customer_id: resumo.stripeCustomerId })
    .eq("user_id", usuarioId);
  if (erroPerfil) throw new Error(`profiles: ${erroPerfil.message}`);

  const { error: erroAssinatura } = await supabase.from("subscriptions").upsert(
    {
      usuario_id: usuarioId,
      plan_type: resumo.planoDoPreco ?? "FREE",
      status: resumo.status,
      end_date: resumo.fimPeriodo,
      auto_renew: resumo.autoRenova,
      stripe_subscription_id: resumo.stripeSubscriptionId,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (erroAssinatura) throw new Error(`subscriptions: ${erroAssinatura.message}`);
}

async function aplicarFatura(supabase: SupabaseClient, resumo: ResumoFatura) {
  const usuarioId = await usuarioDoCustomer(supabase, resumo.stripeCustomerId);
  if (!usuarioId) {
    console.warn("Fatura sem usuário identificável:", resumo.stripePaymentId);
    return;
  }
  const { error } = await supabase.from("payments").upsert(
    {
      usuario_id: usuarioId,
      amount: resumo.valor,
      currency: resumo.moeda,
      payment_method: "stripe",
      status: resumo.status,
      stripe_payment_id: resumo.stripePaymentId,
      invoice_url: resumo.urlFatura,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "stripe_payment_id" },
  );
  if (error) throw new Error(`payments: ${error.message}`);
}
