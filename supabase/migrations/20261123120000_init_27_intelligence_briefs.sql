-- Migración 27 — Notas de inteligencia multi-fuente (patrones y decisiones).
--
-- Una nota la genera el Agente de Inteligencia de Oportunidades a partir de VARIAS noticias.
-- El modelo redacta; el código ya filtró citas, cifras y patrones antes de llamar a esta función.
-- Reglas de la base:
--   * Solo staff registra una nota; solo un gestor la publica o rechaza, con nota de revisión.
--   * El contenido de una nota publicada es inmutable (si está mal, se crea otra).
--   * Lectores solo ven notas publicadas; el staff ve borradores y rechazos.
--   * Cada intento queda en `ai_analysis_runs` (costo, modelo, versiones y estado), incluso si falla.
--
-- `record_intelligence_brief` y `review_intelligence_brief` son SECURITY DEFINER; el cliente no
-- escribe directo en la tabla.

CREATE TABLE public.intelligence_briefs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_label        text NOT NULL CHECK (char_length(btrim(scope_label)) BETWEEN 2 AND 120),
  period_start       date NOT NULL,
  period_end         date NOT NULL,
  headline           text NOT NULL CHECK (char_length(btrim(headline)) BETWEEN 10 AND 200),
  lead               text NOT NULL CHECK (char_length(btrim(lead)) BETWEEN 30 AND 800),
  payload            jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND octet_length(payload::text) <= 262144),
  input_news_ids     uuid[] NOT NULL CHECK (cardinality(input_news_ids) BETWEEN 2 AND 8),
  model              text NOT NULL CHECK (btrim(model) <> ''),
  prompt_version     text NOT NULL,
  schema_version     text NOT NULL,
  ai_run_id          uuid NOT NULL REFERENCES public.ai_analysis_runs(id),
  trust_layer        public.trust_layer NOT NULL DEFAULT 'ai_analysis' CHECK (trust_layer = 'ai_analysis'),
  publication_status public.publication_status NOT NULL DEFAULT 'draft',
  review_notes       text,
  reviewed_by        uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  reviewed_at        timestamptz,
  published_at       timestamptz,
  generated_by       uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brief_period_order CHECK (period_end >= period_start),
  CONSTRAINT brief_review_pair CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL))
);

CREATE INDEX intelligence_briefs_created_idx ON public.intelligence_briefs (created_at DESC);
CREATE INDEX intelligence_briefs_published_idx
  ON public.intelligence_briefs (published_at DESC) WHERE publication_status = 'published';
CREATE INDEX intelligence_briefs_status_idx ON public.intelligence_briefs (publication_status, created_at DESC);
CREATE INDEX ai_runs_task_created_idx ON public.ai_analysis_runs (task, created_at DESC);

ALTER TABLE public.intelligence_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY intelligence_briefs_select ON public.intelligence_briefs
  FOR SELECT TO authenticated
  USING (publication_status = 'published' OR app.is_staff());

-- El cliente solo lee columnas no sensibles; los campos de revisión van en la vista staff.
REVOKE ALL ON public.intelligence_briefs FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, scope_label, period_start, period_end, headline, lead, payload, input_news_ids,
  model, prompt_version, schema_version, trust_layer, publication_status, published_at, created_at
) ON public.intelligence_briefs TO authenticated;
GRANT ALL ON public.intelligence_briefs TO service_role;

CREATE VIEW public.staff_intelligence_briefs AS
  SELECT b.* FROM public.intelligence_briefs b WHERE app.is_staff();
REVOKE ALL ON public.staff_intelligence_briefs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.staff_intelligence_briefs TO authenticated;

-- Publicar o rechazar: gestor autenticado, nota obligatoria y contenido publicado inmutable.
CREATE OR REPLACE FUNCTION app.enforce_brief_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.publication_status = 'published' THEN
    IF NEW.publication_status <> 'published' THEN
      RAISE EXCEPTION 'published briefs cannot be unpublished; create a new brief';
    END IF;
    NEW.reviewed_by  := OLD.reviewed_by;
    NEW.reviewed_at  := OLD.reviewed_at;
    NEW.published_at := OLD.published_at;
    IF NEW.payload IS DISTINCT FROM OLD.payload
       OR NEW.headline IS DISTINCT FROM OLD.headline
       OR NEW.lead IS DISTINCT FROM OLD.lead THEN
      RAISE EXCEPTION 'published brief content is immutable';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.publication_status = 'rejected' THEN
    IF app.current_user_id() IS NULL OR NOT app.is_manager() THEN
      RAISE EXCEPTION 'brief rejection requires an authenticated manager';
    END IF;
    IF NEW.review_notes IS NULL OR btrim(NEW.review_notes) = '' THEN
      RAISE EXCEPTION 'brief rejection requires review_notes';
    END IF;
    NEW.reviewed_by := app.current_user_id();
    NEW.reviewed_at := coalesce(NEW.reviewed_at, now());
    NEW.published_at := NULL;
    RETURN NEW;
  END IF;

  IF NEW.publication_status <> 'published' THEN
    RETURN NEW;
  END IF;

  IF app.current_user_id() IS NULL OR NOT app.is_manager() THEN
    RAISE EXCEPTION 'brief publication requires an authenticated manager';
  END IF;
  IF NEW.review_notes IS NULL OR btrim(NEW.review_notes) = '' THEN
    RAISE EXCEPTION 'brief publication requires review_notes';
  END IF;

  NEW.reviewed_by  := app.current_user_id();
  NEW.reviewed_at  := now();
  NEW.published_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER intelligence_briefs_publication_guard
  BEFORE INSERT OR UPDATE ON public.intelligence_briefs
  FOR EACH ROW EXECUTE FUNCTION app.enforce_brief_publication();

