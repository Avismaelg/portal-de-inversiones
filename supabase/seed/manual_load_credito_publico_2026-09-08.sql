-- =============================================================================
-- Carga MANUAL de un documento real de Crédito Público (G0 #7: Crédito Público entra
-- por carga manual hasta que el abogado autorice automatizarlo — G0 #5).
--
-- Documento: "Resultados de la Subasta Extraordinaria Competitiva a Precio Único",
--   subasta del 2026-09-08, bono MH2-2041 (ISIN DO1005254219).
-- URL oficial: https://www.creditopublico.gob.do/Content/subastas/resultados/2026/
--   09Subastas - Resultado de subasta extraordinaria competitiva a precio único 8 de Septiembre.pdf
-- Descargado a mano el 2026-11-15 (1 petición); SHA-256 calculado sobre los bytes recibidos.
-- Copia local fuera de OneDrive: C:\Users\User\.portal-docs\credito_publico\ (NO está en el repositorio:
--   la fuente no declara licencia de reutilización; redistribution_allowed = false).
--
-- REQUISITO: debe existir un usuario `platform_admin` activo: es quien figura como uploaded_by
-- (el esquema exige un actor humano en toda carga manual). Si no existe, el script falla.
-- Entidades creadas en estado 'draft': NO son visibles para los lectores hasta que una persona las publique.
-- Idempotencia: si el documento ya existe (mismo source_id + content_hash) el script no hace nada.
-- Todos los valores salen del PDF; el cupón (12.0000 %) NO se carga porque el esquema no tiene un
-- tipo de tasa 'cupón' (rate_kind = indicative | awarded | effective): hueco del modelo anotado en MODELO-DATOS §18.
-- =============================================================================
DO $seed$
DECLARE
  v_admin  uuid; v_src uuid; v_issuer uuid; v_doc uuid; v_inst uuid; v_auc uuid;
  v_hash   text := 'cb96e9d4b15e3a176d1b780fcd4bc5f121ce47cad2d29f5617d25b09bc9522e6';
  v_text   text := $t$Fecha de Subasta:
martes, 08 de septiembre de 2026
Fecha de Liquidación:
viernes, 11 de septiembre de 2026
ISIN
Bono
Fecha de Vencimiento
Tasa Cupón
Monto Ofertado
Valor Nominal
Precio Promedio Ponderado
Tasa Promedio Ponderada
Valor Nominal
Precio de
Adjudicación
Tasa de
Adjudicación
Valor Nominal
Precio Promedio
Ponderado
Tasa Promedio
Ponderada
DO1005254219
MH2-2041
29 de mayo de 2041
12.0000%
RD$20,000,000,000
RD$74,118,700,000
112.8239%
10.3090%
RD$20,000,000,000
116.1220%
9.9000%
RD$54,118,700,000
111.0271%
10.5273%
RD$20,000,000,000
RD$74,118,700,000
RD$20,000,000,000
RD$54,118,700,000
Ofertas Adjudicadas
Ofertas Rechazadas
Total
Ofertas Recibidas
DIRECCIÓN GENERAL DE CRÉDITO PÚBLICO
MINISTERIO DE HACIENDA Y ECONOMÍA
REPÚBLICA DOMINICANA
Resultados de la Subasta Extraordinaria Competitiva a Precio Único
(En pesos dominicanos)
Subasta
$t$;
  v_n int;
BEGIN
  SELECT id INTO v_admin FROM public.users WHERE role = 'platform_admin' AND is_active AND deleted_at IS NULL ORDER BY created_at LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Falta un usuario platform_admin activo (uploaded_by). Regístrese y asígnese el rol antes de cargar.';
  END IF;
  SELECT id INTO v_src FROM public.sources WHERE code = 'credito_publico';
  IF v_src IS NULL THEN RAISE EXCEPTION 'Falta la fuente credito_publico'; END IF;
  SELECT id INTO v_issuer FROM public.organizations WHERE legal_name LIKE 'Ministerio de Hacienda%' AND org_type = 'government' ORDER BY created_at LIMIT 1;
  IF v_issuer IS NULL THEN RAISE EXCEPTION 'Falta la organización emisora (Hacienda)'; END IF;

  IF EXISTS (SELECT 1 FROM public.source_documents WHERE source_id = v_src AND content_hash = v_hash) THEN
    RAISE NOTICE 'El documento ya estaba cargado; no se hace nada.';
    RETURN;
  END IF;

  INSERT INTO public.source_documents
    (source_id, external_id, canonical_url, content_hash, mime_type, byte_size, ingest_method, uploaded_by,
     title, language, terms_version, redistribution_allowed, parse_status, extracted_text)
  VALUES
    (v_src, 'resultados/2026/subasta-extraordinaria-competitiva-2026-09-08',
     'https://www.creditopublico.gob.do/Content/subastas/resultados/2026/09Subastas%20-%20Resultado%20de%20subasta%20extraordinaria%20competitiva%20a%20precio%20%C3%BAnico%208%20de%20Septiembre.pdf',
     v_hash, 'application/pdf', 197927, 'manual_upload', v_admin,
     'Resultados de la Subasta Extraordinaria Competitiva a Precio Único — 8 de septiembre de 2026',
     'es', 'Términos de uso consultados el 2026-11-15; sin licencia de reutilización explícita', false, 'parsed', v_text)
  RETURNING id INTO v_doc;

  INSERT INTO public.financial_instruments
    (issuer_org_id, instrument_type, name, isin, currency, maturity_date, availability, official_document_id,
     trust_layer, publication_status, dedup_key)
  VALUES
    (v_issuer, 'treasury_bond', 'MH2-2041', 'DO1005254219', 'DOP', DATE '2041-05-29', 'not_confirmed', v_doc,
     'confirmed', 'draft', encode(extensions.digest('DO1005254219', 'sha256'), 'hex'))
  RETURNING id INTO v_inst;

  INSERT INTO public.instrument_auctions
    (instrument_id, auction_type, auction_date, settlement_date, offered_amount, awarded_amount, currency,
     rate_kind, cutoff_rate, source_document_id, external_id, trust_layer, publication_status)
  VALUES
    (v_inst, 'extraordinary', DATE '2026-09-08', DATE '2026-09-11', 20000000000, 20000000000, 'DOP',
     'awarded', 9.9, v_doc, 'subasta-extraordinaria-competitiva-2026-09-08', 'confirmed', 'draft')
  RETURNING id INTO v_auc;

  -- Evidencia: cita literal comprobada contra el texto almacenado (literal_verified = la cita aparece).
  INSERT INTO public.evidence (instrument_id, source_document_id, claim_field, quote, quote_hash, char_start, char_end, literal_verified)
  SELECT v_inst, v_doc, c.field, c.quote, encode(extensions.digest(c.quote, 'sha256'), 'hex'),
         position(c.quote IN v_text) - 1, position(c.quote IN v_text) - 1 + length(c.quote), position(c.quote IN v_text) > 0
    FROM (VALUES ('isin', 'DO1005254219'), ('maturity_date', '29 de mayo de 2041')) AS c(field, quote);

  INSERT INTO public.evidence (auction_id, source_document_id, claim_field, quote, quote_hash, char_start, char_end, literal_verified)
  SELECT v_auc, v_doc, c.field, c.quote, encode(extensions.digest(c.quote, 'sha256'), 'hex'),
         position(c.quote IN v_text) - 1, position(c.quote IN v_text) - 1 + length(c.quote), position(c.quote IN v_text) > 0
    FROM (VALUES ('cutoff_rate', '9.9000%'), ('offered_amount', 'RD$20,000,000,000'),
                 ('settlement_date', 'viernes, 11 de septiembre de 2026'), ('auction_date', 'martes, 08 de septiembre de 2026')) AS c(field, quote);

  SELECT count(*) INTO v_n FROM public.evidence WHERE source_document_id = v_doc AND NOT literal_verified;
  IF v_n > 0 THEN RAISE EXCEPTION '% cita(s) no aparecen literalmente en el texto', v_n; END IF;

  IF current_setting('app.seed_dry_run', true) = 'on' THEN
    RAISE EXCEPTION 'DRY RUN (revertido): doc=% instrumento=% subasta=% evidencias=%',
      v_doc, v_inst, v_auc, (SELECT count(*) FROM public.evidence WHERE source_document_id = v_doc);
  END IF;
END
$seed$;
