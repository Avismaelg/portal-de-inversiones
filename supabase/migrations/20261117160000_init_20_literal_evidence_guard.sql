-- Evidencia literal para publicar oportunidades (flujo §13.4, segunda parte).
-- Hallazgo: un usuario autenticado con rol de staff podía insertar evidence con literal_verified=true
-- sin que nada comprobara la cita. Ahora, desde la API (rol authenticated/anon), literal_verified=true
-- solo puede escribirlo la función add_literal_evidence (SECURITY DEFINER), que exige un gestor.
-- La comprobación literal la hace el servidor de la app contra el texto de la fuente leído en ese momento
-- (el texto de noticias no se almacena); la función registra quién lo atestigua.
-- Las cargas de confianza (seed SQL, migraciones, service role) no pasan por authenticated y no cambian.

CREATE OR REPLACE FUNCTION app.guard_evidence_literal() RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER          -- a propósito: current_user debe ser el rol del llamador, no el dueño
SET search_path TO ''
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;           -- seed, migraciones o función SECURITY DEFINER
  END IF;
  IF TG_OP = 'INSERT' AND NEW.literal_verified THEN
    RAISE EXCEPTION 'literal_verified can only be set through add_literal_evidence';
  END IF;
  IF TG_OP = 'UPDATE' AND (
       NEW.literal_verified IS DISTINCT FROM OLD.literal_verified
       OR NEW.quote IS DISTINCT FROM OLD.quote
       OR NEW.quote_hash IS DISTINCT FROM OLD.quote_hash
       OR NEW.source_document_id IS DISTINCT FROM OLD.source_document_id
       OR NEW.char_start IS DISTINCT FROM OLD.char_start
       OR NEW.char_end IS DISTINCT FROM OLD.char_end) THEN
    RAISE EXCEPTION 'evidence quote and verification are immutable from the API';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS evidence_literal_guard ON public.evidence;
CREATE TRIGGER evidence_literal_guard
  BEFORE INSERT OR UPDATE ON public.evidence
  FOR EACH ROW EXECUTE FUNCTION app.guard_evidence_literal();

-- Un gestor adjunta a una oportunidad una cita que el servidor ya comprobó literalmente
-- contra el documento fuente del acontecimiento de origen.
CREATE OR REPLACE FUNCTION public.add_literal_evidence(
  p_opportunity_id uuid, p_quote text, p_char_start integer, p_char_end integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_doc uuid; v_status public.publication_status; v_id uuid; v_quote text := btrim(coalesce(p_quote, ''));
BEGIN
  IF app.current_user_id() IS NULL OR NOT app.is_manager() THEN
    RAISE EXCEPTION 'only a manager can attest literal evidence';
  END IF;
  IF length(v_quote) < 20 OR length(v_quote) > 1000 THEN
    RAISE EXCEPTION 'quote must be between 20 and 1000 characters';
  END IF;
  IF p_char_start IS NULL OR p_char_end IS NULL OR p_char_start < 0 OR p_char_end <= p_char_start THEN
    RAISE EXCEPTION 'quote offsets are required';
  END IF;
  SELECT e.primary_source_document_id, o.publication_status INTO v_doc, v_status
    FROM public.investment_opportunities o
    JOIN public.economic_events e ON e.id = o.originating_event_id
   WHERE o.id = p_opportunity_id;
  IF v_doc IS NULL THEN RAISE EXCEPTION 'opportunity not found'; END IF;
  IF v_status = 'published' THEN RAISE EXCEPTION 'opportunity already published'; END IF;

  INSERT INTO public.evidence (opportunity_id, source_document_id, claim_field, quote, quote_hash,
                               page_or_section, char_start, char_end, literal_verified)
  VALUES (p_opportunity_id, v_doc, 'originating_event', v_quote,
          encode(extensions.digest(v_quote, 'sha256'), 'hex'),
          'texto de la fuente (espacios normalizados)', p_char_start, p_char_end, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'duplicate evidence'; END IF;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.add_literal_evidence(uuid, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_literal_evidence(uuid, text, integer, integer) TO authenticated;
