import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // O usuário indicado é sempre quem está chamando — nunca um id vindo do
    // corpo do request. Antes desta correção qualquer um podia forjar
    // indicações arbitrárias e conceder meses grátis a si mesmo.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Usuário não encontrado" }, 401);

    const { referral_code } = await req.json().catch(() => ({}));
    if (!referral_code || typeof referral_code !== "string") {
      return json({ error: "referral_code é obrigatório" }, 400);
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // O indicador é resolvido a partir do código, não informado pelo cliente.
    const { data: codigo } = await supabaseAdmin
      .from("referral_codes")
      .select("user_id")
      .eq("code", referral_code.trim().toUpperCase())
      .maybeSingle();

    if (!codigo) return json({ error: "Código de indicação inválido" }, 404);

    const referrerId = codigo.user_id as string;
    if (referrerId === user.id) {
      return json({ error: "Você não pode usar seu próprio código" }, 400);
    }

    // A constraint UNIQUE em referred_id impede indicação duplicada.
    const { error } = await supabaseAdmin.from("referrals").insert({
      referrer_id: referrerId,
      referred_id: user.id,
      status: "completed",
      reward_months: 1,
    });

    if (error) {
      return json({ ok: false, reason: "Esta conta já foi indicada" }, 200);
    }

    return json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return json({ error: msg }, 500);
  }
});
