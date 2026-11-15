-- G0 #10 (2026-11-15): opportunity_evidence renombrada a evidence. No ejecutar el esquema anterior.
-- =============================================================================
-- AviTech Investment Intelligence — ESQUEMA PROPUESTO (Sprint 0)
-- Ventana A · 2026-11-15 · versión 0.1.0
--
-- ESTADO: PROPUESTA. NO APLICAR. NO PROBADO.
--   * No se ejecutó en ningún Postgres (no hay psql/Docker/Supabase accesible:
--     bloqueos B-003 y B-006). La sintaxis fue revisada a mano.
--   * Destino: PostgreSQL 15+ sobre una base VACÍA, dentro de una transacción.
--   * Lo que depende de Supabase está marcado [VERIFICAR Sprint 1].
--   * Requisitos: [PENDIENTE SRS]. Base: Prompt Maestro §8 y docs/producto (B).
--
-- Convenciones
--   * Tablas y columnas en inglés; comentarios en español.
--   * Fechas: timestamptz (se guardan en UTC; la UI muestra America/Santo_Domingo).
--   * Montos: numeric(20,2) + moneda ISO 4217 (char(3)). Nunca se suman monedas.
--   * Tasas: numeric(9,6), en porcentaje anual (9.9 = 9,9 %).
--   * Capas de confianza (trust_layer): confirmed | ai_analysis | inference.
--   * Funciones auxiliares en el esquema "app".
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Extensiones y roles
-- -----------------------------------------------------------------------------
-- pg_trgm: similitud de nombres (deduplicación). En Supabase suele instalarse en
-- el esquema "extensions" [VERIFICAR Sprint 1: ajustar search_path para los
-- operadores gin_trgm_ops].
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Roles de Supabase. En Supabase YA existen: este bloque no hace nada allí.
-- En Postgres plano los crea para poder probar las políticas.
-- [VERIFICAR Sprint 1] que service_role tenga BYPASSRLS en Supabase.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS app;
REVOKE ALL ON SCHEMA app FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 1. Tipos enumerados
-- -----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM
  ('viewer', 'analyst', 'opportunity_manager', 'org_admin', 'platform_admin');

CREATE TYPE org_type AS ENUM
  ('tenant', 'company', 'government', 'financial_institution', 'ngo', 'other');

CREATE TYPE trust_layer AS ENUM ('confirmed', 'ai_analysis', 'inference');

CREATE TYPE publication_status AS ENUM ('draft', 'in_review', 'published', 'rejected');

CREATE TYPE verification_status AS ENUM
  ('pending', 'verified', 'partially_verified', 'disputed', 'unverifiable');

CREATE TYPE source_access_method AS ENUM ('api', 'bulk_file', 'rss', 'html', 'manual');
CREATE TYPE source_legal_status  AS ENUM ('pending_review', 'verified_ok', 'restricted', 'prohibited');
CREATE TYPE robots_status        AS ENUM ('unknown', 'allowed', 'disallowed', 'not_published');

CREATE TYPE job_type   AS ENUM ('discover', 'fetch', 'extract', 'verify', 'opportunity', 'alert_dispatch');
CREATE TYPE job_status AS ENUM
  ('queued', 'running', 'succeeded', 'failed', 'failed_schema', 'dead', 'skipped_duplicate');

CREATE TYPE ingest_method AS ENUM ('automatic', 'manual_upload');
CREATE TYPE parse_status  AS ENUM ('pending', 'parsed', 'failed', 'unsupported');

CREATE TYPE geo_kind AS ENUM ('country', 'province', 'municipality', 'district', 'site');

CREATE TYPE project_status AS ENUM
  ('announced', 'permit_applied', 'permit_approved', 'under_construction',
   'operating', 'suspended', 'cancelled', 'unknown');

CREATE TYPE permit_type AS ENUM
  ('environmental', 'energy_concession', 'tourism', 'construction',
   'industrial', 'regulatory_concession', 'other');
CREATE TYPE permit_status AS ENUM
  ('requested', 'under_review', 'approved', 'denied', 'expired', 'revoked', 'unknown');

CREATE TYPE tender_status AS ENUM ('planned', 'open', 'closed', 'awarded', 'cancelled', 'unknown');

CREATE TYPE instrument_type AS ENUM
  ('central_bank_note', 'central_bank_bill', 'treasury_bond', 'treasury_bill',
   'corporate_bond', 'other_fixed_income');
CREATE TYPE rate_kind AS ENUM ('indicative', 'awarded', 'effective');
CREATE TYPE availability_status AS ENUM ('not_confirmed', 'confirmed_by_source');
CREATE TYPE auction_type AS ENUM
  ('competitive_single_price', 'non_competitive', 'extraordinary', 'direct_window', 'rate_observation');

CREATE TYPE opportunity_type AS ENUM
  ('financial_investment', 'services', 'supply', 'tender_participation', 'subcontracting',
   'new_business', 'commercial_expansion', 'technical_consulting', 'automation',
   'energy_efficiency', 'technology_development');
CREATE TYPE horizon_unit AS ENUM ('days', 'weeks', 'months');

CREATE TYPE entity_type AS ENUM
  ('organization', 'project', 'permit', 'tender', 'contract', 'instrument',
   'event', 'opportunity', 'sector', 'location', 'document');

CREATE TYPE alert_channel   AS ENUM ('in_app', 'email');          -- email: [PENDIENTE SRS]
CREATE TYPE alert_frequency AS ENUM ('immediate', 'daily_digest');
CREATE TYPE notification_status AS ENUM ('pending', 'delivered', 'failed', 'read');

CREATE TYPE agent_name AS ENUM
  ('discovery', 'extraction', 'verification', 'opportunity_intelligence', 'financial_analysis', 'alert');
CREATE TYPE run_status AS ENUM
  ('succeeded', 'failed', 'schema_invalid', 'blocked', 'budget_exceeded');

CREATE TYPE actor_kind AS ENUM ('user', 'service', 'system');

-- -----------------------------------------------------------------------------
-- 2. Funciones auxiliares básicas (no dependen de tablas)
-- -----------------------------------------------------------------------------
-- Actualiza updated_at.
CREATE FUNCTION app.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Identidad del llamante. Lee el JWT que PostgREST/Supabase deja en la sesión.
-- Devuelve NULL si no hay JWT (p. ej. service_role sin usuario o un worker).
-- [VERIFICAR Sprint 1] que el nombre de la variable de sesión sea el vigente.
CREATE FUNCTION app.current_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;

-- -----------------------------------------------------------------------------
-- 3. Datos de referencia
-- -----------------------------------------------------------------------------

