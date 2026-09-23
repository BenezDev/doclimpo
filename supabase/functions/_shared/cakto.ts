import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { assinaturaAtiva, STATUS_COM_ACESSO, type AssinaturaCakto, type ResumoAssinatura } from "./cakto-eventos.ts";

// Cliente mínimo da API pública da Cakto e a gravação da assinatura no banco,
// compartilhados por cakto-webhook, cancelar-assinatura e delete-account.
// Auth: OAuth2 client_credentials (CAKTO_CLIENT_ID/CAKTO_CLIENT_SECRET, escopos
// read, write e subscriptions). O token vale 10 h e a Cakto limita a emissão,
// então fica em cache enquanto a instância da função viver.

const API = "https://api.cakto.com.br/public_api";
let tokenEmCache: { valor: string; expiraEm: number } | null = null;

async function token(): Promise<string> {
  if (tokenEmCache && tokenEmCache.expiraEm > Date.now() + 60_000) return tokenEmCache.valor;
  const clientId = Deno.env.get("CAKTO_CLIENT_ID");
  const clientSecret = Deno.env.get("CAKTO_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("CAKTO_CLIENT_ID/CAKTO_CLIENT_SECRET não configurados");

  const resposta = await fetch(`${API}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
  });
  if (!resposta.ok) throw new Error(`Cakto token: HTTP ${resposta.status}`);
  const corpo = await resposta.json();
  tokenEmCache = { valor: corpo.access_token, expiraEm: Date.now() + (Number(corpo.expires_in) || 3600) * 1000 };
  return tokenEmCache.valor;
}

function caminhoAssinatura(id: string, sufixo = ""): string {
  return `${API}/subscriptions/${encodeURIComponent(id)}/${sufixo}`;
}

// null = a Cakto não conhece essa assinatura.
export async function buscarAssinatura(id: string): Promise<AssinaturaCakto | null> {
  const resposta = await fetch(caminhoAssinatura(id), { headers: { Authorization: `Bearer ${await token()}` } });
  if (resposta.status === 404) return null;
  if (!resposta.ok) throw new Error(`Cakto GET assinatura: HTTP ${resposta.status}`);
  return await resposta.json();
}

// Cancela e devolve o estado resultante. 400 é "já cancelada ou estado não
// permite": vale como sucesso se a assinatura de fato não dá mais acesso.
export async function cancelarAssinatura(id: string): Promise<AssinaturaCakto | null> {
  const resposta = await fetch(caminhoAssinatura(id, "cancel/"), {
    method: "POST",
    headers: { Authorization: `Bearer ${await token()}` },
  });
  if (resposta.status === 404) return null;
  if (!resposta.ok && resposta.status !== 400) throw new Error(`Cakto cancelar assinatura: HTTP ${resposta.status}`);
  const atual = await buscarAssinatura(id);
  if (atual && assinaturaAtiva(atual.status)) throw new Error(`Cakto não cancelou a assinatura (status ${atual.status})`);
  return atual;
}

// Grava a assinatura e o plano do usuário. Troca de plano na Cakto é cancelar
// e assinar de novo: o cancelamento da antiga não pode rebaixar quem já tem
// outra assinatura com acesso.
export async function aplicarAssinatura(supabase: SupabaseClient, usuarioId: string, resumo: ResumoAssinatura) {
  const { error: erroAssinatura } = await supabase.from("subscriptions").upsert(
    {
      usuario_id: usuarioId,
      plan_type: resumo.plano ?? "FREE",
      status: resumo.status,
      end_date: resumo.fimPeriodo,
      auto_renew: resumo.autoRenova,
      cakto_subscription_id: resumo.caktoSubscriptionId,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "cakto_subscription_id" },
  );
  if (erroAssinatura) throw new Error(`subscriptions: ${erroAssinatura.message}`);

  let plano = resumo.planoEfetivo;
  if (!resumo.ativa) {
    const { data: outra, error } = await supabase
      .from("subscriptions")
      .select("plan_type")
      .eq("usuario_id", usuarioId)
      .neq("cakto_subscription_id", resumo.caktoSubscriptionId)
      .in("status", [...STATUS_COM_ACESSO])
      .order("atualizado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`subscriptions: ${error.message}`);
    if (outra?.plan_type && outra.plan_type !== "FREE") plano = outra.plan_type;
  }

  const { error: erroPerfil } = await supabase.from("profiles").update({ plan_type: plano }).eq("user_id", usuarioId);
  if (erroPerfil) throw new Error(`profiles: ${erroPerfil.message}`);
}
