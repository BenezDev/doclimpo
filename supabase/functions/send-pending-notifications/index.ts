import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { compararSegredo } from "../_shared/seguranca.ts";
import { escapeHtml } from "../_shared/html.ts";
import { CANAIS, type Canal, formatarData, higienizarTexto, rotuloDocumento, textoAlerta } from "../_shared/notificacoes.ts";
import { carregarServidorPush, enviarPush as enviarPushWeb } from "../_shared/push.ts";
import { configWhatsapp, enviarTemplate } from "../_shared/whatsapp.ts";

// check-expiring-documents apenas enfileira linhas em notifications, uma por
// canal. Esta função drena a fila e envia cada linha pelo seu tipo.
const LOTE = 100;
const JANELA_RETENTATIVA_DIAS = 7;
const APP_URL = Deno.env.get("APP_URL") ?? "https://www.doclimpo.com";
const VERDE = "#0a7742";

interface Notificacao {
  id: string;
  usuario_id: string;
  documento_id: string | null;
  notification_type: Canal;
  days_before_expiry: number | null;
}

interface Perfil {
  nome: string | null;
  email: string | null;
  notification_email: boolean;
  notification_whatsapp: boolean;
  whatsapp_number: string | null;
  whatsapp_verificado_em: string | null;
}

interface Documento {
  id: string;
  tipo: string;
  apelido: string | null;
  data_vencimento: string;
  resolvido: boolean;
}

// PENDING = falha transitória, a próxima rodada tenta de novo (até 7 dias).
type Resultado = { estado: "SENT" | "SKIPPED" | "FAILED" | "PENDING"; detalhe?: string };

interface Contexto {
  supabase: SupabaseClient;
  resendKey: string;
  remetente: string;
}