-- 3.1 organizations — empresas, instituciones y también el "tenant" (C-07 y C-12
-- de docs/producto). Una sola tabla con org_type: ver MODELO-DATOS.md §3 (riesgo).
CREATE TABLE organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_type        org_type NOT NULL,
  legal_name      text NOT NULL CHECK (btrim(legal_name) <> ''),
  display_name    text,
  tax_id          text,                         -- RNC u otro identificador fiscal; solo si la fuente lo publica
  country         char(2) NOT NULL DEFAULT 'DO' CHECK (country ~ '^[A-Z]{2}$'),
  website         text,
  -- Clave de comparación; ver MODELO-DATOS.md §6.
  normalized_name text GENERATED ALWAYS AS
                    (lower(btrim(regexp_replace(legal_name, '\s+', ' ', 'g')))) STORED,
  merged_into_id  uuid REFERENCES organizations(id),   -- fusión reversible (RF-E-08)
  trust_layer     trust_layer NOT NULL DEFAULT 'ai_analysis',
  publication_status publication_status NOT NULL DEFAULT 'published',
  is_demo         boolean NOT NULL DEFAULT false,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (merged_into_id IS NULL OR merged_into_id <> id)
);
-- Un RNC identifica una sola organización activa.
CREATE UNIQUE INDEX organizations_tax_id_uq
  ON organizations (country, tax_id) WHERE tax_id IS NOT NULL AND merged_into_id IS NULL;
CREATE INDEX organizations_name_trgm ON organizations USING gin (normalized_name gin_trgm_ops);
CREATE INDEX organizations_type_idx ON organizations (org_type);
CREATE TRIGGER organizations_touch BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- 3.2 sectors — las 11 categorías iniciales del Prompt Maestro §4-A.
CREATE TABLE sectors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE CHECK (code ~ '^[a-z_]+$'),
  name_es    text NOT NULL,
  parent_id  uuid REFERENCES sectors(id),
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO sectors (code, name_es) VALUES
  ('energy', 'Energía'), ('construction', 'Construcción'), ('tourism', 'Turismo'),
  ('industry', 'Industria'), ('infrastructure', 'Infraestructura'), ('technology', 'Tecnología'),
  ('finance', 'Finanzas'), ('commerce', 'Comercio'), ('agriculture', 'Agricultura'),
  ('transport', 'Transporte'), ('foreign_investment', 'Inversiones extranjeras');

