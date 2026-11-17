-- Noticias de fuentes primarias (señales, no hechos verificados). Solo titular, extracto breve y enlace.
CREATE TABLE public.news_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key       text NOT NULL,
  source_name      text NOT NULL,
  url              text NOT NULL,
  title            text NOT NULL CHECK (btrim(title) <> ''),
  excerpt          text CHECK (excerpt IS NULL OR char_length(excerpt) <= 400),
  published_at     timestamptz,
  detected_at      timestamptz NOT NULL DEFAULT now(),
  matched_keywords text[] NOT NULL DEFAULT '{}',
  trust_layer      trust_layer NOT NULL DEFAULT 'inference',
  is_demo          boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT news_items_url_uq UNIQUE (url),
  CONSTRAINT news_items_https CHECK (url ~ '^https://')
);
CREATE INDEX news_items_published_idx ON public.news_items (published_at DESC NULLS LAST);
CREATE INDEX news_items_source_idx ON public.news_items (source_key, published_at DESC);

ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY news_items_select ON public.news_items FOR SELECT TO authenticated USING (true);
CREATE POLICY news_items_insert ON public.news_items FOR INSERT TO authenticated WITH CHECK (app.is_staff());

REVOKE ALL ON public.news_items FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.news_items TO authenticated;
GRANT ALL ON public.news_items TO service_role;
