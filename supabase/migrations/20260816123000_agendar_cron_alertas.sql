-- =============================================================
-- F-12 — o agendamento do cron nunca esteve no código.
--
-- A migration 20260318005145 criava as extensões pg_cron e pg_net,
-- mas o schedule em si era feito na mão pelo painel — invisível para
-- quem lê o repositório e perdido ao recriar o projeto.
--
-- Os segredos ficam no Vault, não nesta migration.
-- ANTES DE APLICAR, cadastre-os uma vez por ambiente:
--
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<segredo forte>',           'cron_secret');
--
-- E defina CRON_SECRET nas variáveis das Edge Functions com o mesmo
-- valor de 'cron_secret'.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove agendamentos anteriores para a migration ser idempotente.
DO $$
DECLARE
  nome_job text;
BEGIN
  FOREACH nome_job IN ARRAY ARRAY['docalert-verificar-vencimentos', 'docalert-enviar-notificacoes']
  LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = nome_job) THEN
      PERFORM cron.unschedule(nome_job);
    END IF;
  END LOOP;
END;
$$;

-- 09:00 BRT = 12:00 UTC — varre os documentos e enfileira notificações.
SELECT cron.schedule(
  'docalert-verificar-vencimentos',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url     := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
               || '/functions/v1/check-expiring-documents',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
               ),
    body    := '{}'::jsonb
  );
  $$
);

-- 15 minutos depois, drena a fila e envia de fato.
-- Repete de hora em hora para dar conta de retentativas.
SELECT cron.schedule(
  'docalert-enviar-notificacoes',
  '15 * * * *',
  $$
  SELECT net.http_post(
    url     := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
               || '/functions/v1/send-pending-notifications',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
               ),
    body    := '{}'::jsonb
  );
  $$
);