-- 3.3 geographic_locations — jerarquía país > provincia > municipio > distrito > sitio.
-- Los códigos oficiales y la carga inicial de provincias/municipios son [PENDIENTE]
-- (se sembrarán desde una fuente oficial, no de memoria).
CREATE TABLE geographic_locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        geo_kind NOT NULL,
  name        text NOT NULL,
  parent_id   uuid REFERENCES geographic_locations(id),
  official_code text,                          -- [PENDIENTE] código oficial
  latitude    numeric(9,6) CHECK (latitude  BETWEEN -90  AND 90),
  longitude   numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
  coordinates_source text,                     -- obligatorio si hay coordenadas
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK ((latitude IS NULL) = (longitude IS NULL)),
  CHECK (latitude IS NULL OR coordinates_source IS NOT NULL)   -- sin geocodificación inventada (RF-B-07)
);
CREATE UNIQUE INDEX geographic_locations_uq
  ON geographic_locations (kind, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
CREATE INDEX geographic_locations_parent_idx ON geographic_locations (parent_id);

-- -----------------------------------------------------------------------------
-- 4. Identidad
-- -----------------------------------------------------------------------------
-- 4.1 users — perfil de aplicación. En Supabase, id = auth.users.id (ver 4.2: OBLIGATORIO).
CREATE TABLE users (
  id              uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  email           text NOT NULL CHECK (position('@' in email) > 1),
  display_name    text,
  role            user_role NOT NULL DEFAULT 'viewer',
  locale          text NOT NULL DEFAULT 'es-DO',
  timezone        text NOT NULL DEFAULT 'America/Santo_Domingo',
  theme           text NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  is_active       boolean NOT NULL DEFAULT true,
  consent_accepted_at timestamptz,             -- [PENDIENTE LEGAL] texto y versión
  consent_version text,
  deleted_at      timestamptz,                 -- borrado lógico previo a purga (RNF-28)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_uq ON users (lower(email));
CREATE INDEX users_org_idx ON users (organization_id);
CREATE TRIGGER users_touch BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- 4.2 SOLO SUPABASE — PASO OBLIGATORIO DE LA MIGRACIÓN (Ronda 2, 2026-11-15)
-- Vincula users.id con auth.users.id. Sin esta FK un perfil podría existir sin
-- identidad real, o quedar huérfano al borrar la cuenta de Auth (RNF-28).
--   * Si existe auth.users (Supabase): la FK se crea SIEMPRE.
--   * Si NO existe (Postgres plano) la migración FALLA, salvo que se declare
--     explícitamente un entorno de pruebas, justo después de BEGIN:
--         SET LOCAL app.allow_plain_postgres = 'on';
--     En ese caso solo se emite un WARNING y la FK NO queda creada.
--   * NUNCA desplegar en staging/producción con el opt-out activado.
-- Comprobación posterior (debe devolver 1 fila en Supabase):
--   SELECT conname FROM pg_constraint WHERE conname = 'users_auth_fk';
-- NO PROBADO (sin Postgres/Supabase accesible, B-003/B-006).
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_auth_fk
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ELSIF current_setting('app.allow_plain_postgres', true) = 'on' THEN
    RAISE WARNING 'auth.users not found: users_auth_fk NOT created (plain Postgres test only). Never deploy this way.';
  ELSE
    RAISE EXCEPTION 'auth.users not found: the Supabase-only step users_auth_fk cannot run. '
                    'Use SET LOCAL app.allow_plain_postgres = ''on'' ONLY for local tests.';
  END IF;
END $$;

-- El usuario debe pertenecer a una organización de tipo 'tenant'.
CREATE FUNCTION app.users_org_must_be_tenant() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = NEW.organization_id AND o.org_type = 'tenant') THEN
    RAISE EXCEPTION 'users.organization_id must reference an organization of type tenant';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER users_tenant_check BEFORE INSERT OR UPDATE OF organization_id ON users
  FOR EACH ROW EXECUTE FUNCTION app.users_org_must_be_tenant();

-- Helpers de autorización. SECURITY DEFINER para leer "users" sin recursión de RLS.
-- search_path vacío: todo calificado (defensa contra secuestro de search_path).
CREATE FUNCTION app.current_user_role() RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT u.role FROM public.users u
  WHERE u.id = app.current_user_id() AND u.is_active AND u.deleted_at IS NULL
$$;

CREATE FUNCTION app.current_org_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT u.organization_id FROM public.users u
  WHERE u.id = app.current_user_id() AND u.is_active AND u.deleted_at IS NULL
$$;

-- analyst | opportunity_manager | org_admin | platform_admin
CREATE FUNCTION app.is_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(app.current_user_role() IN
    ('analyst', 'opportunity_manager', 'org_admin', 'platform_admin'), false)
$$;

-- opportunity_manager | org_admin | platform_admin (pueden publicar)
CREATE FUNCTION app.is_manager() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(app.current_user_role() IN
    ('opportunity_manager', 'org_admin', 'platform_admin'), false)
$$;

CREATE FUNCTION app.is_org_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(app.current_user_role() IN ('org_admin', 'platform_admin'), false)
$$;

CREATE FUNCTION app.is_platform_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(app.current_user_role() = 'platform_admin', false)
$$;

-- -----------------------------------------------------------------------------
-- 5. Ingesta
-- -----------------------------------------------------------------------------
-- 5.1 sources — una fila por fuente configurada (ver docs/fuentes/FUENTES-RD.md).
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
  -- Ningún conector automático activo sin verificación legal previa (PM §6).
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

-- 5.2 ingestion_jobs — cola de trabajo en Postgres (ADR-0003).
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
-- Índice de reclamo: solo trabajos pendientes, ordenados por fecha.
CREATE INDEX ingestion_jobs_claim_idx ON ingestion_jobs (scheduled_for) WHERE status = 'queued';
CREATE INDEX ingestion_jobs_lease_idx ON ingestion_jobs (locked_until) WHERE status = 'running';
CREATE INDEX ingestion_jobs_source_idx ON ingestion_jobs (source_id, created_at DESC);
CREATE TRIGGER ingestion_jobs_touch BEFORE UPDATE ON ingestion_jobs
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- 5.3 source_documents — documento original inmutable + metadatos.
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

-- Los originales no se modifican: solo se permite completar extracción/parse.
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

-- -----------------------------------------------------------------------------
-- 6. Trazabilidad de IA (se crea antes que las entidades que la referencian)
-- -----------------------------------------------------------------------------
-- 6.1 ai_analysis_runs — una fila por ejecución de agente. Append-only.
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

-- -----------------------------------------------------------------------------
-- 7. Entidades de negocio
-- -----------------------------------------------------------------------------
-- 7.1 economic_events — Módulo A.
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
  -- Guardia de publicación P0 (G0 #11a; Ronda 4). PROPUESTO, NO EJECUTADO (B-007).
  reviewed_by        uuid REFERENCES users(id),       -- revisor humano (ver nota de borrado de cuenta en MODELO-DATOS §12)
  reviewed_at        timestamptz,
  review_notes       text,
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
  -- Un evento publicado debe tener una decisión de verificación distinta de 'pending'.
  CHECK (publication_status <> 'published' OR verification_status <> 'pending'),
  -- P0 (Ronda 4): publicado y no 100 % verificado => revisor humano registrado.
  CONSTRAINT economic_events_p0_review CHECK (
    publication_status <> 'published'
    OR verification_status = 'verified'
    OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
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

-- Guardia de publicación de EVENTOS — puerta P0 (G0 #11a; B: CC-23). Ronda 4.
-- PROPUESTO, NO EJECUTADO (B-007). Equivale a investment_opportunities_publish_guard.
--   * 'verified' (100 % verificado): puede publicarse sin revisor humano (también un worker).
--   * 'partially_verified' | 'disputed' | 'unverifiable': solo lo publica una PERSONA con
--     rol de gestión (opportunity_manager+), que debe ser quien actúa (reviewed_by).
--     Un worker o service_role NO puede (app.current_user_id() es NULL).
--   * 'pending': nunca se publica (CHECK + mensaje explícito aquí).
--   * Un evento ya publicado cuya verificación pasa a un estado distinto de 'verified'
--     VUELVE A LA COLA ('in_review') y deja de ser visible para los lectores (RLS). Así una
--     contradicción posterior no queda publicada y apply_verification() no falla.
--   * Una vez publicado, reviewed_by/reviewed_at/released_at no se pueden alterar.
-- [DECISIÓN pendiente] ¿Quién publica eventos no verificados: analyst o manager+? Aquí manager+
-- (misma regla que oportunidades); cambiarlo es sustituir app.is_manager() por app.is_staff().
CREATE FUNCTION app.enforce_event_publication() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_transition boolean;
BEGIN
  -- 1) Verificación que empeora sobre un evento publicado: vuelve a la cola.
  IF TG_OP = 'UPDATE'
     AND OLD.publication_status = 'published'
     AND NEW.publication_status = 'published'
     AND NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NEW.verification_status <> 'verified' THEN
    NEW.publication_status := 'in_review';
    NEW.released_at := NULL;
  END IF;

  IF NEW.publication_status <> 'published' THEN
    RETURN NEW;
  END IF;

  v_transition := (TG_OP = 'INSERT') OR (OLD.publication_status IS DISTINCT FROM 'published');

  -- 2) Ya estaba publicado y sigue igual: los campos de revisión son inmutables.
  IF NOT v_transition THEN
    IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
       OR NEW.released_at IS DISTINCT FROM OLD.released_at THEN
      RAISE EXCEPTION 'review/release fields of a published event are immutable';
    END IF;
    RETURN NEW;
  END IF;

  -- 3) Transición a 'published'.
  IF NEW.verification_status = 'pending' THEN
    RAISE EXCEPTION 'an event with verification_status=pending can never be published';
  END IF;

  IF NEW.verification_status = 'verified' THEN
    NEW.released_at := COALESCE(NEW.released_at, now());
    RETURN NEW;                       -- 100 % verificado: sin revisor obligatorio
  END IF;

  IF app.current_user_id() IS NULL OR NOT app.is_manager() THEN
    RAISE EXCEPTION 'publishing a non-verified event requires an authenticated human manager (P0)';
  END IF;
  IF NEW.reviewed_by IS DISTINCT FROM app.current_user_id() THEN
    RAISE EXCEPTION 'reviewed_by must be the acting user';
  END IF;
  NEW.reviewed_at := now();
  NEW.released_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER economic_events_publish_guard
  BEFORE INSERT OR UPDATE ON economic_events
  FOR EACH ROW EXECUTE FUNCTION app.enforce_event_publication();

-- 7.2 projects — Módulo B.
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
  -- RNF-14: sin monto sin moneda; RN-06: sin monto sin documento que lo respalde.
  CONSTRAINT projects_amount_needs_currency CHECK (announced_amount IS NULL OR currency IS NOT NULL),
  CONSTRAINT projects_amount_needs_source   CHECK (announced_amount IS NULL OR amount_source_document_id IS NOT NULL),
  -- RF-B-04 / RN-03: registro ≠ aprobación. Estados posteriores a la aprobación exigen documento oficial.
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

-- 7.3 permits — Módulo B.
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

-- 7.4 public_tenders — Módulo D.
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

-- 7.5 contracts — Módulo D. NOTA: no se impone start_date <= end_date porque la
-- fuente DGCP/OCP declara inconsistencias de ese tipo; se marca en data_quality_flags.
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

-- 7.6 financial_instruments — Módulo C.
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
  -- Disponibilidad confirmada exige respaldo documental.
  CHECK (availability <> 'confirmed_by_source' OR official_document_id IS NOT NULL)
);
CREATE UNIQUE INDEX financial_instruments_dedup_uq ON financial_instruments (dedup_key);
CREATE UNIQUE INDEX financial_instruments_isin_uq ON financial_instruments (isin) WHERE isin IS NOT NULL;
CREATE INDEX financial_instruments_maturity_idx ON financial_instruments (maturity_date);
CREATE INDEX financial_instruments_issuer_idx ON financial_instruments (issuer_org_id);
CREATE TRIGGER financial_instruments_touch BEFORE UPDATE ON financial_instruments
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- 7.7 instrument_auctions — subastas y observaciones de tasa (historial de tasas).
-- 'rate_observation' permite guardar tasas indicativas/efectivas con fecha y fuente
-- sin pretender que fueron una subasta. rate_kind nunca se mezcla en una serie.
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
  -- Una tasa de corte solo existe en subastas con resultado: 'awarded'.
  CHECK (cutoff_rate IS NULL OR rate_kind = 'awarded')
);
CREATE INDEX instrument_auctions_date_idx ON instrument_auctions (auction_date DESC);
CREATE INDEX instrument_auctions_inst_idx ON instrument_auctions (instrument_id, auction_date DESC);
CREATE TRIGGER instrument_auctions_touch BEFORE UPDATE ON instrument_auctions
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- 7.8 investment_opportunities — Módulo F.
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
  reviewed_by        uuid REFERENCES users(id),
  reviewed_at        timestamptz,
  review_notes       text,
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
    OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND published_at IS NOT NULL)
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

