import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders } from "../_shared/cors.ts";
import { compararSegredo } from "../_shared/seguranca.ts";
import { type Canal, canaisParaUsuario, rotuloDocumento, textoAlerta } from "../_shared/notificacoes.ts";

// Janelas alinhadas com o que a interface promete ao usuário (90/30/7),
// mais um lembrete na véspera. Espelhadas em src/lib/planos.ts (JANELAS_ALERTA).
const ALERT_DAYS = [90, 30, 7, 1];

interface DocumentoFila {
  id: string;
  usuario_id: string;
  tipo: string;
  apelido: string | null;
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

// Uma linha por canal. O índice único (documento, janela, canal) garante a
// idempotência mesmo se duas rodadas se cruzarem: 23505 = já enfileirado.
async function enfileirar(
  supabase: SupabaseClient,
  doc: DocumentoFila,
  dias: number,
  canais: Canal[],
): Promise<{ criadas: number; erros: string[] }> {
  const resultado = { criadas: 0, erros: [] as string[] };
  const { titulo } = textoAlerta(dias, rotuloDocumento(doc));
  for (const canal of canais) {
    const { data: existente } = await supabase
      .from("notifications")
      .select("id")
      .eq("documento_id", doc.id)
      .eq("days_before_expiry", dias)
      .eq("notification_type", canal)
      .limit(1);
    if (existente && existente.length > 0) continue;

    const { error } = await supabase.from("notifications").insert({
      usuario_id: doc.usuario_id,
      documento_id: doc.id,
      notification_type: canal,
      status: "PENDING",
      days_before_expiry: dias,
      scheduled_date: new Date().toISOString(),
      content: titulo,
    });
    if (error && error.code !== "23505") resultado.erros.push(`${doc.id}/${canal}: ${error.message}`);
    else if (!error) resultado.criadas++;
  }
  return resultado;
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results = {
      checked: 0,
      notifications_created: 0,
      statuses_updated: 0,
      errors: [] as string[],
    };
    const canaisCache = new Map<string, Canal[]>();

    // 1. Documentos que venceram desde a última rodada: status + aviso (janela 0).
    const { data: expiredDocs, error: expiredError } = await supabase
      .from("documentos")
      .update({ status: "EXPIRED" })
      .lt("data_vencimento", today.toISOString().split("T")[0])
      .neq("status", "EXPIRED")
      .eq("resolvido", false)
      .select("id, usuario_id, tipo, apelido");

    if (expiredError) {
      results.errors.push(`Expired update error: ${expiredError.message}`);
    } else if (expiredDocs) {
      results.statuses_updated += expiredDocs.length;
      for (const doc of expiredDocs) {
        const canais = await resolverCanais(supabase, canaisCache, doc.usuario_id);
        const { criadas, erros } = await enfileirar(supabase, doc, 0, canais);
        results.notifications_created += criadas;
        results.errors.push(...erros);
      }
    }

    // 2. Documentos que vencem em cada janela.
    for (const days of ALERT_DAYS) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateStr = targetDate.toISOString().split("T")[0];

      const { data: docs, error: docsError } = await supabase
        .from("documentos")
        .select("id, usuario_id, tipo, apelido")
        .eq("data_vencimento", targetDateStr)
        .eq("resolvido", false);

      if (docsError) {
        results.errors.push(`Query error (${days}d): ${docsError.message}`);
        continue;
      }

      if (!docs || docs.length === 0) continue;
      results.checked += docs.length;

      if (days <= 30) {
        const docIds = docs.map((d) => d.id);
        const { error: updateErr } = await supabase
          .from("documentos")
          .update({ status: "EXPIRING_SOON" })
          .in("id", docIds)
          .neq("status", "EXPIRING_SOON");

        if (updateErr) {
          results.errors.push(`Status update error: ${updateErr.message}`);
        } else {
          results.statuses_updated += docIds.length;
        }
      }

      for (const doc of docs) {
        // Configuração por documento (tabela legada; nada no app escreve nela).
        const { data: alertConfig } = await supabase
          .from("alertas_configuracao")
          .select("ativo, dias_antes")
          .eq("documento_id", doc.id)
          .eq("usuario_id", doc.usuario_id);
        if (alertConfig && alertConfig.length > 0 && !alertConfig.some((cfg) => cfg.ativo && cfg.dias_antes === days)) continue;

        const canais = await resolverCanais(supabase, canaisCache, doc.usuario_id);
        const { criadas, erros } = await enfileirar(supabase, doc, days, canais);
        results.notifications_created += criadas;
        results.errors.push(...erros);
      }
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
