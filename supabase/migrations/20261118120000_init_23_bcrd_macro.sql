-- Migración 23 — Datos de la API BCRD (F-02): variables macro y tasa de cambio.
-- Carga manual asistida (G0 #5): la fuente NO es un conector automático. Un gestor dispara la carga.
-- Cada observación guarda cuándo la vio AviTech por primera vez (first_seen_at) para medir la
-- anticipación frente a la prensa. El dato es del BCRD tal cual (trust_layer 'confirmed');
-- las unidades no las declara la API y quedan NULL hasta verificarlas ([PENDIENTE]).

INSERT INTO public.sources (code, name, base_url, allowed_hosts, access_method, data_format, legal_status, automation_allowed, is_active, terms_url)
VALUES (
  'bcrd_api',
  'BCRD — API de variables macro y tasa de cambio (carga manual)',
  'https://api.bancentral.gov.do/',
  ARRAY['api.bancentral.gov.do'],
  'api',
  'json',
  'pending_review',
  false,
  false,
  'https://apibcrd.bancentral.gov.do/'
)
ON CONFLICT (code) DO NOTHING;

-- Último dato publicado de cada indicador (Monetarias, Inflación, Sector Real, Sector Externo).
-- Una fila por combinación serie + fecha + valor: si el BCRD publica un valor nuevo, aparece una fila nueva.
CREATE TABLE public.macro_observations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id        uuid NOT NULL REFERENCES public.sources(id),
  series_key       text NOT NULL CHECK (btrim(series_key) <> ''),
  group_name       text NOT NULL,
  category_path    text[] NOT NULL DEFAULT '{}',
  indicator        text NOT NULL CHECK (btrim(indicator) <> ''),
  value            numeric NOT NULL,
  as_of            date,
  unit             text,
  observation_key  text NOT NULL,
  data_quality_flags text[] NOT NULL DEFAULT '{}',
  trust_layer      public.trust_layer NOT NULL DEFAULT 'confirmed',
  first_seen_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT macro_observations_uq UNIQUE (source_id, observation_key)
);
CREATE INDEX macro_observations_series_idx ON public.macro_observations (series_key, first_seen_at DESC);
CREATE INDEX macro_observations_seen_idx ON public.macro_observations (last_seen_at DESC);

-- Tasa de cambio oficial diaria (HistoricoTasas).
CREATE TABLE public.exchange_rates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id        uuid NOT NULL REFERENCES public.sources(id),
  rate_date        date NOT NULL,
  currency_id      integer NOT NULL DEFAULT 1,
  buying           numeric NOT NULL CHECK (buying > 0),
  selling          numeric NOT NULL CHECK (selling > 0),
  external_id      bigint,
  trust_layer      public.trust_layer NOT NULL DEFAULT 'confirmed',
  first_seen_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exchange_rates_uq UNIQUE (source_id, currency_id, rate_date)
);
CREATE INDEX exchange_rates_date_idx ON public.exchange_rates (rate_date DESC);

ALTER TABLE public.macro_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY macro_observations_select ON public.macro_observations FOR SELECT TO authenticated USING (true);
CREATE POLICY macro_observations_insert ON public.macro_observations FOR INSERT TO authenticated WITH CHECK (app.is_manager());
CREATE POLICY macro_observations_update ON public.macro_observations FOR UPDATE TO authenticated USING (app.is_manager()) WITH CHECK (app.is_manager());

CREATE POLICY exchange_rates_select ON public.exchange_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY exchange_rates_insert ON public.exchange_rates FOR INSERT TO authenticated WITH CHECK (app.is_manager());
CREATE POLICY exchange_rates_update ON public.exchange_rates FOR UPDATE TO authenticated USING (app.is_manager()) WITH CHECK (app.is_manager());

REVOKE ALL ON public.macro_observations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.exchange_rates FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.macro_observations TO authenticated;
GRANT UPDATE (last_seen_at, data_quality_flags) ON public.macro_observations TO authenticated;
GRANT SELECT, INSERT ON public.exchange_rates TO authenticated;
-- El upsert de PostgREST pone en SET todas las columnas enviadas; first_seen_at nunca se envía y no se concede.
GRANT UPDATE (source_id, currency_id, rate_date, buying, selling, external_id, last_seen_at) ON public.exchange_rates TO authenticated;
GRANT ALL ON public.macro_observations TO service_role;
GRANT ALL ON public.exchange_rates TO service_role;
