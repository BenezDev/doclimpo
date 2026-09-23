import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { ehPlanoSlug, ofertaDoPlano, STATUS_COM_ACESSO, urlCheckout } from "../_shared/cakto-eventos.ts";

// Monta o link do checkout hospedado da Cakto para um plano. O cliente manda
// só o slug (individual | familia | mei); a oferta — e com ela o preço — é
// resolvida aqui pelas variáveis CAKTO_OFFER_*. O token opaco do ?callback=
// volta no webhook e liga a venda a este usuário; nunca levamos e-mail ou id
// do usuário na URL.

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
    if (erroUsuario || !user) return responder({ error: "Não autorizado" }, 401);

    const corpo = await req.json().catch(() => ({}));
    const plano = corpo?.plano;
    if (!ehPlanoSlug(plano)) return responder({ error: "Plano inválido" }, 400);

    const oferta = ofertaDoPlano(plano, Deno.env.toObject());
    if (!oferta) return responder({ error: "Cobrança não configurada" }, 500);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    // Um segundo checkout criaria uma segunda assinatura e cobraria em dobro.
    // A Cakto não troca plano de assinatura: troca = cancelar e assinar de novo.
    const { data: ativa, error: erroAtiva } = await admin
      .from("subscriptions")
      .select("id")
      .eq("usuario_id", user.id)
      .in("status", [...STATUS_COM_ACESSO])
      .limit(1)
      .maybeSingle();
    if (erroAtiva) throw new Error(erroAtiva.message);
    if (ativa) {
      return responder({ error: "Você já tem uma assinatura ativa. Para trocar de plano, cancele a atual na sua conta e assine o novo." }, 409);
    }

    // Reusa o token do mesmo plano criado nas últimas 24 h: clicar em "Assinar"
    // repetidas vezes não enche cakto_checkouts (no máximo um por plano e dia).
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recente, error: erroRecente } = await admin
      .from("cakto_checkouts")
      .select("token")
      .eq("usuario_id", user.id)
      .eq("plano", plano)
      .gte("criado_em", desde)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (erroRecente) throw new Error(erroRecente.message);

    let token = recente?.token;
    if (!token) {
      token = crypto.randomUUID();
      const { error: erroSessao } = await admin.from("cakto_checkouts").insert({ token, usuario_id: user.id, plano });
      if (erroSessao) throw new Error(erroSessao.message);
    }

    return responder({ url: urlCheckout(oferta, token) });
  } catch (erro) {
    console.error("cakto-checkout:", erro);
    return responder({ error: "Não foi possível iniciar o pagamento agora." }, 500);
  }
});
