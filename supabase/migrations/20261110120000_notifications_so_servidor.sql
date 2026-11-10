-- notifications é fila de envio e registro do limite do e-mail de teste: só o
-- servidor escreve. As políticas de INSERT/UPDATE/DELETE do usuário vinham da
-- migration 20260317172719 e deixavam (a) apagar a própria linha de teste para
-- zerar o limite de 1 envio por minuto e (b) enfileirar uma linha apontando
-- para o documento de outra conta. O usuário continua lendo as próprias linhas
-- (exportação de dados em Minha conta).
--
-- Rollback: recriar as três políticas de 20260317172719 com
-- (select auth.uid()) = usuario_id e voltar renovar_documento para SECURITY INVOKER.

DROP POLICY IF EXISTS "Users can create their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

-- renovar_documento encerra os PENDING da linha antiga. Sem a política de
-- UPDATE o usuário não alcança mais notifications, então a função passa a
-- rodar como dona. O filtro usuario_id = auth.uid() deixa de ser redundante:
-- agora é ele que restringe ao dono. Corpo igual ao de 20260924120000.
CREATE OR REPLACE FUNCTION public.renovar_documento(p_id uuid, p_nova_data date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  antigo public.documentos%ROWTYPE;
  novo_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF p_nova_data IS NULL OR p_nova_data < CURRENT_DATE THEN
    RAISE EXCEPTION 'DATA_INVALIDA';
  END IF;

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
