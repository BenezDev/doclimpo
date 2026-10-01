import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { compararSegredo } from "../_shared/seguranca.ts";
import {
  type Canal,
  canaisParaUsuario,
  dataLocalBr,
  emLotes,
  JANELAS_ALERTA,
  janelaDoDia,
  rotuloDocumento,
  somarDiasISO,
  textoAlerta,
} from "../_shared/notificacoes.ts";

// Rodada diária: decide quais avisos entram na fila. Quem envia é
// send-pending-notifications.
//
// A varredura olha a faixa inteira (hoje até hoje + 90 dias) e pergunta a
// `janelaDoDia` qual janela cada documento alcançou, em vez de casar a data
// exata de cada janela. Com isso um dia de cron perdido atrasa o aviso em vez
// de perdê-lo para sempre — ver o comentário da função em _shared.

// PostgREST devolve no máximo 1000 linhas por consulta; a varredura pagina.
const PAGINA = 1000;
// Lote de INSERT. O índice único cuida da idempotência; o lote só evita um
// comando gigante.
const LOTE_INSERT = 500;
const JANELA_MAIS_LARGA = Math.max(...JANELAS_ALERTA);

interface DocumentoFila {
  id: string;
  usuario_id: string;
  tipo: string;
  apelido: string | null;
  data_vencimento: string;
  criado_em: string;
}

interface LinhaFila {
  usuario_id: string;
  documento_id: string;
  notification_type: Canal;
  status: "PENDING";
  days_before_expiry: number;
  scheduled_date: string;
  content: string;
}

// Canais que cada usuário pode receber hoje: preferências + plano efetivo
// (a mesma função SQL da trigger de limite) + dispositivos de push. Cache por
// rodada: um usuário com vários documentos é consultado uma vez.
async function resolverCanais(supabase: SupabaseClient, cache: Map<string, Canal[]>, usuarioId: string): Promise<Canal[]> {
  const guardado = cache.get(usuarioId);
  if (guardado) return guardado;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("notification_email, notification_whatsapp, whatsapp_verificado_em")
    .eq("user_id", usuarioId)
    .maybeSingle();
  const { data: plano } = await supabase.rpc("plano_efetivo", { uid: usuarioId });
  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuarioId);

  const canais = canaisParaUsuario({
    plano: typeof plano === "string" ? plano : "FREE",
    notificationEmail: perfil?.notification_email !== false,
    notificationWhatsapp: perfil?.notification_whatsapp === true,
    whatsappVerificado: Boolean(perfil?.whatsapp_verificado_em),
    pushCount: count ?? 0,
  });
  cache.set(usuarioId, canais);
  return canais;
}

const chave = (documentoId: string, janela: number, canal: string) => `${documentoId}|${janela}|${canal}`;

// Linhas já enfileiradas para estes documentos, em uma consulta. Evita o
// SELECT por (documento, canal) que a versão anterior fazia.
async function jaEnfileiradas(supabase: SupabaseClient, documentoIds: string[]): Promise<Set<string>> {
  const existentes = new Set<string>();
  for (const fatia of emLotes(documentoIds)) {
    const { data, error } = await supabase
      .from("notifications")
      .select("documento_id, days_before_expiry, notification_type")
      .in("documento_id", fatia)
      .gte("days_before_expiry", 0);
    if (error) throw new Error(`Consulta da fila existente: ${error.message}`);
    for (const linha of data ?? []) {
      existentes.add(chave(linha.documento_id as string, linha.days_before_expiry as number, linha.notification_type as string));
    }
  }
  return existentes;
}

// Insere em lote. Uma corrida com outra rodada derruba o lote inteiro (23505),
// então nesse caso cada linha vai sozinha e a duplicada é ignorada.
async function inserirFila(supabase: SupabaseClient, linhas: LinhaFila[]): Promise<{ criadas: number; erros: string[] }> {
  const resultado = { criadas: 0, erros: [] as string[] };
  for (let inicio = 0; inicio < linhas.length; inicio += LOTE_INSERT) {
    const lote = linhas.slice(inicio, inicio + LOTE_INSERT);
    const { error } = await supabase.from("notifications").insert(lote);
    if (!error) {
      resultado.criadas += lote.length;
      continue;
    }
    if (error.code !== "23505") {
      resultado.erros.push(`Lote de ${lote.length} linha(s): ${error.message}`);
      continue;
    }
    for (const linha of lote) {
      const { error: erroLinha } = await supabase.from("notifications").insert(linha);
      if (!erroLinha) resultado.criadas++;
      else if (erroLinha.code !== "23505") resultado.erros.push(`${linha.documento_id}/${linha.notification_type}: ${erroLinha.message}`);
    }
  }
  return resultado;
}

