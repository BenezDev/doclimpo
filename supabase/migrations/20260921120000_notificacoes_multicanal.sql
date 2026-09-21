-- Notificações por canal: uma linha em notifications por (documento, janela,
-- canal). O produtor (check-expiring-documents) enfileira só os canais que o
-- usuário pode receber; o consumidor (send-pending-notifications) despacha
-- cada linha pelo seu tipo. Linhas EMAIL existentes seguem válidas.
--
-- Rollback:
--   DROP INDEX IF EXISTS public.notifications_doc_janela_canal_unico;
--   ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
--   ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
--   (a coluna detalhe pode ficar)

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (notification_type IN ('EMAIL', 'PUSH', 'WHATSAPP')) NOT VALID;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_status_check
  CHECK (status IN ('PENDING', 'SENT', 'SKIPPED', 'FAILED')) NOT VALID;

-- Motivo do SKIPPED/FAILED ou id devolvido pelo provedor. Curto: é diagnóstico, não log.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS detalhe text;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_detalhe_len;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_detalhe_len
  CHECK (detalhe IS NULL OR char_length(detalhe) <= 300) NOT VALID;

-- Idempotência por (documento, janela, canal). A janela 0 (vencido) fica de
-- fora, como hoje; testes têm documento_id NULL.
CREATE UNIQUE INDEX IF NOT EXISTS notifications_doc_janela_canal_unico
  ON public.notifications (documento_id, days_before_expiry, notification_type)
  WHERE documento_id IS NOT NULL AND days_before_expiry > 0;

-- Coberto pelo índice único acima.
DROP INDEX IF EXISTS public.idx_notifications_documento_janela;

CREATE INDEX IF NOT EXISTS idx_notifications_fila_canal
  ON public.notifications (notification_type, scheduled_date)
  WHERE status = 'PENDING';

-- Colunas lidas pelo produtor desde já (expand primeiro): o canal WhatsApp só
-- é enfileirado quando whatsapp_verificado_em estiver preenchido — o que a
-- função whatsapp-verificar fará numa fase seguinte. Até lá, ficam NULL.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_verificado_em timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_optin_em timestamptz;
