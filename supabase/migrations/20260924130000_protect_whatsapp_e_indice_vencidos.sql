-- Achados da revisão de segurança das fases multicanal/push:
--
-- 1. whatsapp_number, whatsapp_verificado_em e whatsapp_optin_em só mudam pelo
--    servidor (whatsapp-verificar, via service role). A política de UPDATE de
--    profiles vale para a linha inteira, então sem esta trigger o próprio
--    usuário "verificaria" qualquer número. Mesmo padrão de protect_billing_columns.
--    O cliente continua podendo ligar/desligar notification_whatsapp.
-- 2. O índice único de notifications passa a cobrir a janela 0 (vencido):
--    duas rodadas paralelas do cron não geram aviso duplicado.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS protect_whatsapp_columns_trigger ON public.profiles;
--   DROP FUNCTION IF EXISTS public.protect_whatsapp_columns();
--   (índice: recriar com days_before_expiry > 0)

CREATE OR REPLACE FUNCTION public.protect_whatsapp_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() IN ('authenticated', 'anon')
     AND (NEW.whatsapp_number IS DISTINCT FROM OLD.whatsapp_number
          OR NEW.whatsapp_verificado_em IS DISTINCT FROM OLD.whatsapp_verificado_em
          OR NEW.whatsapp_optin_em IS DISTINCT FROM OLD.whatsapp_optin_em) THEN
    RAISE EXCEPTION 'WHATSAPP_READONLY';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_whatsapp_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_whatsapp_columns_trigger ON public.profiles;
CREATE TRIGGER protect_whatsapp_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_whatsapp_columns();

DROP INDEX IF EXISTS public.notifications_doc_janela_canal_unico;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_doc_janela_canal_unico
  ON public.notifications (documento_id, days_before_expiry, notification_type)
  WHERE documento_id IS NOT NULL AND days_before_expiry >= 0;
