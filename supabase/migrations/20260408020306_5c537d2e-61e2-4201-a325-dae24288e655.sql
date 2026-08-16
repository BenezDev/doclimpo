CREATE OR REPLACE FUNCTION public.enforce_free_plan_document_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_plan text;
  current_count integer;
BEGIN
  SELECT plan_type
  INTO current_plan
  FROM public.profiles
  WHERE user_id = NEW.usuario_id
  LIMIT 1;

  IF COALESCE(current_plan, 'FREE') = 'FREE' THEN
    SELECT COUNT(*)
    INTO current_count
    FROM public.documentos
    WHERE usuario_id = NEW.usuario_id;

    IF current_count >= 1 THEN
      RAISE EXCEPTION 'PLAN_LIMIT';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_free_plan_document_limit_trigger ON public.documentos;

CREATE TRIGGER enforce_free_plan_document_limit_trigger
BEFORE INSERT ON public.documentos
FOR EACH ROW
EXECUTE FUNCTION public.enforce_free_plan_document_limit();