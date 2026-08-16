-- Create timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  telefone TEXT,
  avatar_url TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create documentos table
CREATE TABLE public.documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  apelido TEXT,
  numero_documento TEXT,
  data_vencimento DATE NOT NULL,
  data_emissao DATE,
  observacoes TEXT,
  resolvido BOOLEAN NOT NULL DEFAULT false,
  extra JSONB,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
  ON public.documentos FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can create their own documents"
  ON public.documentos FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own documents"
  ON public.documentos FOR UPDATE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own documents"
  ON public.documentos FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE TRIGGER update_documentos_updated_at
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create alertas_configuracao table
CREATE TABLE public.alertas_configuracao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  documento_id UUID NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  dias_antes INTEGER NOT NULL,
  via_email BOOLEAN NOT NULL DEFAULT true,
  ativo BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.alertas_configuracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alert configs"
  ON public.alertas_configuracao FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can create their own alert configs"
  ON public.alertas_configuracao FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own alert configs"
  ON public.alertas_configuracao FOR UPDATE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own alert configs"
  ON public.alertas_configuracao FOR DELETE
  USING (auth.uid() = usuario_id);

-- Indexes for performance
CREATE INDEX idx_documentos_usuario ON public.documentos(usuario_id);
CREATE INDEX idx_documentos_vencimento ON public.documentos(data_vencimento);
CREATE INDEX idx_alertas_documento ON public.alertas_configuracao(documento_id);
CREATE INDEX idx_alertas_usuario ON public.alertas_configuracao(usuario_id);