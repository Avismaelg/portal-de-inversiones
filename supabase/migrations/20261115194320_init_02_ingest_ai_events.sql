SET search_path = public, extensions;
CREATE TABLE sources (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9_]+$'),
  name             text NOT NULL,
  owner_org_id     uuid REFERENCES organizations(id),
  base_url         text NOT NULL,
  allowed_hosts    text[] NOT NULL CHECK (cardinality(allowed_hosts) > 0),  -- lista cerrada (SSRF)
  access_method    source_access_method NOT NULL,
  data_format      text,
  schedule_cron    text,                      -- zona America/Santo_Domingo
  expected_freshness interval,
  rate_limit_rps   numeric(6,2) NOT NULL DEFAULT 1 CHECK (rate_limit_rps > 0),
  robots_status    robots_status NOT NULL DEFAULT 'unknown',
  terms_url        text,
  terms_checked_at timestamptz,
  legal_status     source_legal_status NOT NULL DEFAULT 'pending_review',
  automation_allowed boolean NOT NULL DEFAULT false,
  retention_days   integer CHECK (retention_days IS NULL OR retention_days > 0),
  redistribution_allowed boolean NOT NULL DEFAULT false,
  is_active        boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sources_no_active_without_legal CHECK (
    NOT is_active
    OR access_method = 'manual'
    OR (automation_allowed AND legal_status = 'verified_ok')
  ),
  CONSTRAINT sources_prohibited_not_automated CHECK (
    legal_status NOT IN ('restricted', 'prohibited') OR NOT automation_allowed
  )
);
CREATE TRIGGER sources_touch BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TABLE ingestion_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       uuid REFERENCES sources(id),
  parent_job_id   uuid REFERENCES ingestion_jobs(id),
  job_type        job_type NOT NULL,
  status          job_status NOT NULL DEFAULT 'queued',
  idempotency_key text NOT NULL CHECK (btrim(idempotency_key) <> ''),
  scheduled_for   timestamptz NOT NULL DEFAULT now(),
  attempts        integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts    integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  locked_by       text,
  locked_until    timestamptz,                -- lease: si expira, otro worker lo toma
  started_at      timestamptz,
  finished_at     timestamptz,
  error_class     text,
  error_message   text,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  result          jsonb,
  source_document_id uuid,                    -- FK añadida tras crear source_documents
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ingestion_jobs_idem_uq UNIQUE (job_type, idempotency_key),
  CHECK (status <> 'running' OR (locked_by IS NOT NULL AND locked_until IS NOT NULL))
);
CREATE INDEX ingestion_jobs_claim_idx ON ingestion_jobs (scheduled_for) WHERE status = 'queued';
CREATE INDEX ingestion_jobs_lease_idx ON ingestion_jobs (locked_until) WHERE status = 'running';
CREATE INDEX ingestion_jobs_source_idx ON ingestion_jobs (source_id, created_at DESC);
CREATE TRIGGER ingestion_jobs_touch BEFORE UPDATE ON ingestion_jobs
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TABLE source_documents (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id          uuid NOT NULL REFERENCES sources(id),
  job_id             uuid REFERENCES ingestion_jobs(id),
  external_id        text,                    -- id del documento en la fuente (p. ej. OCID)
  canonical_url      text NOT NULL,
  final_url          text,
  content_hash       char(64) NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),  -- SHA-256 hex
  mime_type          text,
  byte_size          bigint CHECK (byte_size >= 0),
  storage_path       text,                    -- ruta en Storage (por hash)
  ingest_method      ingest_method NOT NULL DEFAULT 'automatic',
  uploaded_by        uuid REFERENCES users(id),
  title              text,
  language           text,
  published_at       timestamptz,             -- fecha de la fuente (RF-A-06)
  timezone_assumed   boolean NOT NULL DEFAULT false,  -- true si la fuente no indicó zona y se asumió America/Santo_Domingo (Ronda 2; ESTRATEGIA-PRUEBAS §7.2 de B)
  detected_at        timestamptz NOT NULL DEFAULT now(),
  source_updated_at  timestamptz,
  http_etag          text,
  http_last_modified text,
  terms_version      text,                    -- versión de términos consultada
  redistribution_allowed boolean NOT NULL DEFAULT false,
  parse_status       parse_status NOT NULL DEFAULT 'pending',
  extracted_text     text,                    -- no legible por 'authenticated' (ver grants)
  search_vector      tsvector GENERATED ALWAYS AS
                       (to_tsvector('spanish'::regconfig, coalesce(title, '') || ' ' || coalesce(extracted_text, ''))) STORED,
  supersedes_id      uuid REFERENCES source_documents(id),  -- nueva versión del mismo external_id
  is_demo            boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT source_documents_hash_uq UNIQUE (source_id, content_hash),
  CHECK (ingest_method <> 'manual_upload' OR uploaded_by IS NOT NULL)
);
CREATE INDEX source_documents_ext_idx ON source_documents (source_id, external_id);
CREATE INDEX source_documents_pub_idx ON source_documents (published_at DESC);
CREATE INDEX source_documents_fts_idx ON source_documents USING gin (search_vector);
ALTER TABLE ingestion_jobs
  ADD CONSTRAINT ingestion_jobs_document_fk
  FOREIGN KEY (source_document_id) REFERENCES source_documents(id);
