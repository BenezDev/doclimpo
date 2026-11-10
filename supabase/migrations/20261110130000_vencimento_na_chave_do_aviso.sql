-- O aviso passa a ser único por (documento, data de vencimento, janela, canal).
--
-- Antes a chave não tinha a data. Quem corrigia o vencimento de um documento, ou
-- "renovava" editando a data em vez de usar Marcar como renovado, continuava com
-- as janelas antigas ocupadas: a rodada via a linha SENT da janela 30 do ano
-- passado e não enfileirava a deste ano. O aviso sumia sem erro nenhum.
--
-- Com a data na chave, mudar o vencimento abre um ciclo novo de avisos. O
-- gatilho encerra os PENDING da data antiga (falariam de um prazo que não vale
-- mais) e devolve documentos.status para ACTIVE, para um documento que estava
-- EXPIRED voltar a receber o aviso de vencido na data nova.
--
-- Consequência aceita: corrigir a data em um dia dentro da mesma janela repete
-- o aviso daquela janela, já com o prazo certo.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS ao_mudar_vencimento_trigger ON public.documentos;
--   DROP FUNCTION IF EXISTS public.ao_mudar_vencimento();
--   DROP INDEX IF EXISTS public.notifications_doc_venc_janela_canal_unico;
--   recriar notifications_doc_janela_canal_unico como em 20260924130000
--   (a coluna vencimento pode ficar)

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS vencimento date;

-- Linhas já gravadas valem para a data que o documento tem hoje.
UPDATE public.notifications n
   SET vencimento = d.data_vencimento
  FROM public.documentos d
 WHERE n.documento_id = d.id AND n.vencimento IS NULL;

DROP INDEX IF EXISTS public.notifications_doc_janela_canal_unico;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_doc_venc_janela_canal_unico
  ON public.notifications (documento_id, vencimento, days_before_expiry, notification_type)
  WHERE documento_id IS NOT NULL AND days_before_expiry >= 0;

-- SECURITY DEFINER: o usuário não escreve em notifications
-- (20261110120000_notifications_so_servidor.sql). O gatilho só toca as linhas
-- do documento que o próprio usuário acabou de atualizar sob o RLS.
CREATE OR REPLACE FUNCTION public.ao_mudar_vencimento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.data_vencimento IS DISTINCT FROM OLD.data_vencimento THEN
    IF NOT NEW.resolvido THEN
      NEW.status := 'ACTIVE';
    END IF;
    UPDATE public.notifications
       SET status = 'SKIPPED', sent_date = now(), detalhe = 'data_alterada'
     WHERE documento_id = NEW.id AND status = 'PENDING';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ao_mudar_vencimento() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ao_mudar_vencimento_trigger ON public.documentos;
CREATE TRIGGER ao_mudar_vencimento_trigger
  BEFORE UPDATE OF data_vencimento ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.ao_mudar_vencimento();
