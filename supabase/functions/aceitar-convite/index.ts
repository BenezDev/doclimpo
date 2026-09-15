import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { hashToken, tokenValido } from "../_shared/token.ts";

// Aceita um convite do plano Família. Exige: usuário autenticado, token
// válido e não expirado, e o e-mail da conta igual ao e-mail convidado. Depois
// disso o plano efetivo da pessoa passa a ser FAMILIAR (função plano_efetivo).

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
    if (!tokenValido(corpo.token)) return responder({ error: "Convite inválido." }, 400);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    const { data: convite } = await admin
      .from("familia_membros")
      .select("id, familia_id, email, expira_em")
      .eq("token_hash", await hashToken(corpo.token))
      .eq("status", "convidado")
      .maybeSingle();
    if (!convite) return responder({ error: "Convite inválido ou já usado." }, 404);
    if (!convite.expira_em || new Date(convite.expira_em).getTime() < Date.now()) {
      return responder({ error: "Este convite expirou. Peça um novo ao titular da família." }, 410);
    }
    if (convite.email.toLowerCase() !== user.email.toLowerCase()) {
      return responder({ error: "Entre com a conta do e-mail que recebeu o convite." }, 403);
    }

    // Quem já é titular de uma família não entra em outra.
    const { data: titular } = await admin.from("familias").select("id").eq("titular_id", user.id).maybeSingle();
    if (titular) return responder({ error: "Você já é titular de uma família." }, 409);

    const { error } = await admin
      .from("familia_membros")
      .update({ user_id: user.id, status: "ativo", aceito_em: new Date().toISOString(), token_hash: null, expira_em: null })
      .eq("id", convite.id);
    if (error) {
      if (error.code === "23505") return responder({ error: "Você já faz parte de uma família." }, 409);
      throw new Error(error.message);
    }

    const { data: familia } = await admin.from("familias").select("titular_id").eq("id", convite.familia_id).maybeSingle();
    const { data: perfilTitular } = familia
      ? await admin.from("profiles").select("nome").eq("user_id", familia.titular_id).maybeSingle()
      : { data: null };

    return responder({ ok: true, titular: perfilTitular?.nome ?? null });
  } catch (erro) {
    console.error("aceitar-convite:", erro);
    return responder({ error: "Não foi possível aceitar o convite agora." }, 500);
  }
});
