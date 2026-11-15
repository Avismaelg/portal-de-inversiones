SET search_path = public, extensions;
CREATE TABLE projects (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL CHECK (btrim(name) <> ''),
  normalized_name    text GENERATED ALWAYS AS
                       (lower(btrim(regexp_replace(name, '\s+', ' ', 'g')))) STORED,
  promoter_org_id    uuid REFERENCES organizations(id),
  responsible_org_id uuid REFERENCES organizations(id),       -- institución responsable
  sector_id          uuid REFERENCES sectors(id),
  location_id        uuid REFERENCES geographic_locations(id),
  description        text,
  announced_amount   numeric(20,2) CHECK (announced_amount IS NULL OR announced_amount >= 0),
  currency           char(3) CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  amount_reference_year smallint CHECK (amount_reference_year IS NULL OR amount_reference_year BETWEEN 1990 AND 2100),
  amount_source_document_id uuid REFERENCES source_documents(id),
  status             project_status NOT NULL DEFAULT 'unknown',
  status_changed_at  timestamptz,
  authorization_date date,
  official_document_id uuid REFERENCES source_documents(id),
  primary_source_document_id uuid REFERENCES source_documents(id),
  trust_layer        trust_layer NOT NULL DEFAULT 'ai_analysis',
  publication_status publication_status NOT NULL DEFAULT 'draft',
  dedup_key          char(64) NOT NULL,
  merged_into_id     uuid REFERENCES projects(id),
  is_demo            boolean NOT NULL DEFAULT false,
  search_vector      tsvector GENERATED ALWAYS AS
                       (to_tsvector('spanish'::regconfig, coalesce(name, '') || ' ' || coalesce(description, ''))) STORED,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (merged_into_id IS NULL OR merged_into_id <> id),
  CONSTRAINT projects_amount_needs_currency CHECK (announced_amount IS NULL OR currency IS NOT NULL),
  CONSTRAINT projects_amount_needs_source   CHECK (announced_amount IS NULL OR amount_source_document_id IS NOT NULL),
  CONSTRAINT projects_approval_needs_document CHECK (
    status NOT IN ('permit_approved', 'under_construction', 'operating')
    OR official_document_id IS NOT NULL
  )
);
CREATE UNIQUE INDEX projects_dedup_uq ON projects (dedup_key) WHERE merged_into_id IS NULL;
CREATE INDEX projects_fts_idx ON projects USING gin (search_vector);
CREATE INDEX projects_name_trgm ON projects USING gin (normalized_name gin_trgm_ops);
CREATE INDEX projects_filter_idx ON projects (status, sector_id, location_id) WHERE publication_status = 'published';
CREATE INDEX projects_promoter_idx ON projects (promoter_org_id);
CREATE TRIGGER projects_touch BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TABLE permits (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         uuid REFERENCES projects(id),            -- puede existir antes de vincularse
  source_id          uuid REFERENCES sources(id),
  external_id        text,
  permit_type        permit_type NOT NULL,
  category           text,                    -- p. ej. categoría ambiental; valores según la fuente [PENDIENTE]
  file_number        text,                    -- expediente, solo si la fuente lo publica
  status             permit_status NOT NULL DEFAULT 'unknown',
  issuing_org_id     uuid REFERENCES organizations(id),
  applicant_org_id   uuid REFERENCES organizations(id),
  requested_at       date,
  decided_at         date,
  valid_until        date,
  official_document_id uuid REFERENCES source_documents(id),
  trust_layer        trust_layer NOT NULL DEFAULT 'ai_analysis',
  publication_status publication_status NOT NULL DEFAULT 'draft',
  dedup_key          char(64) NOT NULL,
  is_demo            boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT permits_approved_needs_document CHECK (status <> 'approved' OR official_document_id IS NOT NULL),
  CHECK (valid_until IS NULL OR decided_at IS NULL OR valid_until >= decided_at)
);
CREATE UNIQUE INDEX permits_dedup_uq ON permits (dedup_key);
CREATE UNIQUE INDEX permits_source_ext_uq ON permits (source_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX permits_project_idx ON permits (project_id);
CREATE INDEX permits_filter_idx ON permits (permit_type, status) WHERE publication_status = 'published';
CREATE TRIGGER permits_touch BEFORE UPDATE ON permits
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TABLE public_tenders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id          uuid NOT NULL REFERENCES sources(id),
  external_id        text NOT NULL,           -- OCID u otro identificador del proceso
  process_code       text,
  title              text NOT NULL,
  description        text,
  buyer_org_id       uuid REFERENCES organizations(id),
  sector_id          uuid REFERENCES sectors(id),
  location_id        uuid REFERENCES geographic_locations(id),
  procurement_method text,
  status             tender_status NOT NULL DEFAULT 'unknown',
  published_at       timestamptz,
  deadline_at        timestamptz,             -- se guarda en UTC; se muestra con zona (RF-D-02)
  timezone_assumed   boolean NOT NULL DEFAULT false,  -- true si published_at/deadline_at no traían zona (Ronda 2); la UI debe avisarlo
  budget_amount      numeric(20,2) CHECK (budget_amount IS NULL OR budget_amount >= 0),
  budget_currency    char(3) CHECK (budget_currency IS NULL OR budget_currency ~ '^[A-Z]{3}$'),
  official_document_id uuid REFERENCES source_documents(id),
  data_quality_flags text[] NOT NULL DEFAULT '{}',   -- la fuente tiene inconsistencias conocidas
  trust_layer        trust_layer NOT NULL DEFAULT 'confirmed',
  publication_status publication_status NOT NULL DEFAULT 'published',
  is_demo            boolean NOT NULL DEFAULT false,
  search_vector      tsvector GENERATED ALWAYS AS
                       (to_tsvector('spanish'::regconfig, coalesce(title, '') || ' ' || coalesce(description, ''))) STORED,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_tenders_natural_uq UNIQUE (source_id, external_id),
  CONSTRAINT tenders_budget_needs_currency CHECK (budget_amount IS NULL OR budget_currency IS NOT NULL)
);
CREATE INDEX public_tenders_deadline_idx ON public_tenders (deadline_at) WHERE status = 'open';
CREATE INDEX public_tenders_fts_idx ON public_tenders USING gin (search_vector);
CREATE INDEX public_tenders_buyer_idx ON public_tenders (buyer_org_id);
CREATE INDEX public_tenders_sector_idx ON public_tenders (sector_id, published_at DESC);
CREATE TRIGGER public_tenders_touch BEFORE UPDATE ON public_tenders
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TABLE contracts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id          uuid NOT NULL REFERENCES sources(id),
  external_id        text NOT NULL,
  tender_id          uuid REFERENCES public_tenders(id),
  supplier_org_id    uuid REFERENCES organizations(id),
  buyer_org_id       uuid REFERENCES organizations(id),
  title              text,
  awarded_amount     numeric(20,2) CHECK (awarded_amount IS NULL OR awarded_amount >= 0),
  currency           char(3) CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  awarded_at         date,
  start_date         date,
  end_date           date,
  status             text,
  official_document_id uuid REFERENCES source_documents(id),
  data_quality_flags text[] NOT NULL DEFAULT '{}',
  trust_layer        trust_layer NOT NULL DEFAULT 'confirmed',
  publication_status publication_status NOT NULL DEFAULT 'published',
  is_demo            boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contracts_natural_uq UNIQUE (source_id, external_id),
  CONSTRAINT contracts_amount_needs_currency CHECK (awarded_amount IS NULL OR currency IS NOT NULL)
);
CREATE INDEX contracts_tender_idx ON contracts (tender_id);
CREATE INDEX contracts_supplier_idx ON contracts (supplier_org_id);
CREATE TRIGGER contracts_touch BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TABLE financial_instruments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_org_id      uuid NOT NULL REFERENCES organizations(id),
  instrument_type    instrument_type NOT NULL,
  name               text NOT NULL,
  isin               text CHECK (isin IS NULL OR isin ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$'),
  currency           char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  issue_date         date,
  maturity_date      date,
  coupon_rate        numeric(9,6) CHECK (coupon_rate IS NULL OR (coupon_rate >= 0 AND coupon_rate < 1000)),
  rate_kind          rate_kind,               -- naturaleza de coupon_rate si existe
  rate_basis         text,                    -- convención (30/360, etc.) [PENDIENTE SRS]
  availability       availability_status NOT NULL DEFAULT 'not_confirmed',  -- RF-C-12
  participation_url  text,
  participation_notes text,
  official_document_id uuid REFERENCES source_documents(id),
  trust_layer        trust_layer NOT NULL DEFAULT 'confirmed',
  publication_status publication_status NOT NULL DEFAULT 'draft',
  dedup_key          char(64) NOT NULL,
  is_demo            boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (maturity_date IS NULL OR issue_date IS NULL OR maturity_date >= issue_date),
  CHECK (coupon_rate IS NULL OR rate_kind IS NOT NULL),
  CHECK (availability <> 'confirmed_by_source' OR official_document_id IS NOT NULL)
);
CREATE UNIQUE INDEX financial_instruments_dedup_uq ON financial_instruments (dedup_key);
CREATE UNIQUE INDEX financial_instruments_isin_uq ON financial_instruments (isin) WHERE isin IS NOT NULL;
CREATE INDEX financial_instruments_maturity_idx ON financial_instruments (maturity_date);
CREATE INDEX financial_instruments_issuer_idx ON financial_instruments (issuer_org_id);
CREATE TRIGGER financial_instruments_touch BEFORE UPDATE ON financial_instruments
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TABLE instrument_auctions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id      uuid NOT NULL REFERENCES financial_instruments(id),
  auction_type       auction_type NOT NULL,
  auction_date       date NOT NULL,
  settlement_date    date,
  offered_amount     numeric(20,2) CHECK (offered_amount IS NULL OR offered_amount >= 0),
  awarded_amount     numeric(20,2) CHECK (awarded_amount IS NULL OR awarded_amount >= 0),
  currency           char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  rate_kind          rate_kind NOT NULL,
  cutoff_rate        numeric(9,6) CHECK (cutoff_rate IS NULL OR (cutoff_rate >= 0 AND cutoff_rate < 1000)),
  weighted_avg_rate  numeric(9,6) CHECK (weighted_avg_rate IS NULL OR (weighted_avg_rate >= 0 AND weighted_avg_rate < 1000)),
  source_document_id uuid NOT NULL REFERENCES source_documents(id),   -- RN-06: toda cifra con cita
  external_id        text,
  trust_layer        trust_layer NOT NULL DEFAULT 'confirmed',
  publication_status publication_status NOT NULL DEFAULT 'draft',
  is_demo            boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT instrument_auctions_natural_uq UNIQUE (instrument_id, auction_type, auction_date, rate_kind),
  CHECK (cutoff_rate IS NULL OR rate_kind = 'awarded')
);
CREATE INDEX instrument_auctions_date_idx ON instrument_auctions (auction_date DESC);
CREATE INDEX instrument_auctions_inst_idx ON instrument_auctions (instrument_id, auction_date DESC);
CREATE TRIGGER instrument_auctions_touch BEFORE UPDATE ON instrument_auctions
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TABLE investment_opportunities (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_type   opportunity_type NOT NULL,
  title              text NOT NULL CHECK (btrim(title) <> ''),
  description        text NOT NULL,
  originating_event_id uuid NOT NULL REFERENCES economic_events(id),   -- hecho que la origina (C-08)
  sector_id          uuid REFERENCES sectors(id),
  location_id        uuid REFERENCES geographic_locations(id),
  estimated_capital  numeric(20,2) CHECK (estimated_capital IS NULL OR estimated_capital >= 0),
  capital_currency   char(3) CHECK (capital_currency IS NULL OR capital_currency ~ '^[A-Z]{3}$'),
  capital_basis      text,                    -- base justificable de la cifra
  participation_requirements text,
  risks              jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(risks) = 'array'),
  horizon_value      integer CHECK (horizon_value IS NULL OR horizon_value > 0),
  horizon_unit       horizon_unit,
  confidence         smallint CHECK (confidence BETWEEN 0 AND 100),   -- no es probabilidad de éxito (RF-F-06)
  confidence_explanation text,
  next_steps         jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(next_steps) = 'array'),
  trust_layer        trust_layer NOT NULL DEFAULT 'inference',
  publication_status publication_status NOT NULL DEFAULT 'draft',
  reviewed_by        uuid REFERENCES users(id) ON DELETE RESTRICT,  -- staff-only (B-018)
  reviewed_at        timestamptz,
  review_notes       text,                    -- staff-only (B-018)
  publisher_role     user_role,               -- rol del publicador; público, sin identidad (B-018)
  published_at       timestamptz,
  version            integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  supersedes_id      uuid REFERENCES investment_opportunities(id),
  ai_run_id          uuid REFERENCES ai_analysis_runs(id),
  dedup_key          char(64) NOT NULL,
  is_demo            boolean NOT NULL DEFAULT false,
  search_vector      tsvector GENERATED ALWAYS AS
                       (to_tsvector('spanish'::regconfig, coalesce(title, '') || ' ' || coalesce(description, ''))) STORED,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK ((horizon_value IS NULL) = (horizon_unit IS NULL)),
  CHECK (confidence IS NULL OR confidence_explanation IS NOT NULL),
  CONSTRAINT opps_capital_needs_currency_basis CHECK (
    estimated_capital IS NULL OR (capital_currency IS NOT NULL AND capital_basis IS NOT NULL)
  ),
  CONSTRAINT opps_published_needs_review CHECK (
    publication_status <> 'published'
    OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL
        AND publisher_role IS NOT NULL AND published_at IS NOT NULL)
  ),
  CONSTRAINT opps_published_needs_confidence CHECK (publication_status <> 'published' OR confidence IS NOT NULL)
);
CREATE UNIQUE INDEX opportunities_dedup_uq ON investment_opportunities (dedup_key)
  WHERE publication_status <> 'rejected' AND supersedes_id IS NULL;
