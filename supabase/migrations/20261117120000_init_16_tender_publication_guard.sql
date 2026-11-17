-- Integridad de publicación de licitaciones (auditoría 5.2, 2026-11-17).
-- Antes: publication_status por defecto 'published' y cualquier staff podía publicar sin registro de revisión.
-- Ahora: borrador por defecto; publicar exige gestor autenticado, registra responsable y fecha, y un registro
-- con banderas de calidad solo se publica con nota de revisión. Se guarda procedencia y resultado de validación.

ALTER TABLE public.public_tenders
  ADD COLUMN source_url   text CHECK (source_url IS NULL OR source_url ~ '^https://'),
  ADD COLUMN extracted_at timestamptz,
  ADD COLUMN reviewed_by  uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  ADD COLUMN reviewed_at  timestamptz,
  ADD COLUMN review_notes text,
  ADD COLUMN validation   jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(validation) = 'object');

ALTER TABLE public.public_tenders ALTER COLUMN publication_status SET DEFAULT 'draft';

CREATE OR REPLACE FUNCTION app.enforce_tender_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Ya publicada y sigue publicada: el registro de revisión es inmutable.
  IF TG_OP = 'UPDATE' AND OLD.publication_status = 'published' AND NEW.publication_status = 'published' THEN
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    RETURN NEW;
  END IF;
  IF NEW.publication_status <> 'published' THEN
    RETURN NEW;
  END IF;
  -- Transición a publicada.
  IF app.current_user_id() IS NULL OR NOT app.is_manager() THEN
    RAISE EXCEPTION 'tender publication requires an authenticated manager';
  END IF;
  IF cardinality(NEW.data_quality_flags) > 0 AND (NEW.review_notes IS NULL OR btrim(NEW.review_notes) = '') THEN
    RAISE EXCEPTION 'tender with data quality flags requires review_notes to be published';
  END IF;
  NEW.reviewed_by := app.current_user_id();
  NEW.reviewed_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER public_tenders_publication_guard
  BEFORE INSERT OR UPDATE ON public.public_tenders
  FOR EACH ROW EXECUTE FUNCTION app.enforce_tender_publication();

-- Datos existentes (cargados antes de la guardia): no se borra nada.
-- Con banderas de calidad -> a revisión. Limpios -> siguen publicados, marcados como heredados sin revisor.
UPDATE public.public_tenders
   SET publication_status = 'in_review',
       validation = jsonb_build_object('rule', 'legacy_pre_guard', 'flags', to_jsonb(data_quality_flags))
 WHERE publication_status = 'published' AND cardinality(data_quality_flags) > 0;

UPDATE public.public_tenders
   SET validation = jsonb_build_object('rule', 'legacy_pre_guard', 'flags', '[]'::jsonb, 'reviewed', false)
 WHERE publication_status = 'published' AND validation = '{}'::jsonb;