-- 7.9 evidence — fragmentos de evidencia (antes "opportunity_evidence", nombre original del
-- Prompt Maestro). Se generaliza a CUALQUIER sujeto (RF-A-05 exige evidencia por evento).
-- Ver MODELO-DATOS.md §3 (DM-03, aprobado en G0 #10: renombrar a evidence).
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
  -- Exactamente un sujeto.
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

-- 7.10 entity_relationships — aristas genéricas (empresa↔proyecto, evento↔sector, etc.).
-- Polimórfica: NO tiene FK real; la integridad se vigila con app.orphan_relationships().
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
  -- 'confirmed' exige evidencia.
  CHECK (trust_layer <> 'confirmed' OR evidence_document_id IS NOT NULL)
);
CREATE INDEX entity_relationships_from_idx ON entity_relationships (from_type, from_id);
CREATE INDEX entity_relationships_to_idx   ON entity_relationships (to_type, to_id);
CREATE TRIGGER entity_relationships_touch BEFORE UPDATE ON entity_relationships
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- 7.11 verification_records — historial de verificaciones (append-only).
CREATE TABLE verification_records (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type       entity_type NOT NULL CHECK (subject_type IN ('event', 'opportunity', 'project', 'permit')),
  subject_id         uuid NOT NULL,
  check_type         text NOT NULL CHECK (check_type IN
                       ('official_source', 'cross_source', 'contradiction', 'staleness', 'duplicate', 'human_review')),
  result             verification_status NOT NULL,
  reasons            jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(reasons) = 'array'),
  ai_run_id          uuid REFERENCES ai_analysis_runs(id),
  reviewer_id        uuid REFERENCES users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (check_type <> 'human_review' OR reviewer_id IS NOT NULL)
);
CREATE INDEX verification_records_subject_idx ON verification_records (subject_type, subject_id, created_at DESC);

-- Sincroniza el último resultado en la entidad (solo eventos y oportunidades lo guardan).
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

-- Regla de publicación de oportunidades (RF-F-01, F-04, F-11, RN-07).
--  * Solo publica una persona con rol de gestión (no un worker ni service_role).
--  * El revisor debe ser quien ejecuta la acción.
--  * Debe existir al menos una evidencia con cita literal verificada.
--  * El evento originador debe estar verified o partially_verified.
CREATE FUNCTION app.enforce_opportunity_publication() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_status public.verification_status;
BEGIN
  IF NEW.publication_status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF app.current_user_id() IS NULL OR NOT app.is_manager() THEN
    RAISE EXCEPTION 'opportunity publication requires an authenticated manager';
  END IF;
  IF NEW.reviewed_by IS DISTINCT FROM app.current_user_id() THEN
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
  NEW.published_at := COALESCE(NEW.published_at, now());
  NEW.reviewed_at  := COALESCE(NEW.reviewed_at, now());
  RETURN NEW;
END $$;
CREATE TRIGGER investment_opportunities_publish_guard
  BEFORE INSERT OR UPDATE ON investment_opportunities
  FOR EACH ROW EXECUTE FUNCTION app.enforce_opportunity_publication();

-- -----------------------------------------------------------------------------
-- 8. Funciones de visibilidad usadas por RLS (necesitan las tablas anteriores)
-- -----------------------------------------------------------------------------
-- ¿El sujeto está publicado? Usa SECURITY DEFINER para no depender del RLS del llamante.
CREATE FUNCTION app.subject_published(p_type entity_type, p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE p_type
    WHEN 'event'       THEN EXISTS (SELECT 1 FROM public.economic_events e WHERE e.id = p_id AND e.publication_status = 'published')
    WHEN 'opportunity' THEN EXISTS (SELECT 1 FROM public.investment_opportunities o WHERE o.id = p_id AND o.publication_status = 'published')
    WHEN 'project'     THEN EXISTS (SELECT 1 FROM public.projects p WHERE p.id = p_id AND p.publication_status = 'published')
    WHEN 'permit'      THEN EXISTS (SELECT 1 FROM public.permits p WHERE p.id = p_id AND p.publication_status = 'published')
    WHEN 'tender'      THEN EXISTS (SELECT 1 FROM public.public_tenders t WHERE t.id = p_id AND t.publication_status = 'published')
    WHEN 'contract'    THEN EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = p_id AND c.publication_status = 'published')
    WHEN 'instrument'  THEN EXISTS (SELECT 1 FROM public.financial_instruments i WHERE i.id = p_id AND i.publication_status = 'published')
    WHEN 'organization' THEN EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = p_id AND o.publication_status = 'published')
    ELSE true      -- sector, location, document: referencia pública
  END
$$;