CREATE INDEX opportunities_event_idx ON investment_opportunities (originating_event_id);
CREATE INDEX opportunities_filter_idx ON investment_opportunities (opportunity_type, sector_id, published_at DESC)
  WHERE publication_status = 'published';
CREATE INDEX opportunities_fts_idx ON investment_opportunities USING gin (search_vector);
CREATE TRIGGER investment_opportunities_touch BEFORE UPDATE ON investment_opportunities
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TABLE evidence (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id     uuid REFERENCES investment_opportunities(id) ON DELETE CASCADE,
  event_id           uuid REFERENCES economic_events(id)          ON DELETE CASCADE,
  project_id         uuid REFERENCES projects(id)                 ON DELETE CASCADE,
  permit_id          uuid REFERENCES permits(id)                  ON DELETE CASCADE,
  tender_id          uuid REFERENCES public_tenders(id)           ON DELETE CASCADE,
  contract_id        uuid REFERENCES contracts(id)                ON DELETE CASCADE,
  instrument_id      uuid REFERENCES financial_instruments(id)    ON DELETE CASCADE,
  auction_id         uuid REFERENCES instrument_auctions(id)      ON DELETE CASCADE,
  source_document_id uuid NOT NULL REFERENCES source_documents(id),
  claim_field        text NOT NULL,           -- qué campo respalda (p. ej. 'announced_amount')
  quote              text NOT NULL CHECK (btrim(quote) <> ''),   -- cita literal
  quote_hash         char(64) NOT NULL CHECK (quote_hash ~ '^[0-9a-f]{64}$'),
  page_or_section    text,
  char_start         integer CHECK (char_start >= 0),
  char_end           integer,
  literal_verified   boolean NOT NULL DEFAULT false,   -- ¿la cita aparece literalmente en el texto? (verificador determinista)
  ai_run_id          uuid REFERENCES ai_analysis_runs(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_one_subject CHECK (
    num_nonnulls(opportunity_id, event_id, project_id, permit_id,
                 tender_id, contract_id, instrument_id, auction_id) = 1
  ),
  CHECK (char_end IS NULL OR char_start IS NULL OR char_end > char_start)
);
CREATE UNIQUE INDEX evidence_uq ON evidence (
  COALESCE(opportunity_id, event_id, project_id, permit_id, tender_id, contract_id, instrument_id, auction_id),
  source_document_id, claim_field, quote_hash
);
CREATE INDEX evidence_opp_idx   ON evidence (opportunity_id) WHERE opportunity_id IS NOT NULL;
CREATE INDEX evidence_event_idx ON evidence (event_id)       WHERE event_id IS NOT NULL;
CREATE INDEX evidence_proj_idx  ON evidence (project_id)     WHERE project_id IS NOT NULL;
CREATE INDEX evidence_doc_idx   ON evidence (source_document_id);
CREATE TABLE entity_relationships (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type          entity_type NOT NULL,
  from_id            uuid NOT NULL,
  to_type            entity_type NOT NULL,
  to_id              uuid NOT NULL,
  relation_type      text NOT NULL CHECK (relation_type ~ '^[a-z_]+$'),
  trust_layer        trust_layer NOT NULL DEFAULT 'inference',
  confidence         smallint CHECK (confidence BETWEEN 0 AND 100),
  evidence_document_id uuid REFERENCES source_documents(id),
  valid_from         date,
  valid_to           date,
  publication_status publication_status NOT NULL DEFAULT 'draft',
  ai_run_id          uuid REFERENCES ai_analysis_runs(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_relationships_uq UNIQUE (from_type, from_id, to_type, to_id, relation_type),
  CHECK (NOT (from_type = to_type AND from_id = to_id)),
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from),
  CHECK (trust_layer <> 'confirmed' OR evidence_document_id IS NOT NULL)
);
CREATE INDEX entity_relationships_from_idx ON entity_relationships (from_type, from_id);
CREATE INDEX entity_relationships_to_idx   ON entity_relationships (to_type, to_id);
CREATE TRIGGER entity_relationships_touch BEFORE UPDATE ON entity_relationships
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TABLE verification_records (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type       entity_type NOT NULL CHECK (subject_type IN ('event', 'opportunity', 'project', 'permit')),
  subject_id         uuid NOT NULL,
  check_type         text NOT NULL CHECK (check_type IN
                       ('official_source', 'cross_source', 'contradiction', 'staleness', 'duplicate', 'human_review')),
  result             verification_status NOT NULL,
  reasons            jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(reasons) = 'array'),
  ai_run_id          uuid REFERENCES ai_analysis_runs(id),
  reviewer_id        uuid REFERENCES users(id) ON DELETE RESTRICT,  -- staff-only (B-018)
  reviewer_role      user_role,               -- rol del revisor; público, sin identidad (B-018)
  created_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (check_type <> 'human_review'
         OR (reviewer_id IS NOT NULL AND reviewer_role IS NOT NULL))
);
CREATE INDEX verification_records_subject_idx ON verification_records (subject_type, subject_id, created_at DESC);
CREATE FUNCTION app.set_verification_reviewer_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.check_type = 'human_review' THEN
    NEW.reviewer_role := app.current_user_role();
  ELSE
    NEW.reviewer_role := NULL;   -- solo la revisión humana tiene rol público
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER verification_records_set_role BEFORE INSERT ON verification_records
  FOR EACH ROW EXECUTE FUNCTION app.set_verification_reviewer_role();