function montarLinhas(doc: DocumentoFila, janela: number, canais: Canal[], existentes: Set<string>, agora: string): LinhaFila[] {
  const { titulo } = textoAlerta(janela, rotuloDocumento(doc));
  return canais
    .filter((canal) => !existentes.has(chave(doc.id, janela, canal)))
    .map((canal) => ({
      usuario_id: doc.usuario_id,
      documento_id: doc.id,
      notification_type: canal,
      status: "PENDING" as const,
      days_before_expiry: janela,
      scheduled_date: agora,
      content: titulo,
    }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Esta função varre e atualiza a base inteira com a service role key.
    // Sem esta checagem ela era publicamente invocável por qualquer um.
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret || !compararSegredo(req.headers.get("x-cron-secret") ?? "", cronSecret)) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const agora = new Date().toISOString();
    const hoje = dataLocalBr(agora);
    const limite = somarDiasISO(hoje, JANELA_MAIS_LARGA);

    const results = {
      checked: 0,
      notifications_created: 0,
      statuses_updated: 0,
      errors: [] as string[],
    };
    const canaisCache = new Map<string, Canal[]>();
    const pendentes: DocumentoFila[] = [];
    const janelaPorDocumento = new Map<string, number>();

    // 1. Documentos que venceram desde a última rodada: status + aviso (janela 0).
    const { data: expiredDocs, error: expiredError } = await supabase
      .from("documentos")
      .update({ status: "EXPIRED" })
      .lt("data_vencimento", hoje)
      .neq("status", "EXPIRED")
      .eq("resolvido", false)
      .select("id, usuario_id, tipo, apelido, data_vencimento, criado_em");

    if (expiredError) {
      results.errors.push(`Expired update error: ${expiredError.message}`);
    } else {
      for (const doc of (expiredDocs ?? []) as DocumentoFila[]) {
        results.statuses_updated++;
        pendentes.push(doc);
        janelaPorDocumento.set(doc.id, 0);
      }
    }

    // 2. Documentos que vencem de hoje até a janela mais larga. Uma consulta
    //    paginada para toda a faixa, não uma por janela.
    for (let pagina = 0; ; pagina++) {
      const { data, error } = await supabase
        .from("documentos")
        .select("id, usuario_id, tipo, apelido, data_vencimento, criado_em")
        .eq("resolvido", false)
        .gte("data_vencimento", hoje)
        .lte("data_vencimento", limite)
        .order("data_vencimento", { ascending: true })
        .range(pagina * PAGINA, pagina * PAGINA + PAGINA - 1);

      if (error) {
        results.errors.push(`Query error: ${error.message}`);
        break;
      }

      const lote = (data ?? []) as DocumentoFila[];
      results.checked += lote.length;
      for (const doc of lote) {
        const janela = janelaDoDia(doc, hoje);
        if (janela === null) continue;
        pendentes.push(doc);
        janelaPorDocumento.set(doc.id, janela);
      }
      if (lote.length < PAGINA) break;
    }

    // 3. "Vence em até 30 dias" é o que a interface chama de atenção/crítico.
    const proximos = pendentes.filter((doc) => {
      const janela = janelaPorDocumento.get(doc.id);
      return janela !== undefined && janela > 0 && janela <= 30;
    }).map((doc) => doc.id);
    for (const fatia of emLotes(proximos)) {
      const { error } = await supabase
        .from("documentos")
        .update({ status: "EXPIRING_SOON" })
        .in("id", fatia)
        .neq("status", "EXPIRING_SOON");
      if (error) results.errors.push(`Status update error: ${error.message}`);
      else results.statuses_updated += fatia.length;
    }

    // 4. Enfileira o que falta: uma consulta para saber o que já existe, um
    //    INSERT em lote para o resto.
    if (pendentes.length > 0) {
      const existentes = await jaEnfileiradas(supabase, pendentes.map((doc) => doc.id));
      const linhas: LinhaFila[] = [];
      for (const doc of pendentes) {
        const janela = janelaPorDocumento.get(doc.id);
        if (janela === undefined) continue;
        const canais = await resolverCanais(supabase, canaisCache, doc.usuario_id);
        linhas.push(...montarLinhas(doc, janela, canais, existentes, agora));
      }
      const { criadas, erros } = await inserirFila(supabase, linhas);
      results.notifications_created += criadas;
      results.errors.push(...erros);
    }

    console.log("Check expiring documents results:", JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