function corpoEmail(opts: {
  nome: string | null;
  rotuloDocumento: string;
  dataVencimento: string;
  diasRestantes: number | null;
}) {
  const { nome, rotuloDocumento, dataVencimento, diasRestantes } = opts;
  const rotuloSeguro = escapeHtml(rotuloDocumento);
  const nomeSeguro = nome ? escapeHtml(nome) : "";
  const venceu = diasRestantes !== null && diasRestantes <= 0;
  const chamada = escapeHtml(textoAlerta(diasRestantes, rotuloDocumento).titulo);
  const cor = venceu ? "#a81e17" : diasRestantes !== null && diasRestantes <= 7 ? "#9c6009" : VERDE;

  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px;background:#f8f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
    <div style="padding:22px 28px;border-bottom:1px solid #e2e8f0;">
      <span style="font-size:17px;font-weight:800;color:#0f172a;">Doc<span style="color:${VERDE};">Limpo</span></span>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 6px;font-size:13px;color:#64748b;">Olá${nomeSeguro ? `, ${nomeSeguro}` : ""}!</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:${cor};font-weight:800;">${chamada}</h1>
      <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;">Documento</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">${rotuloSeguro}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#64748b;">Vencimento</td>
          <td style="padding:10px 0;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">${formatarData(dataVencimento)}</td>
        </tr>
      </table>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.65;color:#475569;">
        ${venceu
          ? "Regularize o quanto antes para evitar multa. No painel você encontra o passo a passo de renovação."
          : "Ainda dá tempo de renovar sem correria. No painel você encontra o passo a passo, com prazos e custos."}
      </p>
      <a href="${APP_URL}/dashboard"
         style="display:inline-block;background:${VERDE};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:700;">
        Ver no DocLimpo
      </a>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #e2e8f0;background:#f8f9fc;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        Você recebe este aviso porque cadastrou este documento no DocLimpo.
        <a href="${APP_URL}/conta" style="color:#64748b;">Pausar alertas ou gerenciar a conta</a>.
      </p>
    </div>
  </div>
</body></html>`;
}

async function enviarEmail(ctx: Contexto, n: Notificacao, perfil: Perfil, documento: Documento): Promise<Resultado> {
  if (!perfil.email || perfil.notification_email === false) return { estado: "SKIPPED", detalhe: "email_desligado" };
  const rotulo = rotuloDocumento(documento);
  const dias = n.days_before_expiry;
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${ctx.resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: ctx.remetente,
      to: [perfil.email],
      // Provedores usam este header para oferecer "cancelar inscrição" na própria caixa de entrada.
      headers: { "List-Unsubscribe": `<${APP_URL}/conta>` },
      subject: `${dias !== null && dias <= 0 ? "⚠️ " : ""}${textoAlerta(dias, rotulo).titulo}`,
      html: corpoEmail({ nome: perfil.nome, rotuloDocumento: rotulo, dataVencimento: documento.data_vencimento, diasRestantes: dias }),
    }),
  });
  if (resposta.ok) return { estado: "SENT" };
  const detalhe = `Resend ${resposta.status} ${(await resposta.text()).slice(0, 120)}`;
  return { estado: resposta.status === 429 || resposta.status >= 500 ? "PENDING" : "FAILED", detalhe };
}

// Push: uma mensagem por dispositivo do usuário. Assinatura morta (404/410)
// é apagada na hora; basta um dispositivo entregue para a linha virar SENT.
async function enviarPush(ctx: Contexto, n: Notificacao, _perfil: Perfil, documento: Documento): Promise<Resultado> {
  const app = await carregarServidorPush();
  if (!app) return { estado: "SKIPPED", detalhe: "canal_nao_configurado" };

  const { data: assinaturas } = await ctx.supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("usuario_id", n.usuario_id);
  if (!assinaturas || assinaturas.length === 0) return { estado: "SKIPPED", detalhe: "sem_dispositivo" };

  const rotulo = rotuloDocumento(documento);
  const dias = n.days_before_expiry;
  const carga = {
    title: textoAlerta(dias, rotulo).titulo,
    body: `Vencimento ${formatarData(documento.data_vencimento)}. Toque para ver o passo a passo.`,
    url: `/documento/${documento.id}`,
    tag: `doc-${documento.id}-${dias ?? 0}`,
  };
  const topic = `${documento.id.replace(/-/g, "").slice(0, 24)}-${dias ?? 0}`;

  let entregues = 0;
  let transitorias = 0;
  const detalhes: string[] = [];
  for (const assinatura of assinaturas) {
    const r = await enviarPushWeb(app, assinatura, carga, { topic, urgencia: dias !== null && dias <= 7 ? "high" : "normal" });
    if (r.ok) {
      entregues++;
      await ctx.supabase.from("push_subscriptions").update({ ultimo_uso_em: new Date().toISOString() }).eq("id", assinatura.id);
      continue;
    }
    detalhes.push(r.detalhe);
    if (r.remover) await ctx.supabase.from("push_subscriptions").delete().eq("id", assinatura.id);
    else if (r.retentar) transitorias++;
  }
  if (entregues > 0) return { estado: "SENT", detalhe: `${entregues}/${assinaturas.length} dispositivos` };
  if (transitorias > 0) return { estado: "PENDING", detalhe: detalhes.join("; ") };
  return { estado: "SKIPPED", detalhe: detalhes.join("; ").slice(0, 300) || "sem_dispositivo" };
}

// WhatsApp: template aprovado na Meta, só para número verificado por código.
// Erro que indica número inválido/opt-out desliga o canal para o usuário.
async function enviarWhatsapp(ctx: Contexto, n: Notificacao, perfil: Perfil, documento: Documento): Promise<Resultado> {
  const config = configWhatsapp();
  if (!config) return { estado: "SKIPPED", detalhe: "canal_nao_configurado" };
  if (!perfil.notification_whatsapp || !perfil.whatsapp_verificado_em || !perfil.whatsapp_number) {
    return { estado: "SKIPPED", detalhe: "whatsapp_nao_verificado" };
  }
  const rotulo = rotuloDocumento(documento);
  const dias = n.days_before_expiry;
  const nome = higienizarTexto((perfil.nome ?? "").split(" ")[0] || "olá", 30);
  const r = await enviarTemplate(config, {
    para: perfil.whatsapp_number,
    template: config.templateAlerta,
    parametros: [nome, rotulo, textoAlerta(dias, rotulo).prazo, formatarData(documento.data_vencimento)],
  });
  if (r.ok) return { estado: "SENT", detalhe: r.id };
  if (r.classe === "desativar") {
    await ctx.supabase.from("profiles").update({ notification_whatsapp: false, whatsapp_verificado_em: null }).eq("user_id", n.usuario_id);
    return { estado: "FAILED", detalhe: `desativado: ${r.detalhe}` };
  }
  if (r.classe === "retentar") return { estado: "PENDING", detalhe: r.detalhe };
  return { estado: "FAILED", detalhe: r.detalhe };
}

const ENVIADORES: Record<Canal, (ctx: Contexto, n: Notificacao, p: Perfil, d: Documento) => Promise<Resultado>> = {
  EMAIL: enviarEmail,
  PUSH: enviarPush,
  WHATSAPP: enviarWhatsapp,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const responder = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret || !compararSegredo(req.headers.get("x-cron-secret") ?? "", cronSecret)) {
      return responder({ error: "Não autorizado" }, 401);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return responder({ error: "RESEND_API_KEY não configurada" }, 500);
    const remetente = Deno.env.get("EMAIL_FROM") ?? "DocLimpo <alertas@docalert.com.br>";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const ctx: Contexto = { supabase, resendKey, remetente };

    const limiteRetentativa = new Date(Date.now() - JANELA_RETENTATIVA_DIAS * 86400000).toISOString();

    const { data: pendentes, error: erroFila } = await supabase
      .from("notifications")
      .select("id, usuario_id, documento_id, notification_type, days_before_expiry")
      .eq("status", "PENDING")
      .in("notification_type", [...CANAIS])
      .lte("scheduled_date", new Date().toISOString())
      .gte("scheduled_date", limiteRetentativa)
      .order("scheduled_date", { ascending: true })
      .limit(LOTE);

    if (erroFila) throw new Error(`Erro ao ler a fila: ${erroFila.message}`);

    const resultado = { pendentes: pendentes?.length ?? 0, enviados: 0, pulados: 0, falhas: [] as string[] };
    const planoCache = new Map<string, string>();

    const concluir = async (id: string, r: Resultado) => {
      if (r.estado === "PENDING") return;
      await supabase
        .from("notifications")
        .update({ status: r.estado, sent_date: new Date().toISOString(), detalhe: r.detalhe?.slice(0, 300) ?? null })
        .eq("id", id);
    };

    for (const notificacao of (pendentes ?? []) as Notificacao[]) {
      try {
        const { data: perfil } = await supabase
          .from("profiles")
          .select("nome, email, notification_email, notification_whatsapp, whatsapp_number, whatsapp_verificado_em")
          .eq("user_id", notificacao.usuario_id)
          .maybeSingle();
        if (!perfil) {
          await concluir(notificacao.id, { estado: "SKIPPED", detalhe: "perfil_ausente" });
          resultado.pulados++;
          continue;
        }

        const { data: documento } = await supabase
          .from("documentos")
          .select("id, tipo, apelido, data_vencimento, resolvido")
          .eq("id", notificacao.documento_id ?? "")
          .maybeSingle();
        // Documento renovado ou removido entre o enfileiramento e o envio.
        if (!documento || documento.resolvido) {
          await concluir(notificacao.id, { estado: "SKIPPED", detalhe: "documento_resolvido" });
          resultado.pulados++;
          continue;
        }

        // Push e WhatsApp são benefícios pagos: o gate vale aqui, no servidor,
        // mesmo que a linha tenha sido enfileirada quando o plano era outro.
        if (notificacao.notification_type !== "EMAIL") {
          let plano = planoCache.get(notificacao.usuario_id);
          if (!plano) {
            const { data } = await supabase.rpc("plano_efetivo", { uid: notificacao.usuario_id });
            plano = typeof data === "string" ? data : "FREE";
            planoCache.set(notificacao.usuario_id, plano);
          }
          if (plano === "FREE") {
            await concluir(notificacao.id, { estado: "SKIPPED", detalhe: "plano_free" });
            resultado.pulados++;
            continue;
          }
        }

        const enviar = ENVIADORES[notificacao.notification_type];
        if (!enviar) {
          await concluir(notificacao.id, { estado: "FAILED", detalhe: "canal_desconhecido" });
          resultado.falhas.push(`${notificacao.id}: canal ${notificacao.notification_type}`);
          continue;
        }

        const r = await enviar(ctx, notificacao, perfil as Perfil, documento as Documento);
        await concluir(notificacao.id, r);
        if (r.estado === "SENT") resultado.enviados++;
        else if (r.estado === "SKIPPED") resultado.pulados++;
        else resultado.falhas.push(`${notificacao.id}/${notificacao.notification_type}: ${r.detalhe ?? r.estado}`);
      } catch (erro) {
        const msg = erro instanceof Error ? erro.message : String(erro);
        resultado.falhas.push(`${notificacao.id}: ${msg}`);
      }
    }

    console.log("send-pending-notifications:", JSON.stringify(resultado));

    // Falhas ficam PENDING (transitórias) ou FAILED (permanentes), mas alguém
    // precisa saber que elas existem. Com ADMIN_EMAIL definido, um resumo vai
    // para o operador.
    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    if (adminEmail && resultado.falhas.length > 0) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: remetente,
          to: [adminEmail],
          subject: `DocLimpo: ${resultado.falhas.length} alerta(s) não enviado(s)`,
          text: `Rodada de ${new Date().toISOString()}\nPendentes: ${resultado.pendentes} · Enviados: ${resultado.enviados} · Pulados: ${resultado.pulados}\n\nFalhas:\n${resultado.falhas.map((f) => `- ${f}`).join("\n")}`,
        }),
      }).catch((erro) => console.error("Aviso ao admin falhou:", erro));
    }

    return responder({ success: true, ...resultado });
  } catch (error) {
    console.error("Erro fatal:", error);
    return responder({ success: false, error: String(error) }, 500);
  }
});