-- Evidencia visible si el sujeto al que respalda está publicado.
CREATE FUNCTION app.evidence_parent_published(
  p_opp uuid, p_event uuid, p_project uuid, p_permit uuid,
  p_tender uuid, p_contract uuid, p_instrument uuid, p_auction uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE
    WHEN p_opp        IS NOT NULL THEN app.subject_published('opportunity', p_opp)
    WHEN p_event      IS NOT NULL THEN app.subject_published('event', p_event)
    WHEN p_project    IS NOT NULL THEN app.subject_published('project', p_project)
    WHEN p_permit     IS NOT NULL THEN app.subject_published('permit', p_permit)
    WHEN p_tender     IS NOT NULL THEN app.subject_published('tender', p_tender)
    WHEN p_contract   IS NOT NULL THEN app.subject_published('contract', p_contract)
    WHEN p_instrument IS NOT NULL THEN app.subject_published('instrument', p_instrument)
    WHEN p_auction    IS NOT NULL THEN EXISTS (
      SELECT 1 FROM public.instrument_auctions a WHERE a.id = p_auction AND a.publication_status = 'published')
    ELSE false
  END
$$;

-- Relaciones cuyo extremo no existe (vigilancia de integridad polimórfica).
-- Uso previsto: tarea programada diaria; resultado vacío = sano.
CREATE FUNCTION app.orphan_relationships() RETURNS SETOF entity_relationships
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT r.* FROM public.entity_relationships r
  WHERE NOT (
    CASE r.from_type
      WHEN 'organization' THEN EXISTS (SELECT 1 FROM public.organizations   x WHERE x.id = r.from_id)
      WHEN 'project'      THEN EXISTS (SELECT 1 FROM public.projects        x WHERE x.id = r.from_id)
      WHEN 'permit'       THEN EXISTS (SELECT 1 FROM public.permits         x WHERE x.id = r.from_id)
      WHEN 'tender'       THEN EXISTS (SELECT 1 FROM public.public_tenders  x WHERE x.id = r.from_id)
      WHEN 'contract'     THEN EXISTS (SELECT 1 FROM public.contracts       x WHERE x.id = r.from_id)
      WHEN 'instrument'   THEN EXISTS (SELECT 1 FROM public.financial_instruments x WHERE x.id = r.from_id)
      WHEN 'event'        THEN EXISTS (SELECT 1 FROM public.economic_events x WHERE x.id = r.from_id)
      WHEN 'opportunity'  THEN EXISTS (SELECT 1 FROM public.investment_opportunities x WHERE x.id = r.from_id)
      WHEN 'sector'       THEN EXISTS (SELECT 1 FROM public.sectors         x WHERE x.id = r.from_id)
      WHEN 'location'     THEN EXISTS (SELECT 1 FROM public.geographic_locations x WHERE x.id = r.from_id)
      WHEN 'document'     THEN EXISTS (SELECT 1 FROM public.source_documents x WHERE x.id = r.from_id)
    END
    AND
    CASE r.to_type
      WHEN 'organization' THEN EXISTS (SELECT 1 FROM public.organizations   x WHERE x.id = r.to_id)
      WHEN 'project'      THEN EXISTS (SELECT 1 FROM public.projects        x WHERE x.id = r.to_id)
      WHEN 'permit'       THEN EXISTS (SELECT 1 FROM public.permits         x WHERE x.id = r.to_id)
      WHEN 'tender'       THEN EXISTS (SELECT 1 FROM public.public_tenders  x WHERE x.id = r.to_id)
      WHEN 'contract'     THEN EXISTS (SELECT 1 FROM public.contracts       x WHERE x.id = r.to_id)
      WHEN 'instrument'   THEN EXISTS (SELECT 1 FROM public.financial_instruments x WHERE x.id = r.to_id)
      WHEN 'event'        THEN EXISTS (SELECT 1 FROM public.economic_events x WHERE x.id = r.to_id)
      WHEN 'opportunity'  THEN EXISTS (SELECT 1 FROM public.investment_opportunities x WHERE x.id = r.to_id)
      WHEN 'sector'       THEN EXISTS (SELECT 1 FROM public.sectors         x WHERE x.id = r.to_id)
      WHEN 'location'     THEN EXISTS (SELECT 1 FROM public.geographic_locations x WHERE x.id = r.to_id)
      WHEN 'document'     THEN EXISTS (SELECT 1 FROM public.source_documents x WHERE x.id = r.to_id)
    END
  )
$$;
REVOKE ALL ON FUNCTION app.orphan_relationships() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.orphan_relationships() TO service_role;

-- -----------------------------------------------------------------------------
-- 9. Preferencias y alertas del usuario
-- -----------------------------------------------------------------------------
-- 9.1 watchlists — elementos guardados por usuario (polimórfico; ver orphan check).
CREATE TABLE watchlists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- se borran con la cuenta (RN-11)
  list_name    text NOT NULL DEFAULT 'default',
  entity_type  entity_type NOT NULL CHECK (entity_type IN
                 ('organization', 'project', 'permit', 'tender', 'contract', 'instrument', 'event', 'opportunity')),
  entity_id    uuid NOT NULL,
  private_note text,                           -- solo visible para el dueño
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT watchlists_item_uq UNIQUE (user_id, list_name, entity_type, entity_id)
);
CREATE INDEX watchlists_entity_idx ON watchlists (entity_type, entity_id);
CREATE TRIGGER watchlists_touch BEFORE UPDATE ON watchlists
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- 9.2 user_alert_preferences — filtros de alerta configurables (RF-G-07).
CREATE TABLE user_alert_preferences (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  entity_types entity_type[] NOT NULL DEFAULT '{}',
  sector_ids   uuid[] NOT NULL DEFAULT '{}',
  location_ids uuid[] NOT NULL DEFAULT '{}',
  keywords     text[] NOT NULL DEFAULT '{}',
  min_confidence smallint CHECK (min_confidence BETWEEN 0 AND 100),
  channels     alert_channel[] NOT NULL DEFAULT '{in_app}' CHECK (cardinality(channels) > 0),
  frequency    alert_frequency NOT NULL DEFAULT 'immediate',
  tender_deadline_days integer[] NOT NULL DEFAULT '{7,3,1}',     -- ventanas propuestas (RF-D-09)
  instrument_maturity_days integer[] NOT NULL DEFAULT '{30,7}',  -- [PENDIENTE] valores
  is_paused    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_alert_preferences_name_uq UNIQUE (user_id, name)
);
CREATE TRIGGER user_alert_preferences_touch BEFORE UPDATE ON user_alert_preferences
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- 9.3 notifications — una por (usuario, motivo, entidad, ventana). dedup_key es único por usuario.
CREATE TABLE notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preference_id uuid REFERENCES user_alert_preferences(id) ON DELETE SET NULL,
  entity_type   entity_type NOT NULL,
  entity_id     uuid NOT NULL,
  reason        text NOT NULL,                 -- new_event, tender_deadline, status_change, ...
  title         text NOT NULL,
  body          text,
  priority      smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  channel       alert_channel NOT NULL DEFAULT 'in_app',
  status        notification_status NOT NULL DEFAULT 'pending',
  dedup_key     text NOT NULL CHECK (btrim(dedup_key) <> ''),
  attempts      integer NOT NULL DEFAULT 0,
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  delivered_at  timestamptz,
  read_at       timestamptz,
  CONSTRAINT notifications_dedup_uq UNIQUE (user_id, channel, dedup_key)
);
CREATE INDEX notifications_inbox_idx ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_pending_idx ON notifications (created_at) WHERE status = 'pending';

