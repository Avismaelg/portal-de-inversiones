-- Sprint de estabilización / P1 (2026-11-17):
-- 1) Licitaciones publicadas: solo un gestor puede editarlas (P1-03).
-- 2) Proyectos y permisos: guardia de publicación (gestor + documento + revisor inmutable).
-- 3) Operación de fuentes: último éxito/error por fuente y registro de cada carga (P1-02).
-- 4) IA: registro de ejecución (modelo, tokens, costo, latencia) y gasto del mes (P1-04).
-- 5) Notificaciones in-app con deduplicación, solo para el propio usuario (P1-07).
-- Las escrituras de 3–5 pasan por funciones SECURITY DEFINER con comprobación de rol, sin abrir INSERT directo.

-- 1) Licitaciones -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.enforce_tender_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.publication_status = 'published' AND NEW.publication_status = 'published' THEN
    IF app.current_user_id() IS NOT NULL AND NOT app.is_manager() THEN
      RAISE EXCEPTION 'only a manager can edit a published tender';
    END IF;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    RETURN NEW;
  END IF;
  IF NEW.publication_status <> 'published' THEN
    RETURN NEW;
  END IF;
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

-- 2) Proyectos y permisos ---------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN reviewed_by  uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  ADD COLUMN reviewed_at  timestamptz,
  ADD COLUMN review_notes text;
ALTER TABLE public.permits
  ADD COLUMN reviewed_by  uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  ADD COLUMN reviewed_at  timestamptz,
  ADD COLUMN review_notes text;
ALTER TABLE public.projects ALTER COLUMN publication_status SET DEFAULT 'draft';
ALTER TABLE public.permits ALTER COLUMN publication_status SET DEFAULT 'draft';

CREATE OR REPLACE FUNCTION app.enforce_registry_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_doc uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.publication_status = 'published' AND NEW.publication_status = 'published' THEN
    IF app.current_user_id() IS NOT NULL AND NOT app.is_manager() THEN
      RAISE EXCEPTION 'only a manager can edit a published %', TG_TABLE_NAME;
    END IF;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    RETURN NEW;
  END IF;
  IF NEW.publication_status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF app.current_user_id() IS NULL OR NOT app.is_manager() THEN
    RAISE EXCEPTION '% publication requires an authenticated manager', TG_TABLE_NAME;
  END IF;
  v_doc := CASE TG_TABLE_NAME WHEN 'projects' THEN NEW.primary_source_document_id ELSE NEW.official_document_id END;
  IF v_doc IS NULL THEN
    RAISE EXCEPTION '% publication requires a source document', TG_TABLE_NAME;
  END IF;
  IF NEW.review_notes IS NULL OR btrim(NEW.review_notes) = '' THEN
    RAISE EXCEPTION '% publication requires review_notes', TG_TABLE_NAME;
  END IF;
  NEW.reviewed_by := app.current_user_id();
  NEW.reviewed_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER projects_publication_guard BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION app.enforce_registry_publication();
CREATE TRIGGER permits_publication_guard BEFORE INSERT OR UPDATE ON public.permits
  FOR EACH ROW EXECUTE FUNCTION app.enforce_registry_publication();

-- 3) Operación de fuentes ---------------------------------------------------------------------
ALTER TABLE public.sources
  ADD COLUMN last_success_at timestamptz,
  ADD COLUMN last_error_at   timestamptz,
  ADD COLUMN last_error      text,
  ADD COLUMN responsible     text;

