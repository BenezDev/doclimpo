import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { mapaDePrecos, resumirAssinatura, type AssinaturaStripe } from "../_shared/stripe-eventos.ts";

// Sincroniza o plano do usuário autenticado com o Stripe sob demanda (volta do
// Checkout, abertura da conta). O webhook é a fonte contínua; isto cobre a
// janela entre o pagamento e a chegada do evento. Mesma tradução do webhook.

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

    const env = Deno.env.toObject();
    const stripeKey = env.STRIPE_SECRET_KEY;
    if (!stripeKey) return responder({ error: "Cobrança não configurada" }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const mapa = mapaDePrecos(env);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: perfil } = await admin.from("profiles").select("stripe_customer_id, plan_type").eq("user_id", user.id).maybeSingle();

    // Sem customer vinculado não há o que sincronizar — e não rebaixamos quem
    // herda plano da família (o plano efetivo é calculado no banco).
    const customerId = perfil?.stripe_customer_id;
    if (!customerId) return responder({ assinatura: false, plan_type: perfil?.plan_type ?? "FREE" });

    const customer = await stripe.customers.retrieve(customerId).catch(() => null);
    if (!customer || customer.deleted || (customer.metadata?.user_id !== user.id && customer.email !== user.email)) {
      return responder({ assinatura: false, plan_type: perfil?.plan_type ?? "FREE" });
    }

    const lista = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
    const ativa = lista.data.find((s) => s.status === "active" || s.status === "trialing" || s.status === "past_due");
    const resumo = ativa ? resumirAssinatura(ativa as unknown as AssinaturaStripe, mapa) : null;
    const planType = resumo?.planoEfetivo ?? "FREE";

    const { error } = await admin.from("profiles").update({ plan_type: planType }).eq("user_id", user.id);
    if (error) throw new Error(error.message);

    if (resumo) {
      await admin.from("subscriptions").upsert(
        {
          usuario_id: user.id,
          plan_type: resumo.planoDoPreco ?? "FREE",
          status: resumo.status,
          end_date: resumo.fimPeriodo,
          auto_renew: resumo.autoRenova,
          stripe_subscription_id: resumo.stripeSubscriptionId,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" },
      );
    }

    return responder({ assinatura: Boolean(resumo), plan_type: planType, fim_periodo: resumo?.fimPeriodo ?? null });
  } catch (erro) {
    console.error("check-subscription:", erro);
    return responder({ error: "Não foi possível verificar a assinatura agora." }, 500);
  }
});
