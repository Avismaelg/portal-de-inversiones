-- Análisis de impacto generado por IA sobre una noticia (capa «análisis IA», nunca «confirmado»).
-- La cita debe ser literal del titular/extracto: `quote_verified` lo comprueba el servidor.
CREATE TABLE public.news_analyses (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id                uuid NOT NULL REFERENCES public.news_items(id) ON DELETE CASCADE,
  model                  text NOT NULL,
  summary                text NOT NULL CHECK (btrim(summary) <> ''),
  impact_direction       text NOT NULL CHECK (impact_direction IN ('positive','negative','neutral','mixed','unclear')),
  horizon                text NOT NULL CHECK (horizon IN ('short','medium','long','unclear')),
  sectors                text[] NOT NULL DEFAULT '{}',
  risks                  text[] NOT NULL DEFAULT '{}',
  confidence             smallint NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  confidence_explanation text NOT NULL CHECK (btrim(confidence_explanation) <> ''),
  evidence_quote         text,
  quote_verified         boolean NOT NULL DEFAULT false,
  trust_layer            trust_layer NOT NULL DEFAULT 'ai_analysis' CHECK (trust_layer = 'ai_analysis'),
  input_tokens           integer,
  output_tokens          integer,
  created_by             uuid REFERENCES public.users(id),
  created_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT news_analyses_news_uq UNIQUE (news_id)
);

ALTER TABLE public.news_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY news_analyses_select ON public.news_analyses FOR SELECT TO authenticated USING (true);
CREATE POLICY news_analyses_insert ON public.news_analyses FOR INSERT TO authenticated WITH CHECK (app.is_staff());
CREATE POLICY news_analyses_update ON public.news_analyses FOR UPDATE TO authenticated
  USING (app.is_staff()) WITH CHECK (app.is_staff());

REVOKE ALL ON public.news_analyses FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.news_analyses TO authenticated;
GRANT ALL ON public.news_analyses TO service_role;
