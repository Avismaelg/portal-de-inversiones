-- Flujo §13.4 (versión inicial): de una noticia analizada a una oportunidad en BORRADOR.
-- Registra el documento fuente (URL de la noticia, sin texto), crea el acontecimiento (verificación pendiente)
-- y la oportunidad (capa «inferencia»). Publicar sigue bloqueado por enforce_opportunity_publication:
-- exige acontecimiento verificado y evidencia literal, y un gestor humano.
CREATE OR REPLACE FUNCTION public.propose_opportunity_from_news(
  p_news_id uuid, p_type public.opportunity_type, p_title text, p_description text, p_risks text, p_next_step text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_user uuid := app.current_user_id(); v_news public.news_items%ROWTYPE; v_source uuid;
  v_doc uuid; v_event uuid; v_opp uuid; v_hash text;
BEGIN
  IF v_user IS NULL OR NOT app.is_staff() THEN RAISE EXCEPTION 'only staff can propose opportunities'; END IF;
  IF btrim(coalesce(p_title, '')) = '' OR btrim(coalesce(p_description, '')) = '' THEN RAISE EXCEPTION 'title and description are required'; END IF;
  SELECT * INTO v_news FROM public.news_items WHERE id = p_news_id;
  IF v_news.id IS NULL THEN RAISE EXCEPTION 'news not found'; END IF;
  SELECT id INTO v_source FROM public.sources WHERE code = 'news_primary_rss';
  IF v_source IS NULL THEN RAISE EXCEPTION 'source news_primary_rss missing'; END IF;

  -- Documento fuente: solo URL y metadatos (el texto de la institución no se guarda).
  v_hash := encode(extensions.digest(v_news.url, 'sha256'), 'hex');
  SELECT id INTO v_doc FROM public.source_documents WHERE source_id = v_source AND content_hash = v_hash;
  IF v_doc IS NULL THEN
    INSERT INTO public.source_documents (source_id, canonical_url, content_hash, title, published_at, ingest_method, uploaded_by, parse_status)
    VALUES (v_source, v_news.url, v_hash, v_news.title, v_news.published_at, 'manual_upload', v_user, 'unsupported')
    RETURNING id INTO v_doc;
  END IF;

  -- Acontecimiento: uno por noticia; verificación pendiente, borrador.
  SELECT id INTO v_event FROM public.economic_events WHERE dedup_key = encode(extensions.digest('news:' || p_news_id::text, 'sha256'), 'hex');
  IF v_event IS NULL THEN
    INSERT INTO public.economic_events (title, summary, event_kind, primary_source_document_id, published_at, detected_at,
                                        dedup_key, trust_layer, verification_status, publication_status)
    VALUES (v_news.title, v_news.excerpt, 'news_signal', v_doc, v_news.published_at, v_news.detected_at,
            encode(extensions.digest('news:' || p_news_id::text, 'sha256'), 'hex'), 'inference', 'pending', 'draft')
    RETURNING id INTO v_event;
  END IF;

  INSERT INTO public.investment_opportunities (opportunity_type, title, description, originating_event_id, risks, next_steps,
                                               trust_layer, publication_status, dedup_key)
  VALUES (p_type, left(p_title, 200), left(p_description, 2000), v_event,
          CASE WHEN btrim(coalesce(p_risks, '')) = '' THEN '[]'::jsonb ELSE jsonb_build_array(left(p_risks, 500)) END,
          CASE WHEN btrim(coalesce(p_next_step, '')) = '' THEN '[]'::jsonb ELSE jsonb_build_array(left(p_next_step, 500)) END,
          'inference', 'draft', encode(extensions.digest(v_event::text || ':' || lower(btrim(p_title)), 'sha256'), 'hex'))
  RETURNING id INTO v_opp;
  RETURN v_opp;
END $$;

REVOKE ALL ON FUNCTION public.propose_opportunity_from_news(uuid, public.opportunity_type, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.propose_opportunity_from_news(uuid, public.opportunity_type, text, text, text, text) TO authenticated;
