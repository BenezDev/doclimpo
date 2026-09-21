-- Tipos de documento fora do alcance dos apps do governo: garantia de
-- produto/serviço, contrato (aluguel, prestação) e exame periódico/ASO.
-- Disponíveis em todos os planos. Espelho em src/lib/validacao.ts.
--
-- Rollback: reaplicar o bloco 6 de 20260915120000_planos_e_familia.sql
-- (12 valores). NOT VALID: linhas já gravadas não são reavaliadas.

ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_tipo_check;
ALTER TABLE public.documentos ADD CONSTRAINT documentos_tipo_check
  CHECK (tipo IN ('cnh', 'crlv', 'ipva', 'passaporte', 'rg', 'seguro', 'plano_saude', 'carteira_trabalho',
                  'garantia', 'contrato', 'exame',
                  'alvara', 'certidao', 'das_mei', 'outro'))
  NOT VALID;
