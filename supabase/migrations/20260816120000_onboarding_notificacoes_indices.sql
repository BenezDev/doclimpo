-- =============================================================
-- Fase 1 — destravar: colunas que o app já usa mas não existiam,
-- correção do trigger de criação de perfil e índices de performance.
--
-- Contexto: ver F-08 (onboarding gravava em coluna inexistente),
-- F-09 (nome nunca chegava ao perfil) e F-12 (cron não versionado).
-- =============================================================

-- -------------------------------------------------------------
-- 1. Preferências de onboarding e notificação em profiles
-- -------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_email BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_whatsapp BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_hour INTEGER NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- -------------------------------------------------------------
-- 2. F-09 — o cadastro envia raw_user_meta_data->>'nome', mas o
--    trigger só lia 'full_name' e 'name'. Todo perfil nascia com
--    nome vazio. Incluímos 'nome' mantendo os outros como fallback.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (
    NEW.id,
    NULLIF(
      COALESCE(
        NEW.raw_user_meta_data->>'nome',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        ''
      ),
      ''
    ),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recupera o nome de quem já se cadastrou antes desta correção.
UPDATE public.profiles p
SET nome = u.raw_user_meta_data->>'nome'
FROM auth.users u
WHERE p.user_id = u.id
  AND COALESCE(p.nome, '') = ''
  AND COALESCE(u.raw_user_meta_data->>'nome', '') <> '';

-- -------------------------------------------------------------
-- 3. Índices de performance
--    A query principal do dashboard filtra por usuário + não
--    resolvido, ordenando por vencimento.
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_documentos_usuario_vencimento
  ON public.documentos (usuario_id, data_vencimento)
  WHERE resolvido = false;

CREATE INDEX IF NOT EXISTS idx_documentos_status
  ON public.documentos (usuario_id, resolvido);

-- O cron busca por data exata de vencimento entre não resolvidos.
CREATE INDEX IF NOT EXISTS idx_documentos_vencimento_pendente
  ON public.documentos (data_vencimento)
  WHERE resolvido = false;

-- A deduplicação de notificações consulta por documento + janela.
CREATE INDEX IF NOT EXISTS idx_notifications_documento_janela
  ON public.notifications (documento_id, days_before_expiry);

-- A fila de envio busca pendentes por data agendada.
CREATE INDEX IF NOT EXISTS idx_notifications_fila
  ON public.notifications (status, scheduled_date)
  WHERE status = 'PENDING';
