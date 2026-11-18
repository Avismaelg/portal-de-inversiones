-- P2-02b: búsqueda sin distinguir tildes («energia» encuentra «energía»; «Pena» encuentra «Peña»).
-- 1) Extensión unaccent en el esquema extensions.
-- 2) Configuración de texto public.es_unaccent = spanish + unaccent antes del stemmer. Las columnas
--    search_vector pasan a usarla; la app consulta con config 'es_unaccent' (misma normalización).
-- 3) Columna search_plain (minúsculas, sin tildes) en news_items y financial_instruments para el ilike;
--    la app quita las tildes del patrón con la misma regla (src/lib/search.ts, stripAccents).

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE TEXT SEARCH CONFIGURATION public.es_unaccent (COPY = pg_catalog.spanish);
ALTER TEXT SEARCH CONFIGURATION public.es_unaccent
  ALTER MAPPING FOR hword, hword_part, word WITH extensions.unaccent, spanish_stem;

-- unaccent() es STABLE (depende del search_path); con el diccionario explícito es seguro marcarla IMMUTABLE.
CREATE FUNCTION app.immutable_unaccent(text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
SET search_path TO ''
AS $$ SELECT extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

ALTER TABLE public.public_tenders ALTER COLUMN search_vector SET EXPRESSION AS
  (to_tsvector('public.es_unaccent'::regconfig, coalesce(title, '') || ' ' || coalesce(description, '')));
ALTER TABLE public.investment_opportunities ALTER COLUMN search_vector SET EXPRESSION AS
  (to_tsvector('public.es_unaccent'::regconfig, coalesce(title, '') || ' ' || coalesce(description, '')));
ALTER TABLE public.projects ALTER COLUMN search_vector SET EXPRESSION AS
  (to_tsvector('public.es_unaccent'::regconfig, coalesce(name, '') || ' ' || coalesce(description, '')));
ALTER TABLE public.economic_events ALTER COLUMN search_vector SET EXPRESSION AS
  (to_tsvector('public.es_unaccent'::regconfig, coalesce(title, '') || ' ' || coalesce(summary, '')));
ALTER TABLE public.source_documents ALTER COLUMN search_vector SET EXPRESSION AS
  (to_tsvector('public.es_unaccent'::regconfig, coalesce(title, '') || ' ' || coalesce(extracted_text, '')));

ALTER TABLE public.news_items ADD COLUMN search_plain text GENERATED ALWAYS AS
  (lower(app.immutable_unaccent(coalesce(title, '') || ' ' || coalesce(excerpt, '')))) STORED;
ALTER TABLE public.financial_instruments ADD COLUMN search_plain text GENERATED ALWAYS AS
  (lower(app.immutable_unaccent(coalesce(name, '') || ' ' || coalesce(isin, '')))) STORED;
