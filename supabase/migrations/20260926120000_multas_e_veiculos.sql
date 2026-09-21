-- Multas de trânsito, fase 1: (1) tipo 'multa' em documentos, disponível em
-- todos os planos; (2) tabela veiculos (placa + UF + apelido) para o painel do
-- carro e para pré-preencher as sugestões de prazo. O DocLimpo não consulta
-- multas: a placa fica só nesta tabela, nunca vai para URL nem para terceiros.
-- Renavam e consentimento de consulta automática ficam para a fase 2.
-- Espelhos no cliente: src/lib/validacao.ts (TIPOS_DOCUMENTO, veiculoSchema)
-- e src/lib/veiculos.ts (PLACA_RE, LIMITE_VEICULOS).
--
-- Rollback:
--   DROP TRIGGER IF EXISTS enforce_veiculos_limit_trigger ON public.veiculos;
--   DROP FUNCTION IF EXISTS public.enforce_veiculos_limit();
--   DROP TABLE IF EXISTS public.veiculos;
--   Reaplicar o CHECK de 20260923120000_tipos_documento_pessoais.sql (15
--   valores) depois de converter linhas com tipo 'multa' para 'outro'.
--   NOT VALID: linhas já gravadas não são reavaliadas.

-- 1. documentos.tipo ganha 'multa'
ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_tipo_check;
ALTER TABLE public.documentos ADD CONSTRAINT documentos_tipo_check
  CHECK (tipo IN ('cnh', 'crlv', 'ipva', 'multa', 'passaporte', 'rg', 'seguro', 'plano_saude', 'carteira_trabalho',
                  'garantia', 'contrato', 'exame',
                  'alvara', 'certidao', 'das_mei', 'outro'))
  NOT VALID;

-- 2. veiculos: placa normalizada (maiúsculas, sem hífen). Uma regex cobre o
--    padrão Mercosul AAA0A00 e o antigo AAA0000 (5º caractere letra ou dígito).
--    UF só das 27 da lista (espelho de UFS em src/lib/calendario-veicular.ts).
--    Em produção o CHECK de uf foi trocado da regex para a lista pela migration
--    veiculos_uf_lista_real, com a tabela ainda vazia; este arquivo já traz a lista.
CREATE TABLE IF NOT EXISTS public.veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  placa text NOT NULL CHECK (placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  uf text NOT NULL CHECK (uf IN ('AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
                                 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO')),
  apelido text CHECK (apelido IS NULL OR char_length(apelido) <= 60),
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT veiculos_usuario_placa_unique UNIQUE (usuario_id, placa)
);
-- O índice do UNIQUE (usuario_id, placa) já atende às buscas por usuario_id.

ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "veiculos: ver os proprios" ON public.veiculos;
CREATE POLICY "veiculos: ver os proprios" ON public.veiculos
  FOR SELECT USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "veiculos: criar os proprios" ON public.veiculos;
CREATE POLICY "veiculos: criar os proprios" ON public.veiculos
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "veiculos: atualizar os proprios" ON public.veiculos;
CREATE POLICY "veiculos: atualizar os proprios" ON public.veiculos
  FOR UPDATE USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "veiculos: remover os proprios" ON public.veiculos;
CREATE POLICY "veiculos: remover os proprios" ON public.veiculos
  FOR DELETE USING (auth.uid() = usuario_id);

-- 3. No máximo 5 veículos por usuário (mesmo padrão de enforce_plan_limits).
CREATE OR REPLACE FUNCTION public.enforce_veiculos_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total integer;
BEGIN
  SELECT count(*) INTO total FROM public.veiculos WHERE usuario_id = NEW.usuario_id;
  IF total >= 5 THEN
    RAISE EXCEPTION 'VEICULO_LIMIT';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enforce_veiculos_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_veiculos_limit_trigger ON public.veiculos;
CREATE TRIGGER enforce_veiculos_limit_trigger
  BEFORE INSERT ON public.veiculos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_veiculos_limit();
