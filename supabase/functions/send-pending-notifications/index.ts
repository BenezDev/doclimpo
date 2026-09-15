import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { compararSegredo } from "../_shared/seguranca.ts";
import { escapeHtml } from "../_shared/html.ts";

// check-expiring-documents apenas enfileira linhas em notifications.
// Esta função é o elo que faltava: drena a fila e envia de fato.
const LOTE = 100;
const JANELA_RETENTATIVA_DIAS = 7;
const APP_URL = Deno.env.get("APP_URL") ?? "https://docalert-three.vercel.app";
const VERDE = "#0a7742";

const LABELS: Record<string, string> = {
  cnh: "CNH",
  crlv: "CRLV",
  ipva: "IPVA",
  passaporte: "Passaporte",
  rg: "RG",
  seguro: "Seguro Auto",
  plano_saude: "Plano de Saúde",
  carteira_trabalho: "Carteira de Trabalho",
  alvara: "Alvará",
  certidao: "Certidão negativa",
  das_mei: "DAS-MEI",
  outro: "Documento",
};

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
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

  const chamada = venceu
    ? `Seu ${rotuloSeguro} venceu`
    : `Seu ${rotuloSeguro} vence em ${diasRestantes} ${diasRestantes === 1 ? "dia" : "dias"}`;

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

    const limiteRetentativa = new Date(
      Date.now() - JANELA_RETENTATIVA_DIAS * 86400000,
    ).toISOString();

    const { data: pendentes, error: erroFila } = await supabase
      .from("notifications")
      .select("id, usuario_id, documento_id, days_before_expiry, content")
      .eq("status", "PENDING")
      .eq("notification_type", "EMAIL")
      .lte("scheduled_date", new Date().toISOString())
      .gte("scheduled_date", limiteRetentativa)
      .order("scheduled_date", { ascending: true })
      .limit(LOTE);

    if (erroFila) throw new Error(`Erro ao ler a fila: ${erroFila.message}`);

    const resultado = { pendentes: pendentes?.length ?? 0, enviados: 0, pulados: 0, falhas: [] as string[] };

    for (const notificacao of pendentes ?? []) {
      try {
        const { data: perfil } = await supabase
          .from("profiles")
          .select("nome, email, notification_email")
          .eq("user_id", notificacao.usuario_id)
          .maybeSingle();

        // Respeita a preferência do usuário e não tenta enviar sem destinatário.
        if (!perfil?.email || perfil.notification_email === false) {
          await supabase
            .from("notifications")
            .update({ status: "SKIPPED", sent_date: new Date().toISOString() })
            .eq("id", notificacao.id);
          resultado.pulados++;
          continue;
        }

        const { data: documento } = await supabase
          .from("documentos")
          .select("tipo, apelido, data_vencimento, resolvido")
          .eq("id", notificacao.documento_id)
          .maybeSingle();

        // Documento renovado ou removido entre o enfileiramento e o envio.
        if (!documento || documento.resolvido) {
          await supabase
            .from("notifications")
            .update({ status: "SKIPPED", sent_date: new Date().toISOString() })
            .eq("id", notificacao.id);
          resultado.pulados++;
          continue;
        }

        const rotulo = documento.apelido || LABELS[documento.tipo] || "documento";
        const dias = notificacao.days_before_expiry;

        const resposta = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: remetente,
            to: [perfil.email],
            // Provedores usam este header para oferecer "cancelar inscrição" na própria caixa de entrada.
            headers: { "List-Unsubscribe": `<${APP_URL}/conta>` },
            subject:
              dias !== null && dias <= 0
                ? `⚠️ Seu ${rotulo} venceu`
                : `Seu ${rotulo} vence em ${dias} ${dias === 1 ? "dia" : "dias"}`,
            html: corpoEmail({
              nome: perfil.nome,
              rotuloDocumento: rotulo,
              dataVencimento: documento.data_vencimento,
              diasRestantes: dias,
            }),
          }),
        });

        if (!resposta.ok) {
          // Continua PENDING para a próxima rodada tentar de novo.
          const detalhe = await resposta.text();
          resultado.falhas.push(`${notificacao.id}: Resend ${resposta.status} ${detalhe.slice(0, 120)}`);
          continue;
        }

        await supabase
          .from("notifications")
          .update({ status: "SENT", sent_date: new Date().toISOString() })
          .eq("id", notificacao.id);

        resultado.enviados++;
      } catch (erro) {
        const msg = erro instanceof Error ? erro.message : String(erro);
        resultado.falhas.push(`${notificacao.id}: ${msg}`);
      }
    }

    console.log("send-pending-notifications:", JSON.stringify(resultado));

    // Falhas ficam PENDING para retentativa, mas alguém precisa saber que elas
    // existem. Com ADMIN_EMAIL definido, um resumo vai para o operador.
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
