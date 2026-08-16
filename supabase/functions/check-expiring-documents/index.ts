import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// Janelas alinhadas com o que a interface promete ao usuário (90/30/7),
// mais um lembrete na véspera. Antes o código usava 30/15/7/3/1, que não
// batia com nenhuma tela.
const ALERT_DAYS = [90, 30, 7, 1];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Esta função varre e atualiza a base inteira com a service role key.
    // Sem esta checagem ela era publicamente invocável por qualquer um.
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
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

    // 1. Update expired documents
    const { data: expiredDocs, error: expiredError } = await supabase
      .from("documentos")
      .update({ status: "EXPIRED" })
      .lt("data_vencimento", today.toISOString().split("T")[0])
      .neq("status", "EXPIRED")
      .eq("resolvido", false)
      .select("id, usuario_id, tipo, apelido, numero_documento, data_vencimento");

    if (expiredError) {
      results.errors.push(`Expired update error: ${expiredError.message}`);
    } else if (expiredDocs) {
      results.statuses_updated += expiredDocs.length;

      // Create notifications for newly expired docs
      for (const doc of expiredDocs) {
        const docLabel = doc.apelido || doc.tipo;
        await supabase.from("notifications").insert({
          usuario_id: doc.usuario_id,
          documento_id: doc.id,
          notification_type: "EMAIL",
          status: "PENDING",
          days_before_expiry: 0,
          scheduled_date: new Date().toISOString(),
          content: `⚠️ Seu documento "${docLabel}" venceu! Regularize o mais rápido possível para evitar multas.`,
        });
        results.notifications_created++;
      }
    }

    // 2. Check documents expiring in each alert window
    for (const days of ALERT_DAYS) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateStr = targetDate.toISOString().split("T")[0];

      const { data: docs, error: docsError } = await supabase
        .from("documentos")
        .select("id, usuario_id, tipo, apelido, numero_documento, data_vencimento")
        .eq("data_vencimento", targetDateStr)
        .eq("resolvido", false);

      if (docsError) {
        results.errors.push(`Query error (${days}d): ${docsError.message}`);
        continue;
      }

      if (!docs || docs.length === 0) continue;
      results.checked += docs.length;

      // Update status to EXPIRING_SOON for docs within 30 days
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
        // Check if notification already exists for this doc + days_before
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("documento_id", doc.id)
          .eq("days_before_expiry", days)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Check user alert preferences
        const { data: alertConfig } = await supabase
          .from("alertas_configuracao")
          .select("ativo, via_email, dias_antes")
          .eq("documento_id", doc.id)
          .eq("usuario_id", doc.usuario_id);

        // If user has config, check if this alert window is enabled
        if (alertConfig && alertConfig.length > 0) {
          const hasMatchingConfig = alertConfig.some(
            (cfg) => cfg.ativo && cfg.dias_antes === days
          );
          if (!hasMatchingConfig) continue;
        }

        const docLabel = doc.apelido || doc.tipo;
        const urgencyEmoji = days <= 3 ? "🚨" : days <= 7 ? "⚠️" : "📋";
        const content = `${urgencyEmoji} Seu documento "${docLabel}" vence em ${days} dia${days > 1 ? "s" : ""}! Renove antes do vencimento para evitar multas.`;

        const { error: insertErr } = await supabase
          .from("notifications")
          .insert({
            usuario_id: doc.usuario_id,
            documento_id: doc.id,
            notification_type: "EMAIL",
            status: "PENDING",
            days_before_expiry: days,
            scheduled_date: new Date().toISOString(),
            content,
          });

        if (insertErr) {
          results.errors.push(`Notification insert error: ${insertErr.message}`);
        } else {
          results.notifications_created++;
        }
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
