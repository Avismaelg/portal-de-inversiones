-- Análisis profundo: escenarios futuros, cadena de valor, ideas a investigar y qué vigilar.
-- Sigue siendo capa «análisis IA» (inferencia). El texto completo de la fuente NO se guarda: solo se usa al generar.
ALTER TABLE public.news_analyses
  ADD COLUMN scenarios     jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(scenarios) = 'array'),
  ADD COLUMN value_chain   jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(value_chain) = 'array'),
  ADD COLUMN opportunities jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(opportunities) = 'array'),
  ADD COLUMN watch_next    text[] NOT NULL DEFAULT '{}',
  ADD COLUMN used_full_text boolean NOT NULL DEFAULT false;
