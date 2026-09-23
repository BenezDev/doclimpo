import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { assinaturaAtiva, origemPermitida, priceDoPlano } from "../_shared/stripe-eventos.ts";

// Abre o Checkout do Stripe para um plano. O cliente manda só o slug do plano
// (individual | familia | mei); o price é resolvido aqui pelas variáveis de
// ambiente — o navegador nunca escolhe quanto pagar.

const PLANOS = new Set(["individual", "familia", "mei"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const responder = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return responder({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: erroUsuario } = await userClient.auth.getUser();
    if (erroUsuario || !user?.email) return responder({ error: "Não autorizado" }, 401);

    const corpo = await req.json().catch(() => ({}));
    const plano = typeof corpo.plano === "string" ? corpo.plano : "";
    if (!PLANOS.has(plano)) return responder({ error: "Plano inválido" }, 400);

    const env = Deno.env.toObject();
    const price = priceDoPlano(plano, env);
    const stripeKey = env.STRIPE_SECRET_KEY;
    if (!price || !stripeKey) return responder({ error: "Cobrança não configurada" }, 500);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    // Reusa o customer do perfil; senão cria um marcado com o user_id (o portal
    // e o webhook conferem esse vínculo antes de agir).
    const { data: perfil } = await admin.from("profiles").select("stripe_customer_id, plan_type").eq("user_id", user.id).maybeSingle();
    let customerId = perfil?.stripe_customer_id ?? null;
    if (customerId) {
      const existente = await stripe.customers.retrieve(customerId).catch(() => null);
      if (!existente || existente.deleted || existente.metadata?.user_id !== user.id) customerId = null;
    }
    if (!customerId) {
      const criado = await stripe.customers.create({ email: user.email, preferred_locales: ["pt-BR"], metadata: { user_id: user.id } });
      customerId = criado.id;
      await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", user.id);
    }

    // Quem já paga (ou está em trial/past_due, que ainda dão acesso) troca de
    // plano ou atualiza o cartão pelo portal; um segundo Checkout criaria uma
    // segunda assinatura e cobraria em dobro.
    const existentes = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
    if (existentes.data.some((s) => assinaturaAtiva(s.status))) {
      return responder({ error: "Você já tem uma assinatura ativa. Use \"Gerenciar assinatura\" na sua conta para trocar de plano." }, 409);
    }

    const origem = origemPermitida(req.headers.get("origin"), Deno.env.get("APP_URL") ?? "https://www.doclimpo.com");

    const sessao = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      locale: "pt-BR",
      success_url: `${origem}/dashboard?checkout=success`,
      cancel_url: `${origem}/dashboard?checkout=canceled`,
      metadata: { user_id: user.id, plano },
      subscription_data: { metadata: { user_id: user.id, plano } },
    });

    return responder({ url: sessao.url });
  } catch (erro) {
    console.error("create-checkout:", erro);
    return responder({ error: "Não foi possível iniciar o pagamento agora." }, 500);
  }
});
