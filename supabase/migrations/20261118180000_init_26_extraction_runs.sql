-- Migración 26 — Ejecuciones del agente de extracción con salida estructurada.
--
-- Motivo: `record_ai_run` (migración 18) no guarda `output` y fija `agent = 'financial_analysis'`,
-- lo que sería incorrecto para el agente Extraction. En vez de cambiar una firma ya usada por
-- noticias y macro, se añade una función específica que registra:
--   agent = 'extraction', task = 'news_extraction', subject_type = 'news',
--   output = candidato ya filtrado por el verificador literal (nunca el texto de la fuente).
--
-- La función es SECURITY DEFINER y exige staff autenticado; el cliente no escribe directo en la tabla.

CREATE OR REPLACE FUNCTION public.record_extraction_run(
  p_subject_id uuid,
  p_model text,
  p_prompt_version text,
  p_schema_version text,
  p_input_tokens int,
  p_output_tokens int,
  p_cost_usd numeric,
  p_latency_ms int,
  p_status public.run_status,
  p_error text,
  p_output jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF app.current_user_id() IS NULL OR NOT app.is_staff() THEN
    RAISE EXCEPTION 'only staff can record an AI run';
  END IF;
  IF p_subject_id IS NULL THEN
    RAISE EXCEPTION 'subject required';
  END IF;
  IF p_model IS NULL OR btrim(p_model) = '' THEN
    RAISE EXCEPTION 'model required';
  END IF;
  -- La salida es un candidato pequeño; un objeto mayor indica un error del llamador.
  IF p_output IS NOT NULL AND octet_length(p_output::text) > 262144 THEN
    RAISE EXCEPTION 'output too large';
  END IF;

  INSERT INTO public.ai_analysis_runs (
    agent, task, subject_type, subject_id, provider, model, prompt_version, schema_version,
    idempotency_key, input_tokens, output_tokens, cost_usd, latency_ms, status, error, output
  ) VALUES (
    'extraction', 'news_extraction', 'news', p_subject_id, 'anthropic', p_model, p_prompt_version, p_schema_version,
    'run:' || gen_random_uuid()::text, p_input_tokens, p_output_tokens, p_cost_usd, p_latency_ms, p_status,
    left(p_error, 500), p_output
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.record_extraction_run(
  uuid, text, text, text, int, int, numeric, int, public.run_status, text, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_extraction_run(
  uuid, text, text, text, int, int, numeric, int, public.run_status, text, jsonb
) TO authenticated;

-- Lectura de «la última extracción de esta noticia»: el índice existente no ordena por fecha.
CREATE INDEX IF NOT EXISTS ai_runs_subject_created_idx
  ON public.ai_analysis_runs (subject_type, subject_id, created_at DESC);
