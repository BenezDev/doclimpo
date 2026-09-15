-- Funções de trigger não devem ser invocáveis pela API (/rest/v1/rpc/...).
-- O Postgres já recusa chamá-las fora de um trigger, mas o linter do Supabase
-- aponta SECURITY DEFINER executável por anon/authenticated; revogar fecha a
-- superfície de vez. Idempotente.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_plan_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_family_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_billing_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
