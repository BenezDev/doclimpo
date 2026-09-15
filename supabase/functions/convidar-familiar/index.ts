import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { escapeHtml } from "../_shared/html.ts";
import { gerarToken, hashToken } from "../_shared/token.ts";

// Plano Família: o titular convida uma pessoa por e-mail. Só quem tem
// plan_type = FAMILIAR próprio convida; a família tem no máximo 4 pessoas
// (trigger enforce_family_limit). O convite vale 7 dias e só pode ser aceito
// por uma conta com o mesmo e-mail (aceitar-convite).

const VALIDADE_DIAS = 7;
const CONVITES_POR_HORA = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const email = typeof corpo.email === "string" ? corpo.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email) || email.length > 254) return responder({ error: "Informe um e-mail válido." }, 400);
    if (email === user.email.toLowerCase()) return responder({ error: "Você já faz parte da sua própria família." }, 400);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    const { data: perfil } = await admin.from("profiles").select("nome, plan_type").eq("user_id", user.id).maybeSingle();
    if (perfil?.plan_type !== "FAMILIAR") return responder({ error: "Só o plano Família pode convidar pessoas." }, 403);

    // Família do titular (cria na primeira vez).
    let { data: familia } = await admin.from("familias").select("id").eq("titular_id", user.id).maybeSingle();
    if (!familia) {
      const { data: criada, error } = await admin.from("familias").insert({ titular_id: user.id }).select("id").single();
      if (error) throw new Error(error.message);
      familia = criada;
    }

    // Rate-limit: cada convite custa um e-mail.
    const umaHoraAtras = new Date(Date.now() - 3600000).toISOString();
    const { count } = await admin
      .from("familia_membros")
      .select("id", { count: "exact", head: true })
      .eq("familia_id", familia.id)
      .gte("criado_em", umaHoraAtras);
    if ((count ?? 0) >= CONVITES_POR_HORA) return responder({ error: "Muitos convites em pouco tempo. Tente de novo mais tarde." }, 429);

    // A pessoa já é membro ativo de alguma família? Uma pessoa, uma família.
    const { data: emOutra } = await admin.from("familia_membros").select("familia_id").eq("email", email).eq("status", "ativo").maybeSingle();
    if (emOutra) {
      // Não confirmamos a terceiros que um e-mail pertence a outra família.
      return responder({ error: emOutra.familia_id === familia.id ? "Essa pessoa já faz parte da sua família." : "Esse e-mail não pode ser convidado agora." }, 409);
    }

    const token = gerarToken();
    const tokenHash = await hashToken(token);
    const expiraEm = new Date(Date.now() + VALIDADE_DIAS * 86400000).toISOString();

    // Reenvio: convite pendente para o mesmo e-mail ganha token e prazo novos.
    const { data: pendente } = await admin.from("familia_membros").select("id").eq("familia_id", familia.id).eq("email", email).maybeSingle();
    let membroId: string;
    if (pendente) {
      const { error } = await admin.from("familia_membros").update({ token_hash: tokenHash, expira_em: expiraEm, criado_em: new Date().toISOString() }).eq("id", pendente.id);
      if (error) throw new Error(error.message);
      membroId = pendente.id;
    } else {
      const { data: novo, error } = await admin
        .from("familia_membros")
        .insert({ familia_id: familia.id, email, status: "convidado", token_hash: tokenHash, expira_em: expiraEm })
        .select("id")
        .single();
      if (error) {
        if (error.message.includes("FAMILY_LIMIT")) return responder({ error: "Sua família já tem 4 pessoas." }, 409);
        throw new Error(error.message);
      }
      membroId = novo.id;
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return responder({ error: "Envio de e-mail não configurado." }, 500);

    const appUrl = Deno.env.get("APP_URL") ?? "https://docalert-three.vercel.app";
    const nomeSeguro = escapeHtml(perfil?.nome || user.email);
    const link = `${appUrl}/conta?convite=${token}`;

    const envio = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("EMAIL_FROM") ?? "DocLimpo <alertas@docalert.com.br>",
        to: [email],
        subject: `${perfil?.nome || "Alguém"} convidou você para a família no DocLimpo`,
        html: `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px;background:#f8f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:28px;">
    <p style="margin:0 0 12px;font-size:17px;font-weight:800;color:#0f172a;">Doc<span style="color:#0a7742;">Limpo</span></p>
    <h1 style="margin:0 0 12px;font-size:20px;color:#0f172a;">${nomeSeguro} convidou você para a família.</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#475569;">Com o plano Família, você acompanha seus próprios documentos e recebe os alertas no seu e-mail, sem pagar nada. Crie sua conta (ou entre) usando <strong>este mesmo e-mail</strong> e aceite o convite.</p>
    <a href="${link}" style="display:inline-block;background:#0a7742;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:700;">Aceitar convite</a>
    <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">O convite vale por ${VALIDADE_DIAS} dias. Se você não esperava este e-mail, ignore-o.</p>
  </div>
</body></html>`,
      }),
    });

    if (!envio.ok) {
      // Sem e-mail o convite é inútil: desfaz para o titular poder tentar de novo.
      await admin.from("familia_membros").delete().eq("id", membroId).eq("status", "convidado");
      const detalhe = await envio.text();
      console.error("convidar-familiar Resend", envio.status, detalhe.slice(0, 200));
      return responder({ error: "Não foi possível enviar o convite agora. Tente de novo em instantes." }, 502);
    }

    return responder({ ok: true, email, expira_em: expiraEm });
  } catch (erro) {
    console.error("convidar-familiar:", erro);
    return responder({ error: "Não foi possível convidar agora." }, 500);
  }
});
