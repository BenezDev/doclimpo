import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { aplicarAssinatura, cancelarAssinatura } from "../_shared/cakto.ts";
import { resumirAssinatura, STATUS_COM_ACESSO, type PlanType } from "../_shared/cakto-eventos.ts";

// Cancela na Cakto as assinaturas com acesso do usuário autenticado (a Cakto
// não tem portal do cliente; o cancelamento "pela sua conta" dos termos é
// este). O id vem do banco, nunca do corpo do request.

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

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: assinaturas, error } = await admin
      .from("subscriptions")
      .select("cakto_subscription_id, plan_type")
      .eq("usuario_id", user.id)
      .in("status", [...STATUS_COM_ACESSO])
      .not("cakto_subscription_id", "is", null);
    if (error) throw new Error(error.message);
    if (!assinaturas?.length) return responder({ error: "Nenhuma assinatura ativa encontrada para esta conta." }, 404);

    for (const { cakto_subscription_id: id, plan_type } of assinaturas) {
      const atual = await cancelarAssinatura(id!);
      const plano = plan_type === "FREE" ? null : (plan_type as PlanType);
      await aplicarAssinatura(admin, user.id, resumirAssinatura(atual ?? { id: id!, status: "canceled" }, plano));
    }

    return responder({ cancelada: true });
  } catch (erro) {
    console.error("cancelar-assinatura:", erro);
    return responder({ error: "Não foi possível concluir o cancelamento agora. Tente de novo em instantes." }, 500);
  }
});
