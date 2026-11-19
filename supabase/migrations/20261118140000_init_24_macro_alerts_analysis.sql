-- Migración 24 — Alertas tempranas y análisis de impacto sobre los datos del BCRD.
-- 1) Unidades verificadas en https://www.bancentral.gov.do/ (bloque «Variables Macroeconómicas», 2026-11-18).
-- 2) Alertas macro por usuario: dato nuevo, cambio de dirección y movimiento diario del dólar (umbral
--    definido por el propio usuario; sin valor por defecto).
-- 3) Análisis de impacto con IA (capa 'ai_analysis', nunca dato confirmado).

ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'macro';

-- 1) Unidades -----------------------------------------------------------------
GRANT UPDATE (unit) ON public.macro_observations TO authenticated;

UPDATE public.macro_observations SET
  unit = CASE
    WHEN series_key LIKE 'Inflación › %' THEN 'variación %'
    WHEN series_key LIKE 'Monetarias › Tasas de interés › %' THEN '% (promedio ponderado)'
    WHEN series_key LIKE 'Monetarias › Prestamos privados › %' THEN 'variación % interanual'
    WHEN series_key LIKE 'Sector Real › %' THEN 'variación % interanual'
    WHEN series_key LIKE 'Sector Externo › Reservas Internacionales › %' THEN 'US$ millones'
    WHEN series_key LIKE 'Sector Externo › Cuentas Corrientes › %' THEN '% del PIB'
    ELSE unit END,
  data_quality_flags = CASE
    WHEN series_key LIKE 'Sector Externo › Tasas de cambio › %' THEN data_quality_flags
    ELSE array_remove(data_quality_flags, 'unit_unknown') END;

-- 2) Alertas macro ------------------------------------------------------------
ALTER TABLE public.user_alert_preferences
  ADD COLUMN macro_new_data     boolean NOT NULL DEFAULT false,
  ADD COLUMN macro_trend_change boolean NOT NULL DEFAULT false,
  ADD COLUMN fx_daily_move_pct  numeric CHECK (fx_daily_move_pct IS NULL OR (fx_daily_move_pct > 0 AND fx_daily_move_pct <= 20));

-- Una alerta debe vigilar algo: palabras clave o alguna condición macro.
ALTER TABLE public.user_alert_preferences
  ADD CONSTRAINT user_alert_preferences_has_target CHECK (
    cardinality(keywords) > 0 OR macro_new_data OR macro_trend_change OR fx_daily_move_pct IS NOT NULL
  ) NOT VALID;

-- push_my_notifications acepta además entidades 'macro' (fila de macro_observations o exchange_rates).
-- dedup_key admite un sufijo de motivo para que un mismo dato pueda avisar por condiciones distintas.
CREATE OR REPLACE FUNCTION public.push_my_notifications(p_items jsonb) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_user uuid := app.current_user_id(); v_item jsonb; v_type public.entity_type; v_id uuid; v_n int := 0; v_rows int; v_kind text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) > 200 THEN RAISE EXCEPTION 'invalid items'; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_type := (v_item ->> 'entity_type')::public.entity_type;
    v_id := (v_item ->> 'entity_id')::uuid;
    v_kind := coalesce(nullif(regexp_replace(coalesce(v_item ->> 'kind', ''), '[^a-z_]', '', 'g'), ''), NULL);
    -- Solo entidades que el usuario puede ver.
    IF v_type = 'news' AND NOT EXISTS (SELECT 1 FROM public.news_items WHERE id = v_id) THEN CONTINUE; END IF;
    IF v_type = 'tender' AND NOT EXISTS (
      SELECT 1 FROM public.public_tenders WHERE id = v_id AND (publication_status = 'published' OR app.is_staff())
    ) THEN CONTINUE; END IF;
    IF v_type::text = 'macro' AND NOT EXISTS (SELECT 1 FROM public.macro_observations WHERE id = v_id)
       AND NOT EXISTS (SELECT 1 FROM public.exchange_rates WHERE id = v_id) THEN CONTINUE; END IF;
    IF v_type::text NOT IN ('news', 'tender', 'macro') THEN CONTINUE; END IF;
    INSERT INTO public.notifications (user_id, preference_id, entity_type, entity_id, reason, title, priority, channel, status, dedup_key, delivered_at)
    SELECT v_user, p.id, v_type, v_id, left(v_item ->> 'reason', 300), left(v_item ->> 'title', 300),
           least(greatest(coalesce((v_item ->> 'priority')::int, 3), 1), 5), 'in_app', 'delivered',
           v_type::text || ':' || v_id::text || coalesce(':' || v_kind, ''), now()
      FROM (SELECT (v_item ->> 'preference_id')::uuid AS pid) x
      LEFT JOIN public.user_alert_preferences p ON p.id = x.pid AND p.user_id = v_user
    ON CONFLICT (user_id, channel, dedup_key) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_n := v_n + v_rows;
  END LOOP;
  RETURN v_n;
END $$;
REVOKE ALL ON FUNCTION public.push_my_notifications(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.push_my_notifications(jsonb) TO authenticated;

-- 3) Análisis de impacto macro (IA) ------------------------------------------
CREATE TABLE public.macro_analyses (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model                  text NOT NULL,
  snapshot               jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),  -- datos del BCRD enviados al modelo
  summary                text NOT NULL CHECK (btrim(summary) <> ''),
  impact_direction       text NOT NULL CHECK (impact_direction IN ('positive','negative','neutral','mixed','unclear')),
  horizon                text NOT NULL CHECK (horizon IN ('short','medium','long','unclear')),
  sectors                text[] NOT NULL DEFAULT '{}',
  risks                  text[] NOT NULL DEFAULT '{}',
  scenarios              jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(scenarios) = 'array'),
  value_chain            jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(value_chain) = 'array'),
  opportunities          jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(opportunities) = 'array'),
  watch_next             text[] NOT NULL DEFAULT '{}',
  confidence             smallint NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  confidence_explanation text NOT NULL CHECK (btrim(confidence_explanation) <> ''),
  evidence_quote         text,
  quote_verified         boolean NOT NULL DEFAULT false,
  trust_layer            public.trust_layer NOT NULL DEFAULT 'ai_analysis' CHECK (trust_layer = 'ai_analysis'),
  input_tokens           integer,
  output_tokens          integer,
  ai_run_id              uuid REFERENCES public.ai_analysis_runs(id),
  created_by             uuid REFERENCES public.users(id),
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX macro_analyses_created_idx ON public.macro_analyses (created_at DESC);

ALTER TABLE public.macro_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY macro_analyses_select ON public.macro_analyses FOR SELECT TO authenticated USING (true);
CREATE POLICY macro_analyses_insert ON public.macro_analyses FOR INSERT TO authenticated WITH CHECK (app.is_staff());
REVOKE ALL ON public.macro_analyses FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.macro_analyses TO authenticated;
GRANT ALL ON public.macro_analyses TO service_role;