-- -----------------------------------------------------------------------------
-- 10. Auditoría — append-only, particionada por mes (retención = DROP PARTITION)
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id              bigint GENERATED ALWAYS AS IDENTITY,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  actor_kind      actor_kind NOT NULL DEFAULT 'user',
  actor_user_id   uuid,                        -- SIN FK: se conserva tras borrar la cuenta
  actor_org_id    uuid,
  actor_role      user_role,
  action          text NOT NULL,               -- INSERT | UPDATE | DELETE | login | role_change | publish ...
  table_name      text,
  row_id          text,
  old_data        jsonb,
  new_data        jsonb,
  request_id      text,
  ip_address      inet,                        -- dato personal: retención corta [PENDIENTE LEGAL]
  user_agent      text,
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

-- Particiones iniciales. Las siguientes las crea una tarea mensual (Sprint 1).
CREATE TABLE audit_logs_2026_11 PARTITION OF audit_logs FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE audit_logs_2026_12 PARTITION OF audit_logs FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;

-- RLS y privilegios EXPLÍCITOS en cada partición (Ronda 2). Las consultas a través
-- de la tabla padre usan las políticas del padre, pero una partición es una tabla
-- en sí misma y podría consultarse directamente: sin RLS ni REVOKE quedaría expuesta
-- si algún día se le concede un privilegio por error. Sin políticas = denegar todo
-- a quien no sea propietario ni BYPASSRLS.
ALTER TABLE audit_logs_2026_11   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2026_12   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_default   ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON audit_logs_2026_11, audit_logs_2026_12, audit_logs_default
  FROM PUBLIC, anon, authenticated;

-- Las particiones FUTURAS se crean SOLO con esta función (crea, activa RLS y revoca).
-- Uso mensual previsto (tarea programada, service_role): SELECT app.create_audit_partition(now()::date + 32);
-- Limitación de Postgres: si la partición DEFAULT ya contiene filas del rango, la
-- creación falla; crear la partición ANTES de que empiece el mes. NO PROBADO.
CREATE FUNCTION app.create_audit_partition(p_month date) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_start date := date_trunc('month', p_month)::date;
  v_end   date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_name  text := format('audit_logs_%s', to_char(date_trunc('month', p_month), 'YYYY_MM'));
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.audit_logs FOR VALUES FROM (%L) TO (%L)',
    v_name, v_start, v_end);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_name);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', v_name);
  RETURN v_name;
