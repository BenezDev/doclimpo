import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the user's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with user's token to get their ID
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client to delete user data and auth record (LGPD)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Apaga os dados respeitando as chaves estrangeiras e a coluna de posse
    // correta de cada tabela: profiles/referral_codes usam user_id; referrals
    // usa referred_id/referrer_id; as demais usam usuario_id. Os erros são
    // coletados — se algo falhar, NÃO removemos o usuário do auth, para o
    // apagamento poder ser retentado sem deixar a conta órfã (LGPD).
    const remocoes: { tabela: string; coluna: string }[] = [
      { tabela: "renovacoes", coluna: "usuario_id" },
      { tabela: "alertas_configuracao", coluna: "usuario_id" },
      { tabela: "notifications", coluna: "usuario_id" },
      { tabela: "push_subscriptions", coluna: "usuario_id" },
      { tabela: "whatsapp_verificacoes", coluna: "usuario_id" },
      { tabela: "documentos", coluna: "usuario_id" },
      { tabela: "payments", coluna: "usuario_id" },
      { tabela: "subscriptions", coluna: "usuario_id" },
      { tabela: "referrals", coluna: "referred_id" },
      { tabela: "referrals", coluna: "referrer_id" },
      { tabela: "referral_codes", coluna: "user_id" },
      { tabela: "profiles", coluna: "user_id" },
    ];

    const erros: string[] = [];
    for (const { tabela, coluna } of remocoes) {
      const { error } = await adminClient.from(tabela).delete().eq(coluna, user.id);
      if (error) erros.push(`${tabela}.${coluna}: ${error.message}`);
    }

    if (erros.length > 0) {
      return new Response(
        JSON.stringify({ error: `Falha ao apagar dados; nada foi removido do auth. ${erros.join("; ")}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      throw new Error(`Erro ao deletar conta: ${deleteError.message}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Conta deletada com sucesso (LGPD)" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
