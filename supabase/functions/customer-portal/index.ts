import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { origemPermitida } from "../_shared/stripe-eventos.ts";

// Abre o portal de cobrança do Stripe (trocar cartão, cancelar, faturas).
// Só abre o portal do customer que pertence ao usuário autenticado.

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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return responder({ error: "Cobrança não configurada" }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: perfil } = await admin.from("profiles").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
    const customerId = perfil?.stripe_customer_id;
    if (!customerId) return responder({ error: "Nenhuma assinatura encontrada para esta conta." }, 404);

    // O customer precisa ser deste usuário (metadata gravada no create-checkout).
    const customer = await stripe.customers.retrieve(customerId).catch(() => null);
    if (!customer || customer.deleted || (customer.metadata?.user_id !== user.id && customer.email !== user.email)) {
      return responder({ error: "Nenhuma assinatura encontrada para esta conta." }, 404);
    }

    const origem = origemPermitida(req.headers.get("origin"), Deno.env.get("APP_URL") ?? "https://docalert-three.vercel.app");
    const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${origem}/conta` });

    return responder({ url: portal.url });
  } catch (erro) {
    console.error("customer-portal:", erro);
    return responder({ error: "Não foi possível abrir o portal agora." }, 500);
  }
});