CREATE FUNCTION app.apply_verification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.subject_type = 'event' THEN
    UPDATE public.economic_events
       SET verification_status = NEW.result,
           verification_reason = left(NEW.reasons::text, 1000),
           verification_checked_at = NEW.created_at
     WHERE id = NEW.subject_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER verification_records_apply AFTER INSERT ON verification_records
  FOR EACH ROW EXECUTE FUNCTION app.apply_verification();
CREATE FUNCTION app.enforce_opportunity_publication() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_status public.verification_status;
  v_new_publication boolean := true;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.publication_status = 'published'
       AND NEW.publication_status <> 'published' THEN
      NEW.published_at := NULL;
    END IF;
  END IF;
  IF NEW.publication_status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.publication_status = 'published'
       AND NEW.publication_status = 'published' THEN
      IF NEW.review_notes IS DISTINCT FROM OLD.review_notes THEN
        RAISE EXCEPTION 'review_notes of a published opportunity are immutable';
      END IF;
      NEW.reviewed_by    := OLD.reviewed_by;
      NEW.reviewed_at    := OLD.reviewed_at;
      NEW.publisher_role := OLD.publisher_role;
      NEW.published_at   := OLD.published_at;
      v_new_publication  := false;
    END IF;
  END IF;
  IF app.current_user_id() IS NULL OR NOT app.is_manager() THEN
    RAISE EXCEPTION 'opportunity publication requires an authenticated manager';
  END IF;
  IF v_new_publication AND NEW.reviewed_by IS DISTINCT FROM app.current_user_id() THEN
    RAISE EXCEPTION 'reviewed_by must be the acting user';
  END IF;
  SELECT e.verification_status INTO v_status
    FROM public.economic_events e WHERE e.id = NEW.originating_event_id;
  IF v_status IS NULL OR v_status NOT IN ('verified', 'partially_verified') THEN
    RAISE EXCEPTION 'originating event must be verified or partially_verified';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.evidence ev
     WHERE ev.opportunity_id = NEW.id AND ev.literal_verified
  ) THEN
    RAISE EXCEPTION 'at least one literally verified evidence is required';
  END IF;
  IF v_new_publication THEN
    NEW.publisher_role := app.current_user_role();
    NEW.published_at := now();
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER investment_opportunities_publish_guard
  BEFORE INSERT OR UPDATE ON investment_opportunities
  FOR EACH ROW EXECUTE FUNCTION app.enforce_opportunity_publication();
