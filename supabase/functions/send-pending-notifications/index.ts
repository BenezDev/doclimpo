import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { compararSegredo } from "../_shared/seguranca.ts";
import { escapeHtml } from "../_shared/html.ts";
import { COR_EMAIL, REMETENTE_PADRAO, layoutEmail } from "../_shared/email.ts";
import { CANAIS, type Canal, dataLocalBr, diasEntre, emLotes, formatarData, higienizarTexto, rotuloDocumento, textoAlerta } from "../_shared/notificacoes.ts";
import { carregarServidorPush, enviarPush as enviarPushWeb } from "../_shared/push.ts";
import { configWhatsapp, enviarTemplate } from "../_shared/whatsapp.ts";

// check-expiring-documents apenas enfileira linhas em notifications, uma por
// canal. Esta função drena a fila e envia cada linha pelo seu tipo.
//
// Os perfis e os documentos de todas as linhas do lote são lidos de uma vez
// (em fatias de IDS_POR_CONSULTA), não em duas consultas por linha; os envios
// saem em paralelo limitado, para o lote caber na janela de execução sem
// estourar o limite de envio do Resend.
const LOTE = 200;
const ENVIOS_SIMULTANEOS = 2;
const JANELA_RETENTATIVA_DIAS = 7;
const APP_URL = Deno.env.get("APP_URL") ?? "https://www.doclimpo.com";

interface Notificacao {
  id: string;
  usuario_id: string;
  documento_id: string | null;
  notification_type: Canal;
  days_before_expiry: number | null;
}

// Executa `tarefa` sobre `itens` com no máximo `limite` em voo.
async function emParalelo<T>(itens: T[], limite: number, tarefa: (item: T) => Promise<void>): Promise<void> {
  let proximo = 0;
  const trabalhadores = Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (proximo < itens.length) {
      const item = itens[proximo++];
      await tarefa(item);
    }
  });
  await Promise.all(trabalhadores);
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

// Uma linha da fila com tudo que o envio precisa já resolvido. `dias` é a
// distância real até o vencimento hoje, calculada do documento — não a janela
// que enfileirou a linha. Uma linha que esperou na fila (ou cuja data o
// usuário corrigiu depois) continua dizendo a verdade.
interface Envio {
  notificacao: Notificacao;
  perfil: Perfil;
  documento: Documento;
  dias: number;
}

function corpoEmail(opts: {
  nome: string | null;
  rotuloDocumento: string;
  dataVencimento: string;
  diasRestantes: number;
}) {
  const { nome, rotuloDocumento, dataVencimento, diasRestantes } = opts;
  const rotuloSeguro = escapeHtml(rotuloDocumento);
  const nomeSeguro = nome ? escapeHtml(nome) : "";
  const venceu = diasRestantes <= 0;
  const corTitulo = venceu ? COR_EMAIL.perigo : diasRestantes <= 7 ? COR_EMAIL.atencao : COR_EMAIL.tinta;
  const linha = (rotulo: string, valor: string, borda: boolean) =>
    `<tr><td style="padding:10px 0;${borda ? `border-bottom:1px solid ${COR_EMAIL.linha};` : ""}font-size:14px;color:${COR_EMAIL.suave};">${rotulo}</td><td style="padding:10px 0;${borda ? `border-bottom:1px solid ${COR_EMAIL.linha};` : ""}font-size:14px;color:${COR_EMAIL.tinta};font-weight:600;text-align:right;">${valor}</td></tr>`;

  return layoutEmail({
    appUrl: APP_URL,
    titulo: escapeHtml(textoAlerta(diasRestantes, rotuloDocumento).titulo),
    corTitulo,
    corpo: `<p style="margin:0 0 14px;font-size:15px;color:${COR_EMAIL.texto};">Olá${nomeSeguro ? `, ${nomeSeguro}` : ""}!</p>
      <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${linha("Documento", rotuloSeguro, true)}
        ${linha("Vencimento", formatarData(dataVencimento), false)}
      </table>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:${COR_EMAIL.texto};">${venceu
        ? "Regularize o quanto antes para evitar multa. No painel você encontra onde resolver no seu estado."
        : "Ainda dá tempo de resolver sem correria. No painel você encontra onde renovar ou pagar no seu estado."}</p>`,
    cta: { texto: "Ver no DocLimpo", url: `${APP_URL}/dashboard` },
    rodape: `Você recebe este aviso porque cadastrou este documento no DocLimpo. <a href="${APP_URL}/conta" style="color:${COR_EMAIL.suave};">Pausar avisos ou gerenciar a conta</a>.`,
  });
}

