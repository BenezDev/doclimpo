-- Renovação recorrente: "marcar como renovado" passa a pedir a nova data.
-- A linha antiga vira histórico (resolvido = true, status = 'RENEWED') e uma
-- linha nova nasce com a data seguinte, apontando para a anterior por
-- renovado_de. Como o documento_id é novo, os avisos de 90/30/7/1 disparam
-- de novo; os PENDING da linha antiga são encerrados. Tudo em uma transação:
-- a trigger de limite do plano FREE vê a antiga já resolvida no INSERT.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.renovar_documento(uuid, date);
--   ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_extra_check;
--   (renovado_de pode ficar)

ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS renovado_de uuid REFERENCES public.documentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_renovado_de
  ON public.documentos (renovado_de) WHERE renovado_de IS NOT NULL;

-- extra: só objeto pequeno (guarda { uf, placa_final } para sugerir prazos).
ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_extra_check;
ALTER TABLE public.documentos ADD CONSTRAINT documentos_extra_check
  CHECK (extra IS NULL OR (jsonb_typeof(extra) = 'object' AND pg_column_size(extra) <= 512)) NOT VALID;

CREATE OR REPLACE FUNCTION public.renovar_documento(p_id uuid, p_nova_data date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  antigo public.documentos%ROWTYPE;
  novo_id uuid;
BEGIN
  IF p_nova_data IS NULL OR p_nova_data < CURRENT_DATE THEN
    RAISE EXCEPTION 'DATA_INVALIDA';
  END IF;

  -- INVOKER: o RLS de documentos já restringe ao dono; o filtro é redundante de propósito.
  SELECT * INTO antigo FROM public.documentos
   WHERE id = p_id AND usuario_id = auth.uid()
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF antigo.resolvido THEN RAISE EXCEPTION 'JA_RESOLVIDO'; END IF;

  UPDATE public.documentos SET resolvido = true, status = 'RENEWED' WHERE id = p_id;

  INSERT INTO public.documentos (usuario_id, tipo, apelido, numero_documento, observacoes, extra, data_vencimento, resolvido, status, renovado_de)
  VALUES (antigo.usuario_id, antigo.tipo, antigo.apelido, antigo.numero_documento, antigo.observacoes, antigo.extra, p_nova_data, false, 'ACTIVE', p_id)
  RETURNING id INTO novo_id;

  UPDATE public.notifications SET status = 'SKIPPED', sent_date = now(), detalhe = 'documento_renovado'
   WHERE documento_id = p_id AND status = 'PENDING';

  RETURN novo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.renovar_documento(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.renovar_documento(uuid, date) TO authenticated;
