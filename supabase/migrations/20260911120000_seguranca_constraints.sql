-- =============================================================
-- Constraints de integridade/segurança de input.
--
-- O banco passa a ser a autoridade sobre o formato dos dados que o usuário
-- envia (o front valida com zod, mas não é confiável). Impede tipo fora do
-- conjunto suportado e strings gigantes (abuso de armazenamento).
--
-- Usamos NOT VALID: a checagem passa a valer para toda inserção/atualização
-- NOVA, sem revalidar linhas antigas (não quebra dados legados de produção).
-- Depois de conferir que os dados existentes conformam, dá para rodar
-- `ALTER TABLE ... VALIDATE CONSTRAINT ...` para validar o histórico.
-- =============================================================

-- documentos.tipo: apenas os 9 tipos suportados pela interface
ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_tipo_check;
ALTER TABLE public.documentos ADD CONSTRAINT documentos_tipo_check
  CHECK (tipo IN ('cnh','crlv','ipva','passaporte','rg','seguro','plano_saude','carteira_trabalho','outro'))
  NOT VALID;

-- Limites de tamanho (apelido e endereço)
ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_apelido_len;
ALTER TABLE public.documentos ADD CONSTRAINT documentos_apelido_len
  CHECK (apelido IS NULL OR char_length(apelido) <= 80) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_cep_len;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_cep_len
  CHECK (cep IS NULL OR char_length(cep) <= 9) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_logradouro_len;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_logradouro_len
  CHECK (logradouro IS NULL OR char_length(logradouro) <= 120) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_numero_len;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_numero_len
  CHECK (numero IS NULL OR char_length(numero) <= 20) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_complemento_len;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_complemento_len
  CHECK (complemento IS NULL OR char_length(complemento) <= 60) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_bairro_len;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_bairro_len
  CHECK (bairro IS NULL OR char_length(bairro) <= 80) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_cidade_len;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_cidade_len
  CHECK (cidade IS NULL OR char_length(cidade) <= 80) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_uf_len;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_uf_len
  CHECK (uf IS NULL OR char_length(uf) <= 2) NOT VALID;