async function enviarEmail(ctx: Contexto, { perfil, documento, dias }: Envio): Promise<Resultado> {
  if (!perfil.email || perfil.notification_email === false) return { estado: "SKIPPED", detalhe: "email_desligado" };
  const rotulo = rotuloDocumento(documento);
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${ctx.resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: ctx.remetente,
      to: [perfil.email],
      // Provedores usam este header para oferecer "cancelar inscrição" na própria caixa de entrada.
      headers: { "List-Unsubscribe": `<${APP_URL}/conta>` },
      subject: `${dias <= 0 ? "⚠️ " : ""}${textoAlerta(dias, rotulo).titulo}`,
      html: corpoEmail({ nome: perfil.nome, rotuloDocumento: rotulo, dataVencimento: documento.data_vencimento, diasRestantes: dias }),
    }),
  });
  if (resposta.ok) return { estado: "SENT" };
  const detalhe = `Resend ${resposta.status} ${(await resposta.text()).slice(0, 120)}`;
  return { estado: resposta.status === 429 || resposta.status >= 500 ? "PENDING" : "FAILED", detalhe };
}

// Push: uma mensagem por dispositivo do usuário. Assinatura morta (404/410)
// é apagada na hora; basta um dispositivo entregue para a linha virar SENT.
async function enviarPush(ctx: Contexto, { notificacao, documento, dias }: Envio): Promise<Resultado> {
  const app = await carregarServidorPush();
  if (!app) return { estado: "SKIPPED", detalhe: "canal_nao_configurado" };

  const { data: assinaturas } = await ctx.supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("usuario_id", notificacao.usuario_id);
  if (!assinaturas || assinaturas.length === 0) return { estado: "SKIPPED", detalhe: "sem_dispositivo" };

  const rotulo = rotuloDocumento(documento);
  // A janela identifica a notificação no dispositivo: duas janelas do mesmo
  // documento não devem se sobrescrever.
  const janela = notificacao.days_before_expiry ?? 0;
  const carga = {
    title: textoAlerta(dias, rotulo).titulo,
    body: `Vencimento ${formatarData(documento.data_vencimento)}. Toque para ver o passo a passo.`,
    url: `/documento/${documento.id}`,
    tag: `doc-${documento.id}-${janela}`,
  };
  const topic = `${documento.id.replace(/-/g, "").slice(0, 24)}-${janela}`;

  let entregues = 0;
  let transitorias = 0;
  const detalhes: string[] = [];
  for (const assinatura of assinaturas) {
    const r = await enviarPushWeb(app, assinatura, carga, { topic, urgencia: dias <= 7 ? "high" : "normal" });
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
async function enviarWhatsapp(ctx: Contexto, { notificacao, perfil, documento, dias }: Envio): Promise<Resultado> {
  const config = configWhatsapp();
  if (!config) return { estado: "SKIPPED", detalhe: "canal_nao_configurado" };
  if (!perfil.notification_whatsapp || !perfil.whatsapp_verificado_em || !perfil.whatsapp_number) {
    return { estado: "SKIPPED", detalhe: "whatsapp_nao_verificado" };
  }
  const rotulo = rotuloDocumento(documento);
  const nome = higienizarTexto((perfil.nome ?? "").split(" ")[0] || "olá", 30);
  const r = await enviarTemplate(config, {
    para: perfil.whatsapp_number,
    template: config.templateAlerta,
    parametros: [nome, rotulo, textoAlerta(dias, rotulo).prazo, formatarData(documento.data_vencimento)],
  });
  if (r.ok) return { estado: "SENT", detalhe: r.id };
  if (r.classe === "desativar") {
    await ctx.supabase.from("profiles").update({ notification_whatsapp: false, whatsapp_verificado_em: null }).eq("user_id", notificacao.usuario_id);
    return { estado: "FAILED", detalhe: `desativado: ${r.detalhe}` };
  }
  if (r.classe === "retentar") return { estado: "PENDING", detalhe: r.detalhe };
  return { estado: "FAILED", detalhe: r.detalhe };
}

const ENVIADORES: Record<Canal, (ctx: Contexto, envio: Envio) => Promise<Resultado>> = {
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
    const remetente = Deno.env.get("EMAIL_FROM") ?? REMETENTE_PADRAO;

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

    const fila = (pendentes ?? []) as Notificacao[];

    // Perfis e documentos do lote inteiro em poucas consultas. Antes eram duas
    // por linha: com LOTE linhas, o lote não cabia na janela de execução.
    //
    // O erro destas consultas precisa interromper a rodada. Mapa vazio é
    // indistinguível de "perfil/documento não existe", e esses dois casos
    // encerram a linha como SKIPPED, que é terminal: uma falha transitória
    // apagaria o lote inteiro de avisos em silêncio. Lançando, o catch de fora
    // devolve 500 e as linhas seguem PENDING para a próxima hora.
    const perfis = new Map<string, Perfil>();
    const documentos = new Map<string, Documento>();
    for (const fatia of emLotes([...new Set(fila.map((n) => n.usuario_id))])) {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, nome, email, notification_email, notification_whatsapp, whatsapp_number, whatsapp_verificado_em")
        .in("user_id", fatia);
      if (error) throw new Error(`Erro ao ler os perfis do lote: ${error.message}`);
      for (const linha of data ?? []) perfis.set(linha.user_id as string, linha as unknown as Perfil);
    }
    const documentoIds = [...new Set(fila.map((n) => n.documento_id).filter((id): id is string => Boolean(id)))];
    for (const fatia of emLotes(documentoIds)) {
      const { data, error } = await supabase
        .from("documentos")
        .select("id, tipo, apelido, data_vencimento, resolvido")
        .in("id", fatia);
      if (error) throw new Error(`Erro ao ler os documentos do lote: ${error.message}`);
      for (const linha of data ?? []) documentos.set(linha.id as string, linha as unknown as Documento);
    }

    const hoje = dataLocalBr(new Date());

    // Monta os envios viáveis e encerra de uma vez o que não tem para onde ir.
    const envios: Envio[] = [];
    for (const notificacao of fila) {
      const perfil = perfis.get(notificacao.usuario_id);
      if (!perfil) {
        await concluir(notificacao.id, { estado: "SKIPPED", detalhe: "perfil_ausente" });
        resultado.pulados++;
        continue;
      }

      const documento = notificacao.documento_id ? documentos.get(notificacao.documento_id) : undefined;
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

      if (!ENVIADORES[notificacao.notification_type]) {
        await concluir(notificacao.id, { estado: "FAILED", detalhe: "canal_desconhecido" });
        resultado.falhas.push(`${notificacao.id}: canal ${notificacao.notification_type}`);
        continue;
      }

      envios.push({ notificacao, perfil, documento, dias: diasEntre(hoje, documento.data_vencimento) });
    }

    await emParalelo(envios, ENVIOS_SIMULTANEOS, async (envio) => {
      const { notificacao } = envio;
      try {
        const r = await ENVIADORES[notificacao.notification_type](ctx, envio);
        await concluir(notificacao.id, r);
        if (r.estado === "SENT") resultado.enviados++;
        else if (r.estado === "SKIPPED") resultado.pulados++;
        // PENDING entra aqui também: a linha será retentada, mas o operador
        // precisa saber que ela não saiu.
        else resultado.falhas.push(`${notificacao.id}/${notificacao.notification_type}: ${r.detalhe ?? r.estado}`);
      } catch (erro) {
        const msg = erro instanceof Error ? erro.message : String(erro);
        resultado.falhas.push(`${notificacao.id}: ${msg}`);
      }
    });

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