END $$;
REVOKE ALL ON FUNCTION app.create_audit_partition(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.create_audit_partition(date) TO service_role;

CREATE INDEX audit_logs_table_row_idx ON audit_logs (table_name, row_id, occurred_at DESC);
CREATE INDEX audit_logs_actor_idx     ON audit_logs (actor_user_id, occurred_at DESC);
CREATE INDEX audit_logs_org_idx       ON audit_logs (actor_org_id, occurred_at DESC);

-- Inmutable: nadie modifica ni borra filas (la retención elimina particiones completas).
CREATE FUNCTION app.audit_logs_block_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END $$;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION app.audit_logs_block_mutation();

-- Trigger genérico: registra antes/después de cada cambio en tablas sensibles.
CREATE FUNCTION app.audit_row_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid  uuid := app.current_user_id();
  v_row  jsonb := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
BEGIN
  INSERT INTO public.audit_logs
    (actor_kind, actor_user_id, actor_org_id, actor_role, action, table_name, row_id, old_data, new_data, request_id)
  VALUES (
    CASE WHEN v_uid IS NULL THEN 'service'::public.actor_kind ELSE 'user'::public.actor_kind END,
    v_uid, app.current_org_id(), app.current_user_role(),
    TG_OP, TG_TABLE_NAME, v_row ->> 'id',
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END,
    NULLIF(current_setting('app.request_id', true), '')
  );
  RETURN NULL;   -- AFTER trigger
END $$;

-- Tablas auditadas (RF-G-13, RNF-25). Se excluyen las de alto volumen y las append-only.
CREATE TRIGGER audit_users                  AFTER INSERT OR UPDATE OR DELETE ON users                    FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_organizations          AFTER INSERT OR UPDATE OR DELETE ON organizations            FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_sources                AFTER INSERT OR UPDATE OR DELETE ON sources                  FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_economic_events        AFTER INSERT OR UPDATE OR DELETE ON economic_events          FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_projects               AFTER INSERT OR UPDATE OR DELETE ON projects                 FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_permits                AFTER INSERT OR UPDATE OR DELETE ON permits                  FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_public_tenders         AFTER INSERT OR UPDATE OR DELETE ON public_tenders           FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_contracts              AFTER INSERT OR UPDATE OR DELETE ON contracts                FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_financial_instruments  AFTER INSERT OR UPDATE OR DELETE ON financial_instruments    FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_instrument_auctions    AFTER INSERT OR UPDATE OR DELETE ON instrument_auctions      FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_investment_opps        AFTER INSERT OR UPDATE OR DELETE ON investment_opportunities FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();
CREATE TRIGGER audit_entity_relationships   AFTER INSERT OR UPDATE OR DELETE ON entity_relationships     FOR EACH ROW EXECUTE FUNCTION app.audit_row_change();

-- Cambio de rol: única vía (los usuarios no pueden actualizar la columna "role").
CREATE FUNCTION app.set_user_role(p_target uuid, p_role user_role) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_role public.user_role := app.current_user_role();
  v_actor_org  uuid := app.current_org_id();
  v_target_org uuid;
BEGIN
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('org_admin', 'platform_admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT organization_id INTO v_target_org FROM public.users WHERE id = p_target;
  IF v_target_org IS NULL THEN
    RAISE EXCEPTION 'target user not found';
  END IF;
  IF v_actor_role = 'org_admin' AND (v_target_org <> v_actor_org OR p_role = 'platform_admin') THEN
    RAISE EXCEPTION 'org_admin cannot manage other organizations nor grant platform_admin';
  END IF;
  UPDATE public.users SET role = p_role WHERE id = p_target;   -- queda en audit_logs por el trigger
END $$;
REVOKE ALL ON FUNCTION app.set_user_role(uuid, public.user_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.set_user_role(uuid, public.user_role) TO authenticated;

-- -----------------------------------------------------------------------------
-- 11. Privilegios: DENEGAR por defecto y conceder lo mínimo
-- -----------------------------------------------------------------------------
-- En Supabase los privilegios por defecto del esquema public conceden acceso a
-- anon/authenticated/service_role sobre tablas nuevas [VERIFICAR Sprint 1]. Por eso
-- se revoca TODO explícitamente y se concede solo lo necesario.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  app.current_user_id(), app.current_user_role(), app.current_org_id(),
  app.is_staff(), app.is_manager(), app.is_org_admin(), app.is_platform_admin(),
  app.subject_published(entity_type, uuid),
  app.evidence_parent_published(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid)
  TO authenticated, service_role;

-- anon: SIN acceso a ninguna tabla (el producto exige sesión; la landing es estática).

-- service_role: workers y rutas de servidor. En Supabase tiene BYPASSRLS.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;   -- identidad de audit_logs

-- authenticated: lectura de referencia y de contenido publicado.
GRANT SELECT ON sectors, geographic_locations, organizations, sources,
                economic_events, projects, permits, public_tenders, contracts,
                financial_instruments, instrument_auctions, investment_opportunities,
                evidence, entity_relationships, verification_records
  TO authenticated;

-- source_documents: sin extracted_text ni storage_path (se sirven desde el servidor
-- si redistribution_allowed o por rol; ver MODELO-DATOS.md §7).
GRANT SELECT (id, source_id, external_id, canonical_url, final_url, content_hash, mime_type,
              byte_size, ingest_method, title, language, published_at, detected_at,
              source_updated_at, terms_version, redistribution_allowed, parse_status,
              supersedes_id, is_demo, created_at)
  ON source_documents TO authenticated;

-- Escritura por personal autorizado (RLS decide qué filas).
GRANT INSERT, UPDATE ON organizations, projects, permits, public_tenders, contracts,
                       financial_instruments, instrument_auctions, investment_opportunities,
                       evidence, entity_relationships
  TO authenticated;
GRANT INSERT ON verification_records TO authenticated;      -- revisión humana

-- economic_events: privilegios POR COLUMNA (Ronda 4). El personal NO puede escribir
-- verification_status / verification_reason / verification_checked_at / released_at / reviewed_at /
-- trust_layer / is_demo / dedup_key en UPDATE: los fijan el verificador (apply_verification, service_role)
-- y el trigger de publicación. Sin esto, un analista podría marcar 'verified' y saltarse la puerta P0.
-- Puede proponer la revisión (publication_status, reviewed_by, review_notes); el trigger decide.
GRANT INSERT (title, summary, event_kind, primary_source_document_id, organization_id, sector_id,
              location_id, occurred_at, published_at, timezone_assumed, classification_confidence,
              dedup_key, trust_layer, is_demo)
  ON economic_events TO authenticated;
GRANT UPDATE (title, summary, event_kind, organization_id, sector_id, location_id, occurred_at,
              published_at, timezone_assumed, classification_confidence, merged_into_id,
              publication_status, reviewed_by, review_notes)
  ON economic_events TO authenticated;

-- users: lectura y actualización SOLO de columnas de perfil; "role" cambia por app.set_user_role().
GRANT SELECT ON users TO authenticated;
GRANT UPDATE (display_name, locale, timezone, theme, consent_accepted_at, consent_version)
  ON users TO authenticated;

-- Datos propios del usuario.
GRANT SELECT, INSERT, UPDATE, DELETE ON watchlists, user_alert_preferences TO authenticated;
GRANT SELECT ON notifications TO authenticated;
GRANT UPDATE (read_at, status) ON notifications TO authenticated;

-- Operación e IA (solo personal).
GRANT SELECT ON ingestion_jobs, ai_analysis_runs TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;

-- -----------------------------------------------------------------------------
-- 12. Row Level Security (23 tablas)
-- -----------------------------------------------------------------------------
ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_tenders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_instruments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE instrument_auctions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relationships     ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alert_preferences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_runs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs               ENABLE ROW LEVEL SECURITY;
-- No se usa FORCE: las funciones SECURITY DEFINER (propietario) leen "users" sin recursión.

-- 12.1 Referencia pública para usuarios autenticados.
CREATE POLICY sectors_read ON sectors FOR SELECT TO authenticated USING (true);
CREATE POLICY geo_read     ON geographic_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY sources_read ON sources FOR SELECT TO authenticated USING (true);   -- sin secretos en esta tabla

-- 12.2 users
CREATE POLICY users_select ON users FOR SELECT TO authenticated
  USING (
    id = app.current_user_id()
    OR (app.is_org_admin() AND organization_id = app.current_org_id())
    OR app.is_platform_admin()
  );
CREATE POLICY users_update_self ON users FOR UPDATE TO authenticated
  USING (id = app.current_user_id())
  WITH CHECK (id = app.current_user_id());
-- (Las columnas actualizables están limitadas por GRANT; "role" solo vía app.set_user_role.)

-- 12.3 organizations: empresas/instituciones visibles para todos; el tenant solo para los suyos.
CREATE POLICY organizations_select ON organizations FOR SELECT TO authenticated
  USING (
    (org_type <> 'tenant' AND (publication_status = 'published' OR app.is_staff()))
    OR id = app.current_org_id()
    OR app.is_platform_admin()
  );
CREATE POLICY organizations_insert ON organizations FOR INSERT TO authenticated
  WITH CHECK (app.is_staff() AND org_type <> 'tenant');
CREATE POLICY organizations_update ON organizations FOR UPDATE TO authenticated
  USING (app.is_staff() AND org_type <> 'tenant')
  WITH CHECK (app.is_staff() AND org_type <> 'tenant');

-- 12.4 Contenido con workflow de publicación: lectores ven 'published'; personal ve todo.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'economic_events', 'projects', 'permits', 'public_tenders', 'contracts',
    'financial_instruments', 'instrument_auctions', 'entity_relationships'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (publication_status = ''published'' OR app.is_staff())',
      t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (app.is_staff())',
      t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (app.is_staff()) WITH CHECK (app.is_staff())',
      t || '_update', t);
  END LOOP;
END $$;
-- Sin políticas DELETE: nadie borra desde la app (se usa publication_status='rejected' o merged_into_id).

-- 12.5 Oportunidades: lectores ven publicadas; analistas gestionan borradores; solo gestores publican
-- o editan publicadas (el trigger enforce_opportunity_publication refuerza la regla).
CREATE POLICY opportunities_select ON investment_opportunities FOR SELECT TO authenticated
  USING (publication_status = 'published' OR app.is_staff());
CREATE POLICY opportunities_insert ON investment_opportunities FOR INSERT TO authenticated
  WITH CHECK (app.is_staff() AND publication_status <> 'published');
CREATE POLICY opportunities_update ON investment_opportunities FOR UPDATE TO authenticated
  USING (app.is_staff() AND (publication_status <> 'published' OR app.is_manager()))
  WITH CHECK (app.is_staff() AND (publication_status <> 'published' OR app.is_manager()));

-- 12.6 Evidencia: visible si el sujeto está publicado; personal ve todo.
CREATE POLICY evidence_select ON evidence FOR SELECT TO authenticated
  USING (
    app.is_staff()
    OR app.evidence_parent_published(opportunity_id, event_id, project_id, permit_id,
                                     tender_id, contract_id, instrument_id, auction_id)
  );
CREATE POLICY evidence_insert ON evidence FOR INSERT TO authenticated
  WITH CHECK (app.is_staff());
CREATE POLICY evidence_update ON evidence FOR UPDATE TO authenticated
  USING (app.is_staff()) WITH CHECK (app.is_staff());

-- 12.7 Verificaciones: lectura si el sujeto está publicado o si es personal. Alta solo humana.
CREATE POLICY verification_select ON verification_records FOR SELECT TO authenticated
  USING (app.is_staff() OR app.subject_published(subject_type, subject_id));
CREATE POLICY verification_insert ON verification_records FOR INSERT TO authenticated
  WITH CHECK (app.is_staff() AND check_type = 'human_review' AND reviewer_id = app.current_user_id());

-- 12.8 source_documents: metadatos para todos (columnas limitadas por GRANT).
CREATE POLICY source_documents_select ON source_documents FOR SELECT TO authenticated USING (true);

-- 12.9 Operación: solo administradores. Escritura exclusiva de service_role.
CREATE POLICY ingestion_jobs_select ON ingestion_jobs FOR SELECT TO authenticated
  USING (app.is_org_admin());
CREATE POLICY ai_runs_select ON ai_analysis_runs FOR SELECT TO authenticated
  USING (app.is_staff());

-- 12.10 Datos privados del usuario: solo el dueño.
CREATE POLICY watchlists_owner ON watchlists FOR ALL TO authenticated
  USING (user_id = app.current_user_id()) WITH CHECK (user_id = app.current_user_id());
CREATE POLICY alert_prefs_owner ON user_alert_preferences FOR ALL TO authenticated
  USING (user_id = app.current_user_id()) WITH CHECK (user_id = app.current_user_id());
CREATE POLICY notifications_select_own ON notifications FOR SELECT TO authenticated
  USING (user_id = app.current_user_id());
CREATE POLICY notifications_update_own ON notifications FOR UPDATE TO authenticated
  USING (user_id = app.current_user_id()) WITH CHECK (user_id = app.current_user_id());

-- 12.11 Auditoría: administrador de plataforma ve todo; administrador de organización, la suya.
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT TO authenticated
  USING (
    app.is_platform_admin()
    OR (app.is_org_admin() AND actor_org_id = app.current_org_id())
  );

-- -----------------------------------------------------------------------------
-- 13. Propiedad de las funciones SECURITY DEFINER
-- -----------------------------------------------------------------------------
-- [VERIFICAR Sprint 1] Las funciones SECURITY DEFINER deben pertenecer a un rol que
-- omita RLS (en Supabase, "postgres"). Si se ejecuta con otro propietario, ajustar.

COMMIT;

-- =============================================================================
-- Consultas de comprobación sugeridas para Sprint 1 (NO ejecutadas hoy)
-- =============================================================================
-- 0) FK de Auth (solo Supabase; debe devolver 1 fila):
--    SELECT conname FROM pg_constraint WHERE conname = 'users_auth_fk';
-- 0b) Particiones de auditoría con RLS y sin privilegios para anon/authenticated
--     (relrowsecurity debe ser true en las 3 y la segunda consulta debe devolver 0 filas):
--    SELECT c.relname, c.relrowsecurity FROM pg_class c
--     WHERE c.relname LIKE 'audit_logs\_%' AND c.relispartition;
--    SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
--     WHERE table_name LIKE 'audit_logs\_%' AND grantee IN ('anon', 'authenticated', 'PUBLIC');
-- 1) 23 tablas con RLS:
--    SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--     WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relrowsecurity
--       AND c.relispartition = false;       -- esperado: 23
-- 2) Tablas sin RLS en public (debe devolver 0 filas, salvo particiones):
--    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--     WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity
--       AND NOT c.relispartition;
-- 3) Relaciones huérfanas:  SELECT * FROM app.orphan_relationships();

