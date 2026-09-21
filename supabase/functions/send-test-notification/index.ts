import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const notificationType = body.notification_type || "EMAIL";

    if (notificationType !== "EMAIL") {
      return new Response(
        JSON.stringify({ error: `Envio por ${notificationType} ainda não implementado.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY não configurada no projeto." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const destinatario = user.email;
    if (!destinatario) throw new Error("Usuário sem email cadastrado");

    // Rate-limit: no máximo 1 e-mail de teste por minuto por usuário — sem isso
    // um laço na função vira abuso de envio (custo/reputação no Resend).
    const umMinutoAtras = new Date(Date.now() - 60000).toISOString();
    const { data: recentes } = await supabase
      .from("notifications")
      .select("id")
      .eq("usuario_id", user.id)
      .gte("sent_date", umMinutoAtras)
      .ilike("content", "Notificação de teste%")
      .limit(1);
    if (recentes && recentes.length > 0) {
      return new Response(
        JSON.stringify({ error: "Aguarde um minuto antes de enviar outro teste." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Envia de verdade antes de registrar. Antes desta correção a função
    // gravava status "SENT" sem mandar nada — um teste que passava mentindo.
    const envio = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("EMAIL_FROM") ?? "DocLimpo <alertas@docalert.com.br>",
        to: [destinatario],
        subject: "DocLimpo — notificação de teste",
        html: `<p>Está funcionando. 🎉</p><p>Se você recebeu este email, os alertas do DocLimpo estão configurados corretamente.</p>`,
      }),
    });

    if (!envio.ok) {
      const detalhe = await envio.text();
      throw new Error(`Falha no envio (Resend ${envio.status}): ${detalhe.slice(0, 200)}`);
    }

    // Registro do teste: sem documento_id — um id vindo do cliente não passa
    // por checagem de dono aqui, e o teste não é sobre um documento.
    const { data, error } = await supabase.from("notifications").insert({
      usuario_id: user.id,
      documento_id: null,
      notification_type: notificationType,
      scheduled_date: new Date().toISOString(),
      sent_date: new Date().toISOString(),
      status: "SENT",
      content: `Notificação de teste (${notificationType}) enviada para ${destinatario}`,
      days_before_expiry: 0,
    }).select().single();

    if (error) {
      throw new Error(`Email enviado, mas houve erro ao registrar: ${error.message}`);
    }

    return new Response(JSON.stringify({ success: true, enviado_para: destinatario, notification: data }), {
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
