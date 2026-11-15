SET search_path = public, extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
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
CREATE TYPE notification_status AS ENUM ('pending', 'delivered', 'failed', 'read', 'superseded');
CREATE TYPE agent_name AS ENUM
  ('discovery', 'extraction', 'verification', 'opportunity_intelligence', 'financial_analysis', 'alert');
CREATE TYPE run_status AS ENUM
  ('succeeded', 'failed', 'schema_invalid', 'blocked', 'budget_exceeded');
CREATE TYPE actor_kind AS ENUM ('user', 'service', 'system');
CREATE FUNCTION app.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE FUNCTION app.current_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;
CREATE TABLE organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_type        org_type NOT NULL,
  legal_name      text NOT NULL CHECK (btrim(legal_name) <> ''),
  display_name    text,
  tax_id          text,                         -- RNC u otro identificador fiscal; solo si la fuente lo publica
  country         char(2) NOT NULL DEFAULT 'DO' CHECK (country ~ '^[A-Z]{2}$'),
  website         text,
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
CREATE UNIQUE INDEX organizations_tax_id_uq
  ON organizations (country, tax_id) WHERE tax_id IS NOT NULL AND merged_into_id IS NULL;
CREATE INDEX organizations_name_trgm ON organizations USING gin (normalized_name gin_trgm_ops);
CREATE INDEX organizations_type_idx ON organizations (org_type);
CREATE TRIGGER organizations_touch BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
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
  pseudonymized_at timestamptz,                -- seudonimización irreversible de PII (B-017); conserva id/rol
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_pseudonymized_requires_deleted
    CHECK (pseudonymized_at IS NULL OR deleted_at IS NOT NULL)
);
CREATE UNIQUE INDEX users_email_uq ON users (lower(email));
CREATE INDEX users_org_idx ON users (organization_id);
CREATE TRIGGER users_touch BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
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
CREATE FUNCTION app.is_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(app.current_user_role() IN
    ('analyst', 'opportunity_manager', 'org_admin', 'platform_admin'), false)
$$;
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
