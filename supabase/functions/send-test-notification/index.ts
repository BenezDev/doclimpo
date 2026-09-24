import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { COR_EMAIL, REMETENTE_PADRAO, layoutEmail } from "../_shared/email.ts";
import { carregarServidorPush, enviarPush } from "../_shared/push.ts";

// Envio de teste pelo próprio usuário (JWT do cliente; RLS vale em tudo).
// Canais: EMAIL (todo plano) e PUSH (planos pagos, para os dispositivos que o
// usuário ativou em Minha conta). Rate-limit: 1 teste por minuto.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const responder = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return responder({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return responder({ error: "Usuário não encontrado" }, 401);

    const body = await req.json().catch(() => ({}));
    const canal = body.notification_type === "PUSH" ? "PUSH" : body.notification_type === "EMAIL" || !body.notification_type ? "EMAIL" : null;
    if (!canal) return responder({ error: `Envio por ${String(body.notification_type)} não disponível.` }, 400);

    // Rate-limit: no máximo 1 teste por minuto por usuário — sem isso um laço
    // na função vira abuso de envio (custo/reputação no Resend, quota de push).
    const umMinutoAtras = new Date(Date.now() - 60000).toISOString();
    const { data: recentes } = await supabase
      .from("notifications")
      .select("id")
      .eq("usuario_id", user.id)
      .gte("sent_date", umMinutoAtras)
      .ilike("content", "Notificação de teste%")
      .limit(1);
    if (recentes && recentes.length > 0) return responder({ error: "Aguarde um minuto antes de enviar outro teste." }, 429);

    let destino: string;

    if (canal === "PUSH") {
      // Benefício pago: o mesmo cálculo do banco (inclui plano herdado da família).
      const { data: plano } = await supabase.rpc("meu_plano");
      if (plano === "FREE" || typeof plano !== "string") {
        return responder({ error: "Notificações no navegador fazem parte dos planos pagos." }, 403);
      }
      const app = await carregarServidorPush();
      if (!app) return responder({ error: "Notificações no navegador ainda não estão configuradas neste ambiente." }, 503);

      const { data: assinaturas } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("usuario_id", user.id);
      if (!assinaturas || assinaturas.length === 0) return responder({ error: "Nenhum dispositivo ativado. Ative as notificações neste navegador primeiro." }, 400);

      let entregues = 0;
      for (const assinatura of assinaturas) {
        const r = await enviarPush(app, assinatura, {
          title: "DocLimpo — notificação de teste",
          body: "Está funcionando. Os avisos de vencimento chegarão assim.",
          url: "/conta",
          tag: "teste",
        }, { ttl: 600, urgencia: "high" });
        if (r.ok) entregues++;
        else if (r.remover) await supabase.from("push_subscriptions").delete().eq("id", assinatura.id);
      }
      if (entregues === 0) return responder({ error: "Nenhum dispositivo recebeu o teste. Desative e ative de novo as notificações neste navegador." }, 400);
      destino = `${entregues} dispositivo(s)`;
    } else {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) return responder({ error: "RESEND_API_KEY não configurada no projeto." }, 500);
      if (!user.email) throw new Error("Usuário sem email cadastrado");

      // Envia de verdade antes de registrar. Antes desta correção a função
      // gravava status "SENT" sem mandar nada — um teste que passava mentindo.
      const envio = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: Deno.env.get("EMAIL_FROM") ?? REMETENTE_PADRAO,
          to: [user.email],
          subject: "DocLimpo — notificação de teste",
          html: layoutEmail({
            appUrl: Deno.env.get("APP_URL") ?? "https://www.doclimpo.com",
            titulo: "Está funcionando.",
            corpo: `<p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:${COR_EMAIL.texto};">Se você recebeu este e-mail, os avisos do DocLimpo chegam na sua caixa de entrada. Salve este endereço nos seus contatos para eles não caírem no spam.</p>`,
            rodape: "Você pediu este e-mail de teste na sua conta do DocLimpo.",
          }),
        }),
      });
      if (!envio.ok) {
        const detalhe = await envio.text();
        throw new Error(`Falha no envio (Resend ${envio.status}): ${detalhe.slice(0, 200)}`);
      }
      destino = user.email;
    }

    // Registro do teste: sem documento_id — um id vindo do cliente não passa
    // por checagem de dono aqui, e o teste não é sobre um documento.
    const { data, error } = await supabase.from("notifications").insert({
      usuario_id: user.id,
      documento_id: null,
      notification_type: canal,
      scheduled_date: new Date().toISOString(),
      sent_date: new Date().toISOString(),
      status: "SENT",
      content: `Notificação de teste (${canal}) enviada para ${destino}`,
      days_before_expiry: 0,
    }).select().single();

    if (error) throw new Error(`Teste enviado, mas houve erro ao registrar: ${error.message}`);

    return responder({ success: true, enviado_para: destino, notification: data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return responder({ error: msg }, 500);
  }
});
