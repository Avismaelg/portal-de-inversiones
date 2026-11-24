-- Migración 28 — Proveedor real en `ai_analysis_runs`.
--
-- Las funciones de registro (`record_ai_run`, `record_extraction_run`, `record_intelligence_brief`)
-- escriben `provider = 'anthropic'`. Durante las pruebas locales con modelos gratuitos de opencode
-- (AI_PROVIDER=opencode) eso dejaría una traza falsa. Este trigger fija el proveedor a partir del
-- modelo, sin redefinir las tres funciones. Solo añade; no cambia filas existentes.

CREATE OR REPLACE FUNCTION app.set_ai_run_provider()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF NEW.model ~ '^opencode(-go)?/' THEN
    NEW.provider := 'opencode';
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION app.set_ai_run_provider() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER ai_runs_provider_from_model
  BEFORE INSERT ON public.ai_analysis_runs
  FOR EACH ROW EXECUTE FUNCTION app.set_ai_run_provider();
