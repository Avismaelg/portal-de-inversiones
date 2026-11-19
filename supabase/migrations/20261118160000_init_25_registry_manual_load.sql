-- Migración 25 — P1-05: carga manual asistida de proyectos y permisos con documento oficial y línea de tiempo.
-- Un proyecto o permiso entra como BORRADOR (capa 'inference'), siempre con un documento fuente; publicarlo
-- sigue exigiendo gestor + documento + nota (migración 18). Cada cambio de estado queda en un historial
-- escrito solo por disparador. El documento se registra por URL (no se descarga ni se guarda su texto).

-- Fuente para documentos oficiales registrados a mano.
INSERT INTO public.sources (code, name, base_url, allowed_hosts, access_method, data_format, legal_status, automation_allowed, is_active)
VALUES ('manual_registry', 'Registro manual de proyectos y permisos (documentos oficiales por enlace)',
        'https://www.gob.do/', ARRAY['gob.do', 'gov.do'], 'manual', 'link', 'pending_review', false, false)
ON CONFLICT (code) DO NOTHING;

-- Registra (o reutiliza) un documento oficial por su URL. Solo staff; solo https en dominios del Estado
-- dominicano (*.gob.do / *.gov.do). Devuelve el id del documento.
CREATE OR REPLACE FUNCTION public.register_official_document(p_url text, p_title text, p_published_on date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_user uuid := app.current_user_id(); v_source uuid; v_host text; v_hash text; v_doc uuid; v_url text := btrim(coalesce(p_url, ''));
BEGIN
  IF v_user IS NULL OR NOT app.is_staff() THEN RAISE EXCEPTION 'only staff can register documents'; END IF;
  IF v_url !~ '^https://[^/?#\s]+(/[^\s]*)?$' OR length(v_url) > 2000 THEN RAISE EXCEPTION 'document url must be https'; END IF;
  v_host := lower(substring(v_url FROM '^https://([^/?#:]+)'));
  IF NOT (v_host ~ '(^|\.)gob\.do$' OR v_host ~ '(^|\.)gov\.do$') THEN
    RAISE EXCEPTION 'document must be hosted on an official domain (*.gob.do or *.gov.do)';
  END IF;
  IF p_published_on IS NOT NULL AND p_published_on > (now() AT TIME ZONE 'America/Santo_Domingo')::date THEN
    RAISE EXCEPTION 'document date cannot be in the future';
  END IF;
  SELECT id INTO v_source FROM public.sources WHERE code = 'manual_registry';
  IF v_source IS NULL THEN RAISE EXCEPTION 'source manual_registry missing'; END IF;
  v_hash := encode(extensions.digest(v_url, 'sha256'), 'hex');
  SELECT id INTO v_doc FROM public.source_documents WHERE source_id = v_source AND content_hash = v_hash;
  IF v_doc IS NULL THEN
    INSERT INTO public.source_documents (source_id, canonical_url, content_hash, title, published_at, timezone_assumed,
                                         ingest_method, uploaded_by, parse_status)
    VALUES (v_source, v_url, v_hash, nullif(left(btrim(coalesce(p_title, '')), 300), ''),
            CASE WHEN p_published_on IS NULL THEN NULL ELSE (p_published_on::timestamp AT TIME ZONE 'America/Santo_Domingo') END,
            p_published_on IS NOT NULL, 'manual_upload', v_user, 'unsupported')
    RETURNING id INTO v_doc;
  END IF;
  RETURN v_doc;
END $$;
REVOKE ALL ON FUNCTION public.register_official_document(text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_official_document(text, text, date) TO authenticated;

-- Línea de tiempo de estados (proyectos y permisos). Solo la escribe el disparador.
CREATE TABLE public.registry_status_changes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  permit_id     uuid REFERENCES public.permits(id) ON DELETE CASCADE,
  from_status   text,
  to_status     text NOT NULL,
  document_id   uuid REFERENCES public.source_documents(id),
  changed_by_role public.user_role,
  changed_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((project_id IS NULL) <> (permit_id IS NULL))
);
CREATE INDEX registry_status_changes_project_idx ON public.registry_status_changes (project_id, changed_at DESC);
CREATE INDEX registry_status_changes_permit_idx ON public.registry_status_changes (permit_id, changed_at DESC);

-- AFTER: la fila ya existe cuando se escribe el historial (clave foránea).
CREATE OR REPLACE FUNCTION app.track_registry_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_doc uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NULL; END IF;
  -- Ramas separadas: cada tabla tiene columnas de documento distintas.
  IF TG_TABLE_NAME = 'projects' THEN
    v_doc := coalesce(NEW.official_document_id, NEW.primary_source_document_id);
    INSERT INTO public.registry_status_changes (project_id, from_status, to_status, document_id, changed_by_role)
    VALUES (NEW.id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.status::text END, NEW.status::text, v_doc, app.current_user_role());
  ELSE
    v_doc := NEW.official_document_id;
    INSERT INTO public.registry_status_changes (permit_id, from_status, to_status, document_id, changed_by_role)
    VALUES (NEW.id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.status::text END, NEW.status::text, v_doc, app.current_user_role());
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER projects_status_history AFTER INSERT OR UPDATE OF status ON public.projects
  FOR EACH ROW EXECUTE FUNCTION app.track_registry_status();
CREATE TRIGGER permits_status_history AFTER INSERT OR UPDATE OF status ON public.permits
  FOR EACH ROW EXECUTE FUNCTION app.track_registry_status();

-- BEFORE: fecha del último cambio de estado del proyecto.
CREATE OR REPLACE FUNCTION app.stamp_project_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN NEW.status_changed_at := now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER projects_status_stamp BEFORE INSERT OR UPDATE OF status ON public.projects
  FOR EACH ROW EXECUTE FUNCTION app.stamp_project_status();

ALTER TABLE public.registry_status_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY registry_status_changes_select ON public.registry_status_changes FOR SELECT TO authenticated
  USING (
    app.is_staff()
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.publication_status = 'published')
    OR EXISTS (SELECT 1 FROM public.permits m WHERE m.id = permit_id AND m.publication_status = 'published')
  );
REVOKE ALL ON public.registry_status_changes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.registry_status_changes TO authenticated;
GRANT ALL ON public.registry_status_changes TO service_role;

-- Un proyecto o permiso cargado a mano siempre tiene documento fuente (también en borrador).
ALTER TABLE public.projects
  ADD CONSTRAINT projects_needs_source_document CHECK (primary_source_document_id IS NOT NULL OR is_demo) NOT VALID;
ALTER TABLE public.permits
  ADD CONSTRAINT permits_needs_source_document CHECK (official_document_id IS NOT NULL OR is_demo OR source_id IS NOT NULL) NOT VALID;