-- Registro de una generación (éxito o fallo). Solo staff; la nota nace en borrador.
CREATE OR REPLACE FUNCTION public.record_intelligence_brief(
  p_scope_label text,
  p_period_start date,
  p_period_end date,
  p_headline text,
  p_lead text,
  p_input_news_ids uuid[],
  p_payload jsonb,
  p_model text,
  p_prompt_version text,
  p_schema_version text,
  p_input_tokens int,
  p_output_tokens int,
  p_cost_usd numeric,
  p_latency_ms int,
  p_status public.run_status,
  p_error text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_run uuid;
  v_id uuid;
BEGIN
  IF app.current_user_id() IS NULL OR NOT app.is_staff() THEN
    RAISE EXCEPTION 'only staff can record an intelligence brief';
  END IF;
  IF p_model IS NULL OR btrim(p_model) = '' THEN
    RAISE EXCEPTION 'model required';
  END IF;
  IF p_prompt_version IS NULL OR p_schema_version IS NULL THEN
    RAISE EXCEPTION 'prompt and schema versions required';
  END IF;
  IF p_input_tokens < 0 OR p_output_tokens < 0 OR p_cost_usd < 0 OR p_latency_ms < 0 THEN
    RAISE EXCEPTION 'invalid usage values';
  END IF;
  IF p_payload IS NOT NULL AND octet_length(p_payload::text) > 262144 THEN
    RAISE EXCEPTION 'payload too large';
  END IF;

  -- Todo intento cuenta para el gasto y queda trazado, aunque no produzca nota.
  INSERT INTO public.ai_analysis_runs (
    agent, task, subject_type, subject_id, provider, model, prompt_version, schema_version,
    idempotency_key, input_tokens, output_tokens, cost_usd, latency_ms, status, error, output
  ) VALUES (
    'opportunity_intelligence', 'intelligence_brief', NULL, NULL, 'anthropic', p_model,
    p_prompt_version, p_schema_version, 'brief:' || gen_random_uuid()::text,
    p_input_tokens, p_output_tokens, p_cost_usd, p_latency_ms, p_status, left(p_error, 500), p_payload
  )
  RETURNING id INTO v_run;

  IF p_status <> 'succeeded' THEN
    RETURN v_run;
  END IF;

  IF p_headline IS NULL OR btrim(p_headline) = '' OR p_lead IS NULL OR btrim(p_lead) = '' THEN
    RAISE EXCEPTION 'headline and lead required';
  END IF;
  IF p_scope_label IS NULL OR char_length(btrim(p_scope_label)) < 2 THEN
    RAISE EXCEPTION 'scope label required';
  END IF;
  IF p_period_start IS NULL OR p_period_end IS NULL OR p_period_end < p_period_start THEN
    RAISE EXCEPTION 'invalid period';
  END IF;
  IF p_input_news_ids IS NULL OR cardinality(p_input_news_ids) < 2 OR cardinality(p_input_news_ids) > 8 THEN
    RAISE EXCEPTION 'two to eight news items required';
  END IF;
  IF p_payload IS NULL THEN
    RAISE EXCEPTION 'payload required';
  END IF;
  IF (SELECT count(*) FROM unnest(p_input_news_ids) AS x(id)
        JOIN public.news_items n ON n.id = x.id) <> cardinality(p_input_news_ids) THEN
    RAISE EXCEPTION 'news item not found';
  END IF;

  INSERT INTO public.intelligence_briefs (
    scope_label, period_start, period_end, headline, lead, payload, input_news_ids,
    model, prompt_version, schema_version, ai_run_id, generated_by
  ) VALUES (
    left(btrim(p_scope_label), 120), p_period_start, p_period_end,
    left(btrim(p_headline), 200), left(btrim(p_lead), 800), p_payload, p_input_news_ids,
    p_model, p_prompt_version, p_schema_version, v_run, app.current_user_id()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.record_intelligence_brief(
  text, date, date, text, text, uuid[], jsonb, text, text, text, int, int, numeric, int, public.run_status, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_intelligence_brief(
  text, date, date, text, text, uuid[], jsonb, text, text, text, int, int, numeric, int, public.run_status, text
) TO authenticated;

-- Decisión humana: gestor, nota de al menos 10 caracteres y solo desde borrador.
CREATE OR REPLACE FUNCTION public.review_intelligence_brief(
  p_id uuid,
  p_decision text,
  p_note text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id uuid;
  v_decision public.publication_status;
BEGIN
  IF app.current_user_id() IS NULL OR NOT app.is_manager() THEN
    RAISE EXCEPTION 'only managers can review intelligence briefs';
  END IF;
  IF p_decision NOT IN ('publish', 'reject') THEN
    RAISE EXCEPTION 'invalid decision';
  END IF;
  IF p_note IS NULL OR char_length(btrim(p_note)) < 10 THEN
    RAISE EXCEPTION 'review note must have at least 10 characters';
  END IF;
  v_decision := CASE WHEN p_decision = 'publish' THEN 'published'::public.publication_status
                     ELSE 'rejected'::public.publication_status END;

  UPDATE public.intelligence_briefs
     SET publication_status = v_decision,
         review_notes = left(btrim(p_note), 500)
   WHERE id = p_id AND publication_status = 'draft'
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'brief not found or not in draft';
  END IF;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.review_intelligence_brief(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_intelligence_brief(uuid, text, text) TO authenticated;
