
-- Renewal history table: tracks when documents are renewed and associated costs
CREATE TABLE public.renovacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid REFERENCES public.documentos(id) ON DELETE CASCADE NOT NULL,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_renovacao date NOT NULL DEFAULT CURRENT_DATE,
  custo_renovacao numeric(10,2) DEFAULT 0,
  multa_evitada numeric(10,2) DEFAULT 0,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.renovacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own renewals"
  ON public.renovacoes FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can create their own renewals"
  ON public.renovacoes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own renewals"
  ON public.renovacoes FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own renewals"
  ON public.renovacoes FOR DELETE
  TO authenticated
  USING (auth.uid() = usuario_id);