CREATE FUNCTION app.source_documents_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.content_hash IS DISTINCT FROM OLD.content_hash
     OR NEW.source_id IS DISTINCT FROM OLD.source_id
     OR NEW.canonical_url IS DISTINCT FROM OLD.canonical_url
     OR NEW.storage_path IS DISTINCT FROM OLD.storage_path AND OLD.storage_path IS NOT NULL THEN
    RAISE EXCEPTION 'source_documents: original fields are immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER source_documents_immutable_trg BEFORE UPDATE ON source_documents
  FOR EACH ROW EXECUTE FUNCTION app.source_documents_immutable();
CREATE TABLE ai_analysis_runs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent            agent_name NOT NULL,
  task             text NOT NULL,
  job_id           uuid REFERENCES ingestion_jobs(id),
  source_document_id uuid REFERENCES source_documents(id),
  subject_type     entity_type,
  subject_id       uuid,
  provider         text,                      -- vacío si la tarea es determinista
  model            text,
  model_version    text,
  prompt_version   text NOT NULL,
  prompt_hash      char(64),
  schema_version   text NOT NULL,
  input_hash       char(64),
  idempotency_key  text NOT NULL,
  temperature      numeric(3,2),
  input_tokens     integer CHECK (input_tokens  >= 0),
  output_tokens    integer CHECK (output_tokens >= 0),
  cached_tokens    integer CHECK (cached_tokens >= 0),
  cost_usd         numeric(12,6) CHECK (cost_usd >= 0),
  latency_ms       integer CHECK (latency_ms >= 0),
  status           run_status NOT NULL,
  error            text,
  output           jsonb,                     -- salida validada o rechazada (para auditoría)
  output_hash      char(64),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_runs_idem_uq UNIQUE (agent, idempotency_key),
  CHECK (provider IS NULL OR model IS NOT NULL)
);
CREATE INDEX ai_runs_doc_idx ON ai_analysis_runs (source_document_id);
CREATE INDEX ai_runs_subject_idx ON ai_analysis_runs (subject_type, subject_id);
CREATE INDEX ai_runs_cost_idx ON ai_analysis_runs (created_at, agent);
CREATE TABLE economic_events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text NOT NULL CHECK (btrim(title) <> ''),
  summary            text,
  event_kind         text,                    -- señal: factory, branch_opening, foreign_investment, ... [PENDIENTE SRS]
  primary_source_document_id uuid NOT NULL REFERENCES source_documents(id),
  organization_id    uuid REFERENCES organizations(id),       -- actor principal
  sector_id          uuid REFERENCES sectors(id),
  location_id        uuid REFERENCES geographic_locations(id),
  occurred_at        timestamptz,             -- cuándo ocurrió (si se sabe)
  published_at       timestamptz,             -- fecha de la fuente
  timezone_assumed   boolean NOT NULL DEFAULT false,  -- zona asumida para occurred_at/published_at (Ronda 2)
  detected_at        timestamptz NOT NULL DEFAULT now(),
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verification_reason text,
  verification_checked_at timestamptz,
  reviewed_by        uuid REFERENCES users(id) ON DELETE RESTRICT,  -- revisor humano; staff-only (B-018)
  reviewed_at        timestamptz,
  review_notes       text,                    -- staff-only (B-018)
  publisher_role     user_role,               -- rol del publicador humano; público, sin identidad (B-018)
  released_at        timestamptz,             -- cuándo se publicó EN LA PLATAFORMA (published_at es la fecha de la FUENTE, RF-A-06)
  publication_status publication_status NOT NULL DEFAULT 'draft',
  trust_layer        trust_layer NOT NULL DEFAULT 'ai_analysis',
  classification_confidence smallint CHECK (classification_confidence BETWEEN 0 AND 100),
  ai_run_id          uuid REFERENCES ai_analysis_runs(id),
  dedup_key          char(64) NOT NULL,       -- ver MODELO-DATOS.md §6
  merged_into_id     uuid REFERENCES economic_events(id),     -- fusión reversible
  is_demo            boolean NOT NULL DEFAULT false,
  search_vector      tsvector GENERATED ALWAYS AS
                       (to_tsvector('spanish'::regconfig, coalesce(title, '') || ' ' || coalesce(summary, ''))) STORED,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (merged_into_id IS NULL OR merged_into_id <> id),
  CHECK (publication_status <> 'published' OR verification_status <> 'pending'),
  CONSTRAINT economic_events_p0_review CHECK (
    publication_status <> 'published'
    OR verification_status = 'verified'
    OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND publisher_role IS NOT NULL)
  ),
  CONSTRAINT economic_events_released CHECK (publication_status <> 'published' OR released_at IS NOT NULL),
  CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL))
);
CREATE UNIQUE INDEX economic_events_dedup_uq ON economic_events (dedup_key) WHERE merged_into_id IS NULL;
CREATE INDEX economic_events_fts_idx ON economic_events USING gin (search_vector);
CREATE INDEX economic_events_title_trgm ON economic_events USING gin (title gin_trgm_ops);
CREATE INDEX economic_events_filter_idx ON economic_events (sector_id, published_at DESC) WHERE publication_status = 'published';
CREATE INDEX economic_events_org_idx ON economic_events (organization_id);
CREATE INDEX economic_events_loc_idx ON economic_events (location_id);
CREATE TRIGGER economic_events_touch BEFORE UPDATE ON economic_events
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE FUNCTION app.enforce_event_publication() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_transition boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.publication_status = 'published'
       AND NEW.publication_status <> 'published' THEN
      NEW.released_at := NULL;
    END IF;
    IF OLD.publication_status = 'published'
       AND NEW.publication_status = 'published'
       AND NEW.verification_status IS DISTINCT FROM OLD.verification_status
       AND NEW.verification_status <> 'verified' THEN
      NEW.publication_status := 'in_review';
      NEW.released_at := NULL;
    END IF;
  END IF;
  IF NEW.publication_status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    v_transition := true;
  ELSE
    v_transition := (OLD.publication_status IS DISTINCT FROM 'published');
  END IF;
  IF NOT v_transition THEN
    IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
       OR NEW.review_notes IS DISTINCT FROM OLD.review_notes
       OR NEW.publisher_role IS DISTINCT FROM OLD.publisher_role
       OR NEW.released_at IS DISTINCT FROM OLD.released_at THEN
      RAISE EXCEPTION 'review/release fields of a published event are immutable';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.verification_status = 'pending' THEN
    RAISE EXCEPTION 'an event with verification_status=pending can never be published';
  END IF;
  IF NEW.verification_status = 'verified' THEN
    NEW.publisher_role := CASE WHEN app.current_user_id() IS NULL
                               THEN NULL ELSE app.current_user_role() END;
    NEW.released_at := now();
    RETURN NEW;                       -- 100 % verificado: sin revisor obligatorio
  END IF;
  IF app.current_user_id() IS NULL OR NOT app.is_manager() THEN
    RAISE EXCEPTION 'publishing a non-verified event requires an authenticated human manager (P0)';
  END IF;
  IF NEW.reviewed_by IS DISTINCT FROM app.current_user_id() THEN
    RAISE EXCEPTION 'reviewed_by must be the acting user';
  END IF;
  NEW.reviewed_at := now();
  NEW.publisher_role := app.current_user_role();
  NEW.released_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER economic_events_publish_guard
  BEFORE INSERT OR UPDATE ON economic_events
  FOR EACH ROW EXECUTE FUNCTION app.enforce_event_publication();
