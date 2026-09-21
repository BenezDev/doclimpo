-- WhatsApp como canal pago: número verificado por código antes de qualquer
-- envio. profiles.whatsapp_number/whatsapp_verificado_em/whatsapp_optin_em já
-- são protegidos pela trigger protect_whatsapp_columns (só service role
-- escreve, via whatsapp-verificar). A tabela de verificações guarda só o hash
-- do código e é acessível apenas pelo servidor (RLS ligada, sem políticas).
--
-- Rollback:
--   DROP TABLE IF EXISTS public.whatsapp_verificacoes;
--   ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_whatsapp_number_e164;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_whatsapp_number_e164;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_whatsapp_number_e164
  CHECK (whatsapp_number IS NULL OR whatsapp_number ~ '^\+[1-9][0-9]{7,14}$') NOT VALID;

CREATE TABLE IF NOT EXISTS public.whatsapp_verificacoes (
  usuario_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  numero text NOT NULL CHECK (numero ~ '^\+[1-9][0-9]{7,14}$'),
  codigo_hash text NOT NULL CHECK (char_length(codigo_hash) = 64),
  expira_em timestamptz NOT NULL,
  tentativas integer NOT NULL DEFAULT 0,
  envios integer NOT NULL DEFAULT 1,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_verificacoes ENABLE ROW LEVEL SECURITY;
-- Sem políticas de propósito: só a service role (Edge Function) lê e escreve.
