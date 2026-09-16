// CORS centralizado. Em vez de "*", refletimos apenas a origem do app (APP_URL),
// definida nas variáveis da Edge Function. Um único ponto para ajustar quando
// mudar o domínio — e nenhuma origem arbitrária é autorizada.
//
// Observação: a API do Supabase é baseada em Bearer token (não em cookies),
// então CORS aqui é defesa em profundidade, não a única barreira.
const APP_ORIGIN = Deno.env.get("APP_URL") ?? "https://www.doclimpo.com";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": APP_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Vary": "Origin",
};
