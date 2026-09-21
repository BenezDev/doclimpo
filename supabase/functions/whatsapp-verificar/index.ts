import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { compararSegredo } from "../_shared/seguranca.ts";
import { hashToken } from "../_shared/token.ts";
import { normalizarE164 } from "../_shared/notificacoes.ts";
import { configWhatsapp, enviarTemplate } from "../_shared/whatsapp.ts";

// Vincula um número de WhatsApp à conta com verificação por código (template
// de autenticação da Meta). Só planos pagos. O id do usuário vem sempre do
// JWT; o admin client (service role) é o único que escreve as colunas
// whatsapp_* de profiles — a trigger protect_whatsapp_columns bloqueia o resto.
//
// Body: { acao: "enviar", numero } | { acao: "confirmar", codigo } | { acao: "remover" }

const CODIGO_VALIDADE_MIN = 10;
const MAX_TENTATIVAS = 5;
const MAX_ENVIOS_24H = 5;

function gerarCodigo(): string {
  // 6 dígitos sem viés: rejeita valores acima do maior múltiplo de 1e6.
  const limite = Math.floor(0x100000000 / 1_000_000) * 1_000_000;
  const buffer = new Uint32Array(1);
  let valor: number;
  do {
    crypto.getRandomValues(buffer);
    valor = buffer[0];
  } while (valor >= limite);
  return String(valor % 1_000_000).padStart(6, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const responder = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return responder({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return responder({ error: "Usuário não encontrado" }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({})) as { acao?: unknown; numero?: unknown; codigo?: unknown };
    const acao = body.acao;
    if (acao !== "enviar" && acao !== "confirmar" && acao !== "remover") return responder({ error: "Ação inválida." }, 400);

    if (acao === "remover") {
      const { error } = await admin.from("profiles")
        .update({ whatsapp_number: null, whatsapp_verificado_em: null, whatsapp_optin_em: null, notification_whatsapp: false })
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
      await admin.from("whatsapp_verificacoes").delete().eq("usuario_id", user.id);
      return responder({ success: true });
    }

    // Benefício pago: o mesmo cálculo da trigger de limite (inclui plano herdado).
    const { data: plano } = await admin.rpc("plano_efetivo", { uid: user.id });
    if (typeof plano !== "string" || plano === "FREE") return responder({ error: "Alertas por WhatsApp fazem parte dos planos pagos." }, 403);

    const config = configWhatsapp();
    if (!config) return responder({ error: "WhatsApp ainda não disponível." }, 503);

    if (acao === "enviar") {
      const numero = typeof body.numero === "string" ? normalizarE164(body.numero) : null;
      if (!numero) return responder({ error: "Informe um número de celular válido, com DDD." }, 400);

      const { data: atual } = await admin.from("whatsapp_verificacoes").select("enviado_em, envios, criado_em").eq("usuario_id", user.id).maybeSingle();
      const agora = Date.now();
      if (atual && agora - new Date(atual.enviado_em).getTime() < 60_000) return responder({ error: "Aguarde um minuto antes de pedir outro código." }, 429);
      const dentroDe24h = atual && agora - new Date(atual.criado_em).getTime() < 86_400_000;
      if (dentroDe24h && atual.envios >= MAX_ENVIOS_24H) return responder({ error: "Limite de códigos por dia atingido. Tente amanhã." }, 429);

      const codigo = gerarCodigo();
      const codigoHash = await hashToken(`${user.id}:${codigo}`);
      const { error: erroGravar } = await admin.from("whatsapp_verificacoes").upsert({
        usuario_id: user.id,
        numero,
        codigo_hash: codigoHash,
        expira_em: new Date(agora + CODIGO_VALIDADE_MIN * 60_000).toISOString(),
        tentativas: 0,
        envios: dentroDe24h ? atual.envios + 1 : 1,
        enviado_em: new Date(agora).toISOString(),
        criado_em: dentroDe24h ? atual.criado_em : new Date(agora).toISOString(),
      }, { onConflict: "usuario_id" });
      if (erroGravar) throw new Error(erroGravar.message);

      const envio = await enviarTemplate(config, { para: numero, template: config.templateCodigo, parametros: [codigo], botaoUrlParam: codigo });
      if (!envio.ok) {
        if (envio.classe === "desativar") return responder({ error: "Esse número não recebe mensagens do WhatsApp. Confira o DDD e o número." }, 400);
        if (envio.classe === "configuracao") { console.error("WhatsApp: configuração", envio.detalhe); return responder({ error: "WhatsApp indisponível no momento." }, 503); }
        return responder({ error: "Não foi possível enviar o código agora. Tente novamente em instantes." }, 502);
      }
      return responder({ success: true, numero_mascarado: `${numero.slice(0, 5)}•••${numero.slice(-4)}` });
    }

    // confirmar
    const codigo = typeof body.codigo === "string" ? body.codigo.replace(/\D/g, "") : "";
    if (codigo.length !== 6) return responder({ error: "Informe o código de 6 dígitos." }, 400);

    const { data: pendente } = await admin.from("whatsapp_verificacoes").select("numero, codigo_hash, expira_em, tentativas").eq("usuario_id", user.id).maybeSingle();
    if (!pendente) return responder({ error: "Nenhum código pendente. Peça um novo código." }, 404);
    if (pendente.tentativas >= MAX_TENTATIVAS) {
      await admin.from("whatsapp_verificacoes").delete().eq("usuario_id", user.id);
      return responder({ error: "Muitas tentativas. Peça um novo código." }, 429);
    }
    if (new Date(pendente.expira_em).getTime() < Date.now()) return responder({ error: "Código expirado. Peça um novo código." }, 410);

    const confere = compararSegredo(await hashToken(`${user.id}:${codigo}`), pendente.codigo_hash);
    if (!confere) {
      await admin.from("whatsapp_verificacoes").update({ tentativas: pendente.tentativas + 1 }).eq("usuario_id", user.id);
      return responder({ error: "Código incorreto." }, 400);
    }

    const agoraIso = new Date().toISOString();
    const { error: erroPerfil } = await admin.from("profiles")
      .update({ whatsapp_number: pendente.numero, whatsapp_verificado_em: agoraIso, whatsapp_optin_em: agoraIso, notification_whatsapp: true })
      .eq("user_id", user.id);
    if (erroPerfil) throw new Error(erroPerfil.message);
    await admin.from("whatsapp_verificacoes").delete().eq("usuario_id", user.id);
    return responder({ success: true, numero: pendente.numero });
  } catch (error) {
    console.error("whatsapp-verificar:", error);
    return responder({ error: "Não foi possível concluir agora. Tente novamente." }, 500);
  }
});