-- =============================================================================
-- Pruebas de humo de la guardia P0 de EVENTOS (Ronda 4) — PROPUESTAS, NO EJECUTADAS (B-007)
-- Pertenecen a T-INF-03 (suite RLS/guardias) y alimentan CC-23 de B. Cada una indica el resultado
-- ESPERADO; hasta ejecutarlas contra un Postgres de pruebas, ninguno está comprobado.
-- Roles de prueba: service_role (worker), analyst, manager (opportunity_manager), viewer.
-- -----------------------------------------------------------------------------
-- P0-01 service_role INSERT evento con publication_status='published' y verification_status='partially_verified'
--       -> ERROR "requires an authenticated human manager (P0)".
-- P0-02 service_role INSERT evento 'published' con verification_status='verified'
--       -> OK; released_at NOT NULL; reviewed_by NULL (no hace falta revisor).
-- P0-03 service_role INSERT/UPDATE a 'published' con verification_status='pending'
--       -> ERROR "can never be published".
-- P0-04 analyst UPDATE publication_status='published' sobre un evento 'partially_verified'
--       -> ERROR (no es gestor).
-- P0-05 manager UPDATE publication_status='published', reviewed_by=<otro usuario> sobre 'disputed'
--       -> ERROR "reviewed_by must be the acting user".
-- P0-06 manager UPDATE publication_status='published', reviewed_by=<él mismo> sobre 'disputed'
--       -> OK; reviewed_at y released_at asignados por el trigger; visible para viewer (con etiqueta "En disputa").
-- P0-07 evento publicado y 'verified'; insertar verification_records(result='disputed')
--       -> el evento pasa a publication_status='in_review', released_at NULL; viewer ya no lo ve;
--          el INSERT del registro NO falla.
-- P0-08 analyst UPDATE economic_events SET verification_status='verified' -> ERROR "permission denied for column".
-- P0-09 evento publicado: UPDATE reviewed_by / reviewed_at / released_at -> ERROR "immutable".
-- P0-10 viewer SELECT sobre eventos con publication_status<>'published' -> 0 filas (también con filtro explícito).
-- P0-11 Alert Agent (service_role) no genera notificaciones para eventos no publicados (CC-23) -> 0 filas en notifications.
-- Caso negativo (principio 3 de B): desactivar el trigger en una rama de prueba -> P0-01 y P0-04 deben FALLAR como prueba.
-- =============================================================================
