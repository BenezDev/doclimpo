-- =============================================================
-- Endereço residencial no perfil — base para "onde renovar perto de você".
--
-- O app passa a coletar (opcionalmente) o endereço do usuário para calcular
-- a unidade de renovação mais próxima de cada documento. Uma residência por
-- usuário, então os campos moram no próprio profiles.
--
-- RLS e a policy de UPDATE por auth.uid() = user_id já vêm da migration base
-- (20260310220837) — nada a acrescentar aqui além das colunas.
--
-- Coordenadas são resolvidas a partir do código IBGE do município (retornado
-- pelo ViaCEP) contra uma tabela de centroides embutida no frontend; ficam
-- persistidas aqui para o cálculo de distância não depender de rede.
-- =============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS logradouro TEXT,
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS complemento TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS uf TEXT,
  ADD COLUMN IF NOT EXISTS ibge TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS endereco_atualizado_em TIMESTAMP WITH TIME ZONE;