CREATE OR REPLACE FUNCTION public.record_ingestion_run(
  p_source_code text, p_ok boolean, p_payload jsonb, p_result jsonb, p_error text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_source uuid; v_id uuid;
BEGIN
  IF app.current_user_id() IS NULL OR NOT app.is_manager() THEN
    RAISE EXCEPTION 'only a manager can record an ingestion run';
  END IF;
  SELECT id INTO v_source FROM public.sources WHERE code = p_source_code;
  IF v_source IS NULL THEN RAISE EXCEPTION 'unknown source %', p_source_code; END IF;
  INSERT INTO public.ingestion_jobs (source_id, job_type, status, idempotency_key, started_at, finished_at, attempts,
                                     payload, result, error_class, error_message)
  VALUES (v_source, 'fetch', CASE WHEN p_ok THEN 'succeeded' ELSE 'failed' END::public.job_status,
          'manual:' || gen_random_uuid()::text, now(), now(), 1,
          coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('triggered_by', app.current_user_id(), 'method', 'manual_assisted'),
          coalesce(p_result, '{}'::jsonb), CASE WHEN p_ok THEN NULL ELSE 'manual_load' END, left(p_error, 500))
  RETURNING id INTO v_id;
  IF p_ok THEN
    UPDATE public.sources SET last_success_at = now() WHERE id = v_source;
  ELSE
    UPDATE public.sources SET last_error_at = now(), last_error = left(p_error, 500) WHERE id = v_source;
  END IF;
  RETURN v_id;
END $$;

-- Las fuentes de noticias y de medios deben existir en el registro para registrar sus cargas.
INSERT INTO public.sources (code, name, base_url, allowed_hosts, access_method, data_format, legal_status, automation_allowed, is_active)
VALUES
  ('news_primary_rss', 'Noticias de fuentes primarias (7 feeds RSS institucionales)', 'https://indotel.gob.do/feed/',
   ARRAY['indotel.gob.do','simv.gob.do','www.hacienda.gob.do','camaradediputados.gob.do','www.senadord.gob.do','proindustria.gob.do','procompetencia.gob.do'],
   'rss', 'RSS 2.0', 'pending_review', false, false),
  ('media_reference_rss', 'Medios de referencia de tiempo (Diario Libre, El Dinero, Dominican Today)', 'https://www.diariolibre.com/rss/economia.xml',
   ARRAY['www.diariolibre.com','eldinero.com.do','dominicantoday.com'], 'rss', 'RSS 2.0', 'pending_review', false, false)
ON CONFLICT (code) DO NOTHING;

-- 4) IA ---------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_ai_run(
  p_task text, p_subject_type public.entity_type, p_subject_id uuid, p_model text, p_prompt_version text,
  p_schema_version text, p_input_tokens int, p_output_tokens int, p_cost_usd numeric, p_latency_ms int,
  p_status public.run_status, p_error text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_id uuid;
BEGIN
  IF app.current_user_id() IS NULL OR NOT app.is_staff() THEN
    RAISE EXCEPTION 'only staff can record an AI run';
  END IF;
  INSERT INTO public.ai_analysis_runs (agent, task, subject_type, subject_id, provider, model, prompt_version, schema_version,
                                       idempotency_key, input_tokens, output_tokens, cost_usd, latency_ms, status, error)
  VALUES ('financial_analysis', p_task, p_subject_type, p_subject_id, 'anthropic', p_model, p_prompt_version, p_schema_version,
          'run:' || gen_random_uuid()::text, p_input_tokens, p_output_tokens, p_cost_usd, p_latency_ms, p_status, left(p_error, 500))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.ai_spend_month() RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT CASE WHEN app.is_staff()
    THEN coalesce(sum(cost_usd), 0) ELSE NULL END
  FROM public.ai_analysis_runs
  WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'America/Santo_Domingo') AT TIME ZONE 'America/Santo_Domingo'
$$;

ALTER TABLE public.news_analyses ADD COLUMN ai_run_id uuid REFERENCES public.ai_analysis_runs(id);

-- 5) Notificaciones in-app --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.push_my_notifications(p_items jsonb) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_user uuid := app.current_user_id(); v_item jsonb; v_type public.entity_type; v_id uuid; v_n int := 0; v_rows int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) > 200 THEN RAISE EXCEPTION 'invalid items'; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_type := (v_item ->> 'entity_type')::public.entity_type;
    v_id := (v_item ->> 'entity_id')::uuid;
    -- Solo entidades que el usuario puede ver.
    IF v_type = 'news' AND NOT EXISTS (SELECT 1 FROM public.news_items WHERE id = v_id) THEN CONTINUE; END IF;
    IF v_type = 'tender' AND NOT EXISTS (
      SELECT 1 FROM public.public_tenders WHERE id = v_id AND (publication_status = 'published' OR app.is_staff())
    ) THEN CONTINUE; END IF;
    IF v_type NOT IN ('news', 'tender') THEN CONTINUE; END IF;
    INSERT INTO public.notifications (user_id, preference_id, entity_type, entity_id, reason, title, priority, channel, status, dedup_key, delivered_at)
    SELECT v_user, p.id, v_type, v_id, left(v_item ->> 'reason', 300), left(v_item ->> 'title', 300),
           least(greatest(coalesce((v_item ->> 'priority')::int, 3), 1), 5), 'in_app', 'delivered',
           v_type::text || ':' || v_id::text, now()
      FROM (SELECT (v_item ->> 'preference_id')::uuid AS pid) x
      LEFT JOIN public.user_alert_preferences p ON p.id = x.pid AND p.user_id = v_user
    ON CONFLICT (user_id, channel, dedup_key) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_n := v_n + v_rows;
  END LOOP;
  RETURN v_n;
END $$;

REVOKE ALL ON FUNCTION public.record_ingestion_run(text, boolean, jsonb, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_ai_run(text, public.entity_type, uuid, text, text, text, int, int, numeric, int, public.run_status, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ai_spend_month() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.push_my_notifications(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_ingestion_run(text, boolean, jsonb, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_run(text, public.entity_type, uuid, text, text, text, int, int, numeric, int, public.run_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_spend_month() TO authenticated;
GRANT EXECUTE ON FUNCTION public.push_my_notifications(jsonb) TO authenticated;
GRANT UPDATE (ai_run_id) ON public.news_analyses TO authenticated;
