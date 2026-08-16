import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

    // Fetch all docs
    const { data: docs } = await supabase
      .from("documentos")
      .select("id, data_vencimento, status, resolvido");

    // Fetch renewals
    const { data: renewals } = await supabase
      .from("renovacoes")
      .select("custo_renovacao, multa_evitada");

    // Fetch referrals
    const { data: referrals } = await supabase
      .from("referrals")
      .select("id, status");

    const allDocs = docs || [];
    const totalDocuments = allDocs.length;
    const expiredDocs = allDocs.filter((d) => d.data_vencimento < today && !d.resolvido).length;
    const expiringDocs = allDocs.filter((d) => d.data_vencimento >= today && d.data_vencimento <= thirtyDaysFromNow).length;
    const activeDocs = allDocs.filter((d) => d.data_vencimento >= today).length;
    const resolvedDocs = allDocs.filter((d) => d.resolvido).length;

    const allRenewals = renewals || [];
    const totalRenewalCost = allRenewals.reduce((s, r) => s + (Number(r.custo_renovacao) || 0), 0);
    const totalPenaltiesAvoided = allRenewals.reduce((s, r) => s + (Number(r.multa_evitada) || 0), 0);

    const allReferrals = referrals || [];
    const totalReferrals = allReferrals.length;
    const confirmedReferrals = allReferrals.filter((r) => r.status === "confirmed").length;

    return new Response(JSON.stringify({
      documents: { total: totalDocuments, active: activeDocs, expiring: expiringDocs, expired: expiredDocs, resolved: resolvedDocs },
      savings: { totalRenewalCost, totalPenaltiesAvoided, netSavings: totalPenaltiesAvoided - totalRenewalCost },
      referrals: { total: totalReferrals, confirmed: confirmedReferrals },
      renewals: { total: allRenewals.length },
    }), {
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
