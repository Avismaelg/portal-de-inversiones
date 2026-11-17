-- P1-01: historial de cambios por licitación. Un disparador registra, en cada UPDATE real, los campos
-- relevantes que cambiaron (antes → después). Solo lectura desde la API (sin políticas de escritura).
-- Visibilidad: staff ve todo; el resto solo el historial de licitaciones publicadas.
-- Sin identidad del autor (B-018): se guarda el rol y el origen (carga / revisión).

CREATE TABLE public.tender_changes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id   uuid NOT NULL REFERENCES public.public_tenders(id) ON DELETE CASCADE,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  actor_role  public.user_role,                 -- NULL = proceso de carga / sistema
  origin      text NOT NULL CHECK (origin IN ('ingest', 'review', 'edit')),
  changes     jsonb NOT NULL CHECK (jsonb_typeof(changes) = 'object' AND changes <> '{}'::jsonb)
);
CREATE INDEX tender_changes_tender_idx ON public.tender_changes (tender_id, changed_at DESC);

CREATE OR REPLACE FUNCTION app.log_tender_change() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_old jsonb := to_jsonb(OLD); v_new jsonb := to_jsonb(NEW); v_changes jsonb := '{}'::jsonb; k text;
  v_fields text[] := ARRAY['title', 'description', 'status', 'procurement_method', 'published_at', 'deadline_at',
                           'budget_amount', 'budget_currency', 'source_url', 'data_quality_flags', 'publication_status'];
BEGIN
  FOREACH k IN ARRAY v_fields LOOP
    IF v_old -> k IS DISTINCT FROM v_new -> k THEN
      v_changes := v_changes || jsonb_build_object(k, jsonb_build_object('from', v_old -> k, 'to', v_new -> k));
    END IF;
  END LOOP;
  IF v_changes = '{}'::jsonb THEN RETURN NULL; END IF;
  INSERT INTO public.tender_changes (tender_id, actor_role, origin, changes)
  VALUES (NEW.id,
          CASE WHEN app.current_user_id() IS NULL THEN NULL ELSE app.current_user_role() END,
          -- La carga cambia extracted_at (y puede limpiar la nota al devolver a revisión): tiene prioridad.
          CASE WHEN NEW.extracted_at IS DISTINCT FROM OLD.extracted_at THEN 'ingest'
               WHEN NEW.review_notes IS DISTINCT FROM OLD.review_notes OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN 'review'
               ELSE 'edit' END,
          v_changes);
  RETURN NULL;
END $$;

CREATE TRIGGER public_tenders_log_change
  AFTER UPDATE ON public.public_tenders
  FOR EACH ROW EXECUTE FUNCTION app.log_tender_change();

ALTER TABLE public.tender_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tender_changes_select ON public.tender_changes FOR SELECT TO authenticated
  USING (app.is_staff() OR EXISTS (
    SELECT 1 FROM public.public_tenders t WHERE t.id = tender_id AND t.publication_status = 'published'));
REVOKE ALL ON public.tender_changes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tender_changes TO authenticated;
